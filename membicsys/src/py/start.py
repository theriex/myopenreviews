import webapp2
import logging
import datetime
import pen
import coop
from google.appengine.api import memcache
from morutil import *

indexHTML = """
<!doctype html>
<html itemscope="itemscope" itemtype="https://schema.org/WebPage"
      xmlns="https://www.w3.org/1999/xhtml" dir="ltr" lang="en-US">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="robots" content="noodp" />
  <meta name="description" content="$DESCR" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:image" content="$SITEPIC" />
  <meta property="twitter:image" content="$SITEPIC" />
  <meta itemprop="image" content="$SITEPIC" />
  <link rel="image_src" href="$SITEPIC" />
  <title>$TITLE</title>
  <link href="css/site.css$CACHEPARA" rel="stylesheet" type="text/css" />
</head>
<body id="bodyid">

<div id="topsectiondiv">
  <div id="topleftdiv">
    <div id="logodiv" onclick="app.activity.displayFeed('all');return false;"
         title="Community membics">
      <img src="img/membiclogo.png$CACHEPARA" id="logoimg"/></div>
    <div id="topactionsdiv"></div>
  </div> <!-- topleftdiv -->
  <div id="toprightdiv">
    <!-- login has to be an actual form to enable remembered passwords -->
    <div id="logindiv">
      <form id="loginform" method="post" action="redirlogin">
        <div id="loginparaminputs"></div>
        <div id="loginvisualelementsdiv">
          <label for="emailin" class="liflab">Email</label>
          <input type="email" class="lifin" name="emailin" id="emailin" 
                 placeholder="nospam@example.com"
                 autofocus/>
          <div class="lifsep"></div>
          <label for="passin" class="liflab">Password</label>
          <!-- no onchange submit for password. breaks autoforms on safari -->
          <input type="password" class="lifin" name="passin" id="passin"/> 
          <div class="lifsep"></div>
          <div id="loginbuttonsdiv" class="lifbuttonsdiv">
            <button type="button" id="createAccountButton"
                    onclick="app.login.createAccount();return false;">
              Create Account</button>
            <input value="Sign in" type="submit" class="loginbutton"/>
          </div>
          <div id="forgotpassdiv"></div>
        </div> <!-- loginvisualelementsdiv -->
      </form>
    </div> <!-- logindiv -->
  </div> <!-- toprightdiv -->
</div>

<div id="headingdiv">
  <div id="loginstatdiv"></div>
  <div id="headingdivcontent"></div>
</div>

<div id="appspacediv">
  <div id="contentdiv">
    <noscript>
    <p><b>Membic needs JavaScript to do anything useful, please enable.</b></p>
    </noscript>
    The collaborative memory project.<br/>
    Loading...
  </div> <!-- contentdiv -->

  <div id="bottomnav"> <!-- clicks mapped in layout.localDocLinks -->
    <div id="bottomstatdiv"></div>
    <a href="docs/about.html" class="footerlink">ABOUT</a> 
    <a href="docs/terms.html" class="footerlink">TERMS</a> 
    <a href="docs/privacy.html" class="footerlink">PRIVACY</a> 
    <a href="docs/extensions.html" class="footerlink">EXTENSIONS</a>
  </div>
</div>

<div id="xtrabsdiv"></div>
<!-- higher z than content, postioned above -->
<div id="topdiv">  
</div>
<!-- dialog -->
<div id="dlgdiv"></div>
<!-- limited popup form can appear over dialog -->
<div id="modalseparatordiv"></div>
<div id="overlaydiv"></div>

<script src="js/jtmin.js$CACHEPARA"></script>
<script src="js/app.js$CACHEPARA"></script>
<script src="js/compiled.js$CACHEPARA"></script>

<script>
  app.refer = "$REFER";
  app.vanityStartId = "$VANID";
  app.init();
</script>

<script id="placesapiscript" src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAktj-Nnv7dP6MTCisi6QVBWr-sS5iekXc&libraries=places&sensor=true"></script>

</body>
</html>
"""


def start_page_html(handler, dbclass, dbid):
    logging.info("----------------------------------------")
    logging.info("start_page_html " + dbclass + str(dbid))
    logging.info("----------------------------------------")
    descr = "A membic is a bite sized structured summary describing what you found memorable."
    img = "img/membiclogo.png"
    title = "Membic"
    if dbclass == "pen":
        pnm = pen.PenName.get_by_id(dbid)
        if pnm:
            descr = "Membic profile for " + pnm.name
            descr = descr.replace("\"", "'")
            title = descr
            img = "/profpic?profileid=" + str(dbid)
    elif dbclass == "coop":
        ctm = coop.Coop.get_by_id(dbid)
        if ctm:
            descr = ctm.name
            descr = descr.replace("\"", "'")
            title = descr
            img = "/ctmpic?coopid=" + str(dbid)
    cachev = "?v=" + datetime.datetime.now().strftime("%y%m%d")
    img += cachev
    html = indexHTML
    html = html.replace("$SITEPIC", img)
    html = html.replace("$TITLE", title)
    html = html.replace("$DESCR", descr)
    html = html.replace("$CACHEPARA", cachev)
    html = html.replace("$REFER", handler.request.referer or "")
    html = html.replace("$VANID", str(dbid))
    handler.response.headers['Content-Type'] = 'text/html'
    handler.response.out.write(html)


class PenPermalinkStart(webapp2.RequestHandler):
    def get(self, dbid):
        return start_page_html(self, "pen", int(dbid))


class ThemePermalinkStart(webapp2.RequestHandler):
    def get(self, dbid):
        return start_page_html(self, "coop", int(dbid))


class IndexPageStart(webapp2.RequestHandler):
    def get(self):
        return start_page_html(self, "", 0)


class DefaultStart(webapp2.RequestHandler):
    def get(self, reqdet):
        return start_page_html(self, "", 0)


class VanityStart(webapp2.RequestHandler):
    def get(self, hashtag):
        if hashtag.startswith("/"):
            hashtag = hashtag[1:]
        coopid = memcache.get(hashtag)
        if not coopid:
            themes = coop.Coop.gql("WHERE hashtag = :1", hashtag)
            found = themes.count()
            if not found:
                return srverr(self, 404, "No theme found for " + hashtag)
            coopid = str(themes[0].key().id())
            memcache.set(hashtag, coopid)
        return start_page_html(self, "coop", int(coopid))


app = webapp2.WSGIApplication([('/p/(\d+)', PenPermalinkStart),
                               ('/t/(\d+)', ThemePermalinkStart),
                               ('/index.html', IndexPageStart),
                               ('(.*)/', DefaultStart),
                               ('(.*)', VanityStart)],
                              debug=True)
