import webapp2
import datetime
from google.appengine.ext import db
import logging
from pen import PenName
from rel import outbound_relids_for_penid
from rev import Review, review_activity_search
from req import Request, find_requests
from moracct import MORAccount, safestr, returnJSON, writeJSONResponse
from morutil import *
from statrev import getTitle, getSubkey
from google.appengine.api import mail
from google.appengine.api.logservice import logservice
from google.appengine.api import images
from google.appengine.ext.webapp.mail_handlers import BounceNotification
from google.appengine.ext.webapp.mail_handlers import BounceNotificationHandler
import textwrap
from cacheman import *
import re


class ActivityStat(db.Model):
    """ Activity metrics for tracking purposes """
    day = db.StringProperty(required=True)  # yyyy-mm-ddT00:00:00Z
    active = db.IntegerProperty()     # number of pens that logged in
    onerev = db.IntegerProperty()     # num pens that wrote at least one review
    tworev = db.IntegerProperty()     # num pens that wrote at least two reviews
    morev = db.IntegerProperty()      # num pens that wrote 3 or more reviews
    ttlrev = db.IntegerProperty()     # total reviews for the day
    names = db.TextProperty()         # ';' delimited pen names that logged in
    calculated = db.StringProperty()  # iso date when things were tallied up
    refers = db.TextProperty()        # src1:3,src2:4...
    clickthru = db.IntegerProperty()  # num specific profile or review requests
    agents = db.TextProperty()        # CSV of accessing agents


#substrings identifying web crawler agents.  No embedded commas.
bot_ids = ["AhrefsBot", "Baiduspider", "ezooms.bot",
           "netvibes.com", # not really a bot, but not a really a hit either
           "AppEngine-Google", "Googlebot", "YandexImages", "crawler.php"]


def get_activity_stat(sday):
    stat = ActivityStat(day=sday)
    stat.active = 0
    stat.onerev = 0
    stat.tworev = 0
    stat.morev = 0
    stat.ttlrev = 0
    stat.names = ""
    stat.calculated = ""
    stat.refers = ""
    stat.clickthru = 0
    stat.agents = ""
    try:
        where = "WHERE day = :1"
        stats = ActivityStat.gql(where, sday)
        for existing_stat in stats:
            stat = existing_stat
    except Exception as e:
        logging.info("Existing stat retrieval failed: " + str(e))
    return stat


def bump_referral_count(stat, bumpref):
    bumped_existing = False
    refers = stat.refers.split(",")
    for idx, refer in enumerate(refers):
        if bumpref in refer:
            components = refer.split(":")
            count = int(components[1]) + 1
            refers[idx] = bumpref + ":" + str(count)
            stat.refers = ",".join(refers)
            bumped_existing = True
            break
    if not bumped_existing:
        if stat.refers:
            stat.refers += ","
        stat.refers += bumpref + ":1"


def is_content_linkback(val):
    csids = ["youtube.", "vimeo.", "ted.com", "simonsfoundation.org",
             "blueman.com" ]
    for csid in csids:
        if csid in val:
            return True
    return False


# Translate and group referral URLs into bite size series identifiers
def bump_referral(stat, entry, val):
    if "facebook" in val:
        bump_referral_count(stat, entry + "FB")
    elif "twitter" in val or "/t.co/" in val:
        bump_referral_count(stat, entry + "TW")
    elif "plus.google" in val:
        bump_referral_count(stat, entry + "GP")
    elif "google" in val:
        bump_referral_count(stat, entry + "SE")  # Search Engine
    elif "craigslist" in val:
        if "/act/" in val:
            bump_referral_count(stat, entry + "CLact")
        elif "/cps/" in val:
            bump_referral_count(stat, entry + "CLcps")
        else:
            bump_referral_count(stat, entry + "CL")
    elif "myopenreviews.com" in val:
        bump_referral_count(stat, entry + "MOR")
    elif "myopenreviews.appspot.com" in val:
        bump_referral_count(stat, entry + "Home")
    elif "mail." in val:
        bump_referral_count(stat, entry + "Mail")
    elif "sandservices.com" in val:
        bump_referral_count(stat, entry + "SSI")
    elif is_content_linkback(val):
        bump_referral_count(stat, entry + "ContLB")
    elif "fgfweb" not in val:
        # Write the whole url (without colons) as the identifier, thus
        # causing the activity display to get real ugly.  Then write
        # more logic in this method and fix the data to match.
        ident = re.sub(":", "_", val)
        bump_referral_count(stat, entry + ident)


def is_known_bot(agentstr):
    for botsig in bot_ids:
        if botsig in agentstr:
            return True
    return False


def note_agent(agentstr, stat):
    #An agent string can have pretty much any unicode character in it
    #except for reserved separators. For general information purposes,
    #dealing with these strings in CSV format is easiest.  Pretty sure
    #that commas are not allowed, but replace if found.
    agentstr = agentstr.replace(",", ";");
    if agentstr not in stat.agents:
        if stat.agents:
            stat.agents += ", "
        stat.agents += agentstr


def btw_activity(src, request):
    agentstr = request.headers.get('User-Agent')
    logging.info("btw_activity " + src + " agent: " + agentstr)
    agentstr = agentstr[:255]  #These CAN grow huge
    if is_known_bot(agentstr):
        return
    sday = dt2ISO(datetime.datetime.utcnow())[:10] + "T00:00:00Z"
    stat = get_activity_stat(sday)
    note_agent(agentstr, stat)
    val = request.get("clickthrough")
    if val:  # Somebody accessed the site requesting a specific review
             # id or profile id in the url parameters (as happens when
             # you click one of the links in a static review
             # display). This is primarily an indicator of how helpful
             # the static displays are.
        stat.clickthru += 1
    val = request.get("referral")
    if val:  # Somebody clicked on a link to the core application.
             # Most likely an ad.  See client code.
        bump_referral(stat, "core", val)
    val = request.get("statinqref")
    if val:  # Somebody clicked on a link to a review.  This happens
             # if you post a link to your review somewhere and
             # somebody clicks on it.  Helpful to have some clue where
             # reviews are being shared.
        bump_referral(stat, "rev", val)
    val = request.get("bloginqref")
    if val: # Somebody clicked on a link to a blog.  Helpful to have
            # some clue on inbound blog links.  Later on this could
            # pass blog link info through to each pen name so each pen
            # can decide if they want to mention outside links in
            # their shoutout or review text.
        bump_referral(stat, "blog", val)
    val = request.get("grpinqref")
    if val: # Somebody clicked on a link to a group. Helpful to know
            # what level of inbound linkage there is for groups.
        bump_referral(stat, "grp", val)
    stat.put()  #nocache
            

def rebuild_refers(stat):
    reftxt = stat.refers
    if not reftxt:
        return
    stat.refers = ""  # reset and then build up from entries
    entries = reftxt.split(",")
    for entry in entries:
        idc = entry.split(":")
        val = idc[0]
        count = intz(idc[1])
        for i in range(count):
            if val.startswith("core"):
                bump_referral(stat, "core", val[4:])
            elif val.startswith("rev"):
                bump_referral(stat, "rev", val[3:])
            elif val.startswith("blog"):
                bump_referral(stat, "blog", val[4:])
            elif val.startswith("grp"):
                bump_referral(stat, "grp", val[3:])


def split_output(response, text):
    logging.info("mailsum: " + text)
    response.out.write(text + "\n")


def stats_text(stat):
    text = stat.day[:10] + " active: " + str(stat.active) +\
        ", onerev: " + str(stat.onerev) +\
        ", tworevs: " + str(stat.tworev) +\
        ", more: " + str(stat.morev) +\
        ", ttlrevs: " + str(stat.ttlrev) +\
        "\n" + stat.names + "\n"
    return text


def pen_stats():
    yesterday = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    isostart = dt2ISO(yesterday)[:10] + "T00:00:00Z"
    isoend = dt2ISO(datetime.datetime.utcnow())[:10] + "T00:00:00Z"
    stat = get_activity_stat(isostart)
    if stat.calculated:  #already did all the work
        return stats_text(stat)
    # do not restrict an upper bound for PenName retrieval, otherwise
    # anyone who has logged after midnight GMT will be excluded and
    # their login may never get counted if they log in again the next
    # day.  If they do login the next day, they may be double counted,
    # but that's better than missed.
    where = "WHERE accessed >= :1"
    pens = PenName.gql(where, isostart)
    for pen in pens:
        stat.active += 1
        where2 = "WHERE modified >= :1 AND modified < :2 AND penid = :3"
        revs = Review.gql(where2, isostart, isoend, pen.key().id())
        filtrevs = []
        for rev in revs:
            if not 'batchUpdated' in safestr(rev.svcdata):
                filtrevs.append(rev)
        revcount = len(filtrevs)
        if revcount > 0:
            stat.onerev += 1
        if revcount > 1:
            stat.tworev += 1
        if revcount > 2:
            stat.morev += 1
        stat.ttlrev += revcount
        if stat.names:
            stat.names += ";"
        stat.names += pen.name
    stat.calculated = dt2ISO(datetime.datetime.utcnow())
    stat.put()  #nocache
    return stats_text(stat)


def eligible_pen(acc, thresh):
    if not acc.email:
        return None, "No email address"
    if acc.mailbounce and "," in acc.mailbounce:
        bouncedates = acc.mailbounce.split(",")
        if bouncedates[-1] < acc.modified:
            #account modified after latest bounce, email might be fixed...
            acc.mailbounce = ""   #caller writes updated account
        else:
            return None, " (" + acc.email + ") bounced " + bouncedates[-1]
    # work off the most recently accessed pen authorized for this account
    latestpen = None
    where = "WHERE mid = :1 LIMIT 20"
    pens = PenName.gql(where, acc.key().id())
    for pen in pens:
        if not latestpen or latestpen.accessed < pen.accessed:
            latestpen = pen
    reason = ""
    if latestpen and latestpen.accessed > thresh:
        if not "sumiflogin" in acc.summaryflags:
            reason = latestpen.name + " accessed since " + thresh
            latestpen = None
    return latestpen, reason


def text_stars(review):
    stars = ["    -",
             "    *",
             "   **",
             "  ***",
             " ****",
             "*****"]
    index = review.rating / 20
    return stars[index]


def req_summary_text(reqs):
    text = ""
    if reqs and len(reqs) > 0:
        text += "You have review requests from your followers:\n"
        for req in reqs:
            pen = cached_get(req.fromid, PenName)
            text += "    " + pen.name + " has requested a " + req.revtype +\
                " review.\n"
        text += "\n\n"
    return text


def write_review_email_text_summary(review):
    val = "$STARS $TITLE\n" +\
        "      $BYLINE - $KEYWORDS\n" +\
        "      $REVTEXT\n" +\
        "      $REVLINK\n\n"
    val = val.replace("$STARS", text_stars(review))
    val = val.replace("$TITLE", getTitle(review) + " " + getSubkey(review))
    val = val.replace("$BYLINE", "review by " + unicode(review.penname))
    val = val.replace("$KEYWORDS", safestr(review.keywords))
    revtxt = safestr(review.text)
    revtxtmax = 184
    if len(revtxt) > revtxtmax + 3:
        revtxt = revtxt[:revtxtmax] + "..."
    val = val.replace("$REVTEXT", "\n      ".join(textwrap.wrap(revtxt)))
    val = val.replace("$REVLINK", "http://www.fgfweb.com/statrev/" +
                      str(review.key().id()))
    return val


def write_summary_email_body(pen, reviews, tstr, prs, reqs):
    sigline = "\nTo change your mail preferences, click the settings button on http://www.fgfweb.com\n\ncheers,\n-FGFweb\n\n"
    body = "Hi " + pen.name + ",\n\n"
    if prs and len(prs) > 0:
        body += "Thanks for posting! Your current and future followers" +\
            " appreciate it."
    else:
        body += "Experienced anything recently that you would tell a" +\
            " friend about?"
    body += "\n\n" +\
        "Go to http://www.fgfweb.com for group activity, messages" +\
        " and top rated posts from friends." +\
        "\n\n" + req_summary_text(reqs)
    if not reviews or len(reviews) == 0:
        body += "Tragically, none of the people you are following have" +\
            " posted anything since " + tstr + ". Please do what you" +\
            " can to help them experience more of life. In the meantime," +\
            " you can find other interesting people to follow here:\n" +\
            "\n    http://www.fgfweb.com/?command=penfinder\n\n"
        return body + sigline
    body += str(len(reviews)) + " " +\
        ("post" if len(reviews) == 1 else "posts") +\
        " from friends since " + tstr + ":\n\n"
    revtypes = [["book",     "Books"], 
                ["movie",    "Movies"], 
                ["video",    "Videos"], 
                ["music",    "Music"],
                ["food",     "Food"], 
                ["drink",    "Drinks"], 
                ["activity", "Activities"], 
                ["other",    "Other"]]
    for revtype in revtypes:
        tline = "\n      ------------( " + revtype[1] + " )------------\n\n"
        wroteHeaderLine = False
        for review in reviews:
            if review.revtype == revtype[0]:
                if not wroteHeaderLine:
                    body += tline
                    wroteHeaderLine = True
                body += write_review_email_text_summary(review)
    return body + sigline


def mail_summaries(freq, thresh, request, response):
    tstr = ISO2dt(thresh).strftime("%d %B %Y")
    subj = "FGFweb " + freq + " friend activity since " + tstr
    logsum = "----------------------------------------\n"
    logsum += "Mail sent for " + freq + " activity since " + tstr + "\n"
    where = "WHERE summaryfreq = :1 AND lastsummary < :2"
    accs = MORAccount.gql(where, freq, thresh)
    processed = 0
    for acc in accs:
        processed += 1
        ident = acc.email or acc.authsrc
        logmsg = "account: " + ident
        pen, whynot = eligible_pen(acc, thresh)
        if pen:
            logmsg += " (" + acc.email + "), pen: " + pen.name
            relids = outbound_relids_for_penid(pen.key().id())
            if len(relids) > 0:
                logmsg += ", following: " + str(len(relids))
                checked, reviews = review_activity_search(thresh, "", relids)
                logmsg += ", reviews: " + str(len(reviews))
                checked, prs = review_activity_search(
                    thresh, "", [ str(pen.key().id()) ])
                logmsg += ", reviewed: " + str(len(prs))
                reqs = find_requests(pen.key().id(), 0)
                content = write_summary_email_body(pen, reviews, tstr, 
                                                   prs, reqs)
                if not request.url.startswith('http://localhost'):
                    mail.send_mail(
                        sender="FGFweb support <theriex@gmail.com>",
                        to=acc.email,
                        subject=subj,
                        body=content)
                    logmsg += ", mail sent"
        elif freq == "weekly":  # show details for most common notice freq
            logmsg += " id:" + str(acc.key().id()) + " " + whynot
        acc.lastsummary = nowISO()
        acc.put()  #nocache
        split_output(response, logmsg)
        logsum += logmsg + "\n"
    logsum += "SELECT * from MORAccount WHERE summaryfreq = '" + freq +\
        "' AND lastsummary < '" + thresh + "'\n"
    logsum += str(processed) + " matching accounts processed\n\n"    
    return logsum


class MailSummaries(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        split_output(self.response, "MailSummaries")
        emsum = "Email summary send processing summary:\n"
        dtnow = datetime.datetime.utcnow()
        split_output(self.response, "---------- daily: ----------")
        emsum += mail_summaries("daily", 
                                dt2ISO(dtnow - datetime.timedelta(hours=24)),
                                self.request, self.response)
        split_output(self.response, "---------- weekly: ----------")
        emsum += mail_summaries("weekly", 
                                dt2ISO(dtnow - datetime.timedelta(7)),
                                self.request, self.response)
        split_output(self.response, "---------- fortnightly: ----------")
        emsum += mail_summaries("fortnightly", 
                                dt2ISO(dtnow - datetime.timedelta(14)),
                                self.request, self.response)
        summary = pen_stats() + "\n" + emsum
        if self.request.url.startswith('http://localhost'):
            self.response.out.write("\n\nsummary:\n" + summary)
        else:
            mail.send_mail(
                sender="FGFweb Activity <fgfwebactivity@gmail.com>",
                to="theriex@gmail.com",
                subject="FGFweb mail summaries",
                body=summary)


class SummaryForUser(webapp2.RequestHandler):
    def get(self):
        emaddr = self.request.get('email')
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write("email: " + emaddr + "\n")
        accs = MORAccount.gql("WHERE email = :1", emaddr)
        dtnow = datetime.datetime.utcnow()
        thresh = dt2ISO(dtnow - datetime.timedelta(7))
        tstr = ISO2dt(thresh).strftime("%d %B %Y")
        for acc in accs:
            pen, whynot = eligible_pen(acc, "2400-01-01T00:00:00Z")
            self.response.out.write("pen: " + pen.name + "\n")
            self.response.out.write("--------------------------------------")
            self.response.out.write("--------------------------------------")
            self.response.out.write("\n\n")
            relids = outbound_relids_for_penid(pen.key().id())
            checked, reviews = review_activity_search(thresh, "", relids)
            checked, prs = review_activity_search(thresh, "", 
                                                  [ str(pen.key().id()) ])
            reqs = find_requests(pen.key().id(), 0)
            content = write_summary_email_body(pen, reviews, tstr, prs, reqs)
        self.response.out.write(content)
        # Temporary email sender test code (comment out when not testing)
        # emaddr = self.request.get('emaddr')
        # if emaddr:
        #     mail.send_mail(
        #         sender="FGFweb Activity <fgfwebactivity@gmail.com>",
        #         to=emaddr,
        #         subject="FGFweb sender test email",
        #         body=content)


class ReturnBotIDs(webapp2.RequestHandler):
    def get(self):
        csv = ",".join(bot_ids)
        writeJSONResponse("[{\"botids\":\"" + csv +  "\"}]", self.response)


class UserActivity(webapp2.RequestHandler):
    def get(self):
        daysback = 70  # 10 weeks back
        dtnow = datetime.datetime.utcnow()
        thresh = dt2ISO(dtnow - datetime.timedelta(daysback))
        where = "WHERE day > :1"
        statquery = ActivityStat.gql(where, thresh)
        stats = statquery.run(read_policy=db.EVENTUAL_CONSISTENCY,
                              batch_size=daysback)
        returnJSON(self.response, stats)


class ByTheWay(webapp2.RequestHandler):
    def get(self):
        btw_activity("/bytheway", self.request)


class ByTheImg(webapp2.RequestHandler):
    """ alternative approach when XMLHttpRequest is a hassle """
    def get(self):
        btw_activity("/bytheimg", self.request)
        # hex values for a 4x4 transparent PNG created with GIMP:
        imgstr = "\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x04\x00\x00\x00\x04\x08\x06\x00\x00\x00\xa9\xf1\x9e\x7e\x00\x00\x00\x06\x62\x4b\x47\x44\x00\xff\x00\xff\x00\xff\xa0\xbd\xa7\x93\x00\x00\x00\x09\x70\x48\x59\x73\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x07\x74\x49\x4d\x45\x07\xdd\x0c\x02\x11\x32\x1f\x70\x11\x10\x18\x00\x00\x00\x0c\x69\x54\x58\x74\x43\x6f\x6d\x6d\x65\x6e\x74\x00\x00\x00\x00\x00\xbc\xae\xb2\x99\x00\x00\x00\x0c\x49\x44\x41\x54\x08\xd7\x63\x60\xa0\x1c\x00\x00\x00\x44\x00\x01\x06\xc0\x57\xa2\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82"
        img = images.Image(imgstr)
        img.resize(width=4, height=4)
        img = img.execute_transforms(output_encoding=images.PNG)
        self.response.headers['Content-Type'] = "image/png"
        self.response.out.write(img)


# Since you can't edit text fields in the GAE Data Viewer, unhandled
# referral keys get cleaned up by calling this endpoint.
class FixReferKeys(webapp2.RequestHandler):
    def get(self):
        message = "Nothing doing."
        statid = self.request.get('statid')
        if statid:
            stat = ActivityStat.get_by_id(intz(statid))
            if stat:
                text = stat.refers
                # text = re.sub("revhttps_//www.google.com/", "revSE", text)
                rebuild_refers(stat)
                stat.put()
                message = "ActivityStat " + statid + " refers field updated."
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(message + "\n")


class BounceHandler(BounceNotificationHandler):
  def receive(self, notification):  # BounceNotification class instance
      logging.info("BouncedEmailHandler called")
      emaddr = notification.original['to']
      logging.info("BouncedEmailHandler emaddr: " + emaddr)
      # this uses the same access indexing as moracct.py MailCredentials
      where = "WHERE email=:1 LIMIT 9"
      accounts = MORAccount.gql(where, emaddr)
      for account in accounts:
          bouncestr = nowISO()
          if account.mailbounce:
              bouncestr = account.mailbounce + "," + bouncestr
          account.mailbounce = bouncestr
          account.put()


app = webapp2.WSGIApplication([('/mailsum', MailSummaries),
                               ('/emuser', SummaryForUser),
                               ('/botids', ReturnBotIDs),
                               ('/activity', UserActivity),
                               ('/bytheway', ByTheWay),
                               ('/bytheimg', ByTheImg),
                               ('/fixrefkeys', FixReferKeys),
                               ('/_ah/bounce', BounceHandler)], debug=True)
