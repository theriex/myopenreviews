/*global app: false, jt: false, setTimeout: false, window: false, confirm: false */

/*jslint unparam: true, white: true, maxerr: 50, indent: 4 */

//////////////////////////////////////////////////////////////////////
// PenName or Coop common display functions.
//

app.pcd = (function () {
    "use strict";

    ////////////////////////////////////////
    // closure variables
    ////////////////////////////////////////

    var //see verifyFunctionConnections for procesing switches
        dst = { type: "", id: "", tab: "", obj: null,
                pen: { desclabel: "About Me",
                       descplace: "Links to other public pages you have, favorite sayings...",
                       descfield: "shoutout",
                       piclabel: "Profile Pic",
                       picfield: "profpic",
                       picsrc: "profpic?profileid=",
                       accsrc: "?view=pen&penid=" },
                coop: { desclabel: "Description",
                         descplace: "What is this cooperative theme focused on? What's appropriate to post?",
                         descfield: "description", 
                         piclabel: "Theme Pic",
                         picfield: "picture",
                         picsrc: "ctmpic?coopid=",
                         accsrc: "?view=coop&coopid=" } },
        knowntabs = { latest:    { href: "#latestmembics", 
                                   img: "img/tablatest.png" },
                      favorites: { href: "#favoritemembics",
                                   img: "img/helpfulq.png" }, 
                      search:    { href: "#searchmembics",
                                   img: "img/search.png" }, 
                      coops:    { href: "#coopsfollowing",
                                   img: "img/tabctms.png" },
                      calendar:  { href: "#coopcalendar",
                                   img: "calico" } },
        searchstate = { revtype: "all", qstr: "", 
                        init: false, inprog: false, revids: [] },
        setdispstate = { infomode: "" },
        ctmmsgs = [
            {name: "Following",
             levtxt: "Following shows you are interested in reading content from members writing on this theme.",
             uptxt: "Only members may post.",
             upbtn: "Apply for membership",
             cantxt: "You are applying for membership.",
             rejtxt: "Your membership application was rejected.",
             canbtn: "Withdraw membership application",
             restxt: "",
             resbtn: "Stop following",
             resconf: "",
             notice: "is applying for membership" },

            {name: "Member",
             levtxt: "As a member, you may post membics related to this theme.",
             uptxt: "If you would like to help make sure posts are relevant, and help approve new members, you can apply to become a Moderator.",
             upbtn: "Apply to become a Moderator",
             cantxt: "You are applying to become a Moderator.",
             rejtxt: "Your Moderator application was rejected.",
             canbtn: "Withdraw Moderator application",
             restxt: "If you no longer wish to contribute, you can resign your membership and go back to just following.",
             resbtn: "Resign membership",
             resconf: "Are you sure you want to resign your membership?",
             notice: "is applying to become a Moderator" },

            {name: "Moderator",
             levtxt: "As a Moderator, you can post, remove membics that don't belong, and approve membership applications.",
             uptxt: "If you think it would be appropriate for you to be recognized as a permanent co-owner of this cooperative theme, you can apply to become a Founder.",
             upbtn: "Apply to become a Founder",
             cantxt: "You are applying to become a Founder.",
             rejtxt: "Your Founder application was rejected.",
             canbtn: "Withdraw your Founder application",
             restxt: "If you no longer wish to help moderate, you can resign as a Moderator and go back to being a regular member.",
             resbtn: "Resign as Moderator",
             resconf: "Are you sure you want to resign as moderator?",
             notice: "is applying to become a Founder" },

            {name: "Founder",
             levtxt: "As a Founder, you permanently have all privileges available.",
             uptxt: "",
             upbtn: "",
             cantxt: "",
             rejtxt: "",
             canbtn: "",
             restxt: "If you no longer want ownership, you can resign as a Founder and allow others to continue the cooperative theme.",
             resbtn: "Resign as Founder",
             resconf: "Are you sure you want to resign as Founder?"}],


    ////////////////////////////////////////
    // helper functions
    ////////////////////////////////////////

    picImgSrc = function (obj) {
        var defs = dst[dst.type], 
            src = "img/emptyprofpic.png";
        if(obj[defs.picfield]) {  //e.g. pen.profpic
            //fetch with mild cachebust in case modified
            src = defs.picsrc + jt.instId(obj) +
                "&modified=" + obj.modified; }
        return src;
    },


    modButtonsHTML = function (obj) {
        var mypenid, mypen, objectid, html = "";
        mypenid = app.pen.myPenId();
        mypen = app.pen.myPenName();
        objectid = jt.instId(obj);
        if(dst.type === "pen" && mypenid && objectid === mypenid) {
            html = ["a", {id: "pcdsettingslink", href: "#pensettings",
                          onclick: jt.fs("app.pcd.settings()")},
                    ["img", {cla: "reviewbadge",
                             src: "img/settings.png"}]]; }
        if(dst.type === "coop" && mypen) {
            if(jt.isId(objectid) && (!mypen.coops || 
                                     !mypen.coops.csvcontains(objectid))) {
                html = ["span", {id: "followbuttonspan"},
                        ["button", {type: "button", id: "followbutton",
                                    onclick: jt.fs("app.pcd.follow()")},
                         "Follow"]]; }
            else {
                html = ["a", {id: "pcdsettingslink", href: "#coopsettings",
                              onclick: jt.fs("app.pcd.settings()")},
                        ["img", {cla: "reviewbadge",
                                 src: "img/settings.png"}]]; } }
        return jt.tac2html(html);
    },


    isMyMembershipAction = function (entry) {
        if(entry.targid === app.pen.myPenId() &&
           (entry.action.indexOf("Denied") >= 0 ||
            entry.action.indexOf("Accepted") >= 0 ||
            entry.action.indexOf("Demoted") >= 0)) {
            return true; }
        return false;
    },


    personalInfoButtonHTML = function () {
        var les, i, html;
        les = dst.obj.adminlog;
        if(!les || !les.length) {
            return ""; }
        html = "";
        for(i = 0; i < les.length; i += 1) {
            if(isMyMembershipAction(les[i])) {
                html = ["a", {href: "#myloginfo",
                              onclick: jt.fs("app.pcd.toggleCtmDet('mbinfo')")},
                        ["img", {cla: "myinfoimg", src: "img/info.png"}]];
                break; } }
        return html;
    },


    membershipSettingsHTML = function () {
        var html, mlev, seeking;
        if(dst.type === "pen") {
            return ""; }
        mlev = app.coop.membershipLevel(dst.obj);
        seeking = app.coop.isSeeking(dst.obj);
        html = [];
        if(ctmmsgs[mlev].uptxt && !seeking) {
            html.push(["div", {cla: "formline"},
                       [["div", {cla: "ctmlevtxt"},
                         ctmmsgs[mlev].uptxt],
                        ["div", {cla: "formbuttonsdiv", id: "memappbdiv"},
                         [personalInfoButtonHTML(),
                          ["button", {type: "button", id: "uplevelbutton",
                                   onclick: jt.fs("app.pcd.ctmmem('apply')")},
                          ctmmsgs[mlev].upbtn]]]]]); }
        if(seeking) {
            html.push(["div", {cla: "formline"},
                       [["div", {cla: "ctmlevtxt"},
                         ctmmsgs[mlev].cantxt],
                        ["div", {cla: "formbuttonsdiv", id: "memappbdiv"},
                         ["button", {type: "button", id: "withdrawbutton",
                                  onclick: jt.fs("app.pcd.ctmmem('withdraw')")},
                          ctmmsgs[mlev].canbtn]]]]); }
        else { //not seeking, show downlevel button
            html.push(["div", {cla: "formline"},
                       [["div", {cla: "ctmlevtxt"},
                         ctmmsgs[mlev].restxt],
                        ["div", {cla: "formbuttonsdiv", id: "rsbdiv"},
                         ["button", {type: "button", id: "downlevelbutton",
                                     onclick: jt.fs("app.pcd.ctmdownlev()")},
                          ctmmsgs[mlev].resbtn]]]]); }
        html = [["div", {cla: "formline"},
                 [["label", {fo: "statval", cla: "liflab"}, "Status"],
                  ["a", {href: "#togglecoopstat",
                         onclick: jt.fs("app.layout.togdisp('ctmstatdetdiv')")},
                   ["span", {id: "memlevspan"}, 
                    (seeking? "Applying" : ctmmsgs[mlev].name)]]]],
                ["div", {cla: "formline", id: "ctmstatdetdiv",
                         style: "display:none;"},
                 [["div", {cla: "formline"},
                   ctmmsgs[mlev].levtxt],
                  html]]];
        return html;
    },


    membershipAppNoticeHTML = function (penid, name, mlev) {
        var html;
        html = ["div", {cla: "ctmmemdiv"},
                [["div", {cla: "fpprofdivsp"},
                  ["img", {cla: "fpprofpic",
                           src: "profpic?profileid=" + penid,
                           title: jt.ndq(name),
                           alt: "prof pic"}]],
                 ["a", {href: "view=pen&penid=" + penid,
                        onclick: jt.fs("app.pen.bypenid('" + penid + "')")},
                  ["span", {cla: "penflist"}, name]],
                 "&nbsp;" + ctmmsgs[mlev].notice,
                 ["div", {cla: "formline"}],
                 ["div", {cla: "formline", id: "reasondiv" + penid,
                          style: "display:none;"},
                  [["label", {fo: "reasonin" + penid, cla: "liflab",
                              id: "reasonlab" + penid},
                    "Reason"],
                   ["input", {id: "reasonin" + penid, cla: "lifin",
                              type: "text"}]]],
                 ["div", {cla: "formline inlinebuttonsdiv", 
                          id: "abdiv" + penid},
                  [["button", {type: "button", id: "rejectb" + penid,
                               onclick: jt.fs("app.pcd.memapp('reject" +
                                              "','" + penid + "')")},
                    "Reject"],
                   ["button", {type: "button", id: "acceptb" + penid,
                               onclick: jt.fs("app.pcd.memapp('accept" +
                                              "','" + penid + "')")},
                    "Accept"]]]]];
        return html;
    },


    outstandingApplicationsHTML = function () {
        var html, sids, i, penid, name, mlev, slev;
        if(!dst.obj.seeking) {
            return ""; }
        mlev = app.coop.membershipLevel(dst.obj);
        if(mlev < 2) {
            return ""; }
        html = [];
        sids = dst.obj.seeking.csvarray();
        for(i = 0; i < sids.length; i += 1) {
            penid = sids[i];
            name = (dst.obj.people || {})[penid] || penid;
            slev = app.coop.membershipLevel(dst.obj, penid);
            if(mlev > slev || mlev === 3) {
                html.push(membershipAppNoticeHTML(penid, name, slev)); } }
        return html;
    },


    adminLogTargetHTML = function (logentry) {
        var penid;
        if(logentry.action === "Removed Review") {
            return logentry.tname; }
        if(logentry.action.startsWith("Resigned")) {
            return ""; }
        penid = logentry.targid;
        return ["a", {href: "view=pen&penid=" + penid,
                      onclick: jt.fs("app.pen.bypenid('" + penid + "')")},
                logentry.tname];
    },


    coopLogHTML = function (filter) {
        var les, i, html, penid;
        les = dst.obj.adminlog;
        if(!les || !les.length) {
            return "No log entries"; }
        html = [];
        for(i = 0; i < les.length; i += 1) {
            if(!filter || (filter === "membership" &&
                           isMyMembershipAction(les[i]))) {
                penid = les[i].penid;
                html.push(
                    ["div", {cla: "adminlogentrydiv"},
                     [["span", {cla: "logdatestampspan"}, 
                       les[i].when.slice(0, 10) + ": "],
                      ["a", {href: "view=pen&penid=" + penid,
                             onclick: jt.fs("app.pen.bypenid('" + penid + 
                                            "')")},
                       ["span", {cla: "logdatestampspan"},
                        les[i].pname || penid]],
                      " " + les[i].action + " ",
                      adminLogTargetHTML(les[i]),
                      (les[i].reason? ": " + les[i].reason : "")]]); } }
        return jt.tac2html(html);
    },


    coopMembershipLineHTML = function (field, penid, pname, mlev) {
        var html;
        if(field === "founders" || (field === "moderators" && mlev < 3) ||
                                   (field === "members" && mlev <= 1)) {
            html = ["div", {cla: "memlistdiv"},
                    [["div", {cla: "fpprofdivsp"},
                      ["img", {cla: "fpprofpic",
                               src: "profpic?profileid=" + penid,
                               alt: "prof pic"}]],
                     ["span", {cla: "penflist"}, pname]]]; }
        else {  //display modifiable member listing
            html = ["div", {cla: "formline", id: "memlistdiv" + penid},
                    [["div", {cla: "fpprofdivsp"},
                      ["img", {cla: "fpprofpic",
                               src: "profpic?profileid=" + penid,
                               alt: "prof pic"}]],
                     ["a", {href: "#demote",
                            onclick: jt.fs("app.layout.togdisp('memdemdiv" +
                                           penid + "')")},
                      ["span", {cla: "penflist"}, pname]],
                     ["div", {cla: "formline", id: "memdemdiv" + penid,
                              style: "display:none;"},
                      [["label", {fo: "reasonin" + penid, cla: "liflab",
                                  id: "reasonlab" + penid},
                        "Reason"],
                       ["input", {id: "reasonin" + penid, cla: "lifin",
                                  placeholder: "Reason required",
                                  type: "text"}],
                       ["div", {cla: "formline formbuttonsdiv", 
                                id: "memdembuttondiv" + penid},
                        ["button", {type: "button", id: "demoteb" + penid,
                                    onclick: jt.fs("app.pcd.memdem('" + 
                                                   penid + "')")},
                         "Demote"]]]]]]; }
        return html;
    },


    coopMembershipHTML = function () {
        var html, fields, i, field, penids, j, penid, pname, mlev;
        mlev = app.coop.membershipLevel(dst.obj);
        html = [];
        fields = ["founders", "moderators", "members"];
        for(i = 0; i < fields.length; i += 1) {
            field = fields[i];
            penids = dst.obj[field].csvarray();
            if(penids.length) {
                html.push(["div", {cla: "formline"}, field.capitalize()]); }
            for(j = 0; j < penids.length; j += 1) {
                penid = penids[j];
                pname = (dst.obj.people || {})[penid] || penid;
                html.push(coopMembershipLineHTML(
                    field, penid, pname, mlev)); } }
        html.push(["div", {cla: "formline"}, "&nbsp;"]); //final clear
        return jt.tac2html(html);
    },


    adminSettingsHTML = function () {
        var memsel = "", html;
        if(dst.type !== "coop") {
            return ""; }
        if(app.coop.membershipLevel(dst.obj) >= 2) {
            memsel = ["a", {href: "#memberinfo",
                            onclick: jt.fs("app.pcd.toggleCtmDet('members')")},
                      "Membership"]; }
        html = [["div", {cla: "formline"},
                 outstandingApplicationsHTML()],
                ["div", {cla: "formline"},
                 [["div", {id: "ctminfoseldiv"},
                   ["a", {href: "#coopinfo",
                          onclick: jt.fs("app.pcd.toggleCtmDet('info')")},
                    ["img", {cla: "ctmsetimg", src: "img/info.png"}]]],
                  ["div", {id: "meminfoseldiv"}, memsel]]],
                ["div", {cla: "formline", id: "midispdiv",
                         style: "display:none;"}]];
        return html;
    },


    monitorPicUpload = function () {
        var tgif, txt, defs;
        tgif = jt.byId('tgif');
        if(tgif) {
            txt = tgif.contentDocument || tgif.contentWindow.document;
            if(txt) {
                txt = txt.body.innerHTML;
                if(txt.indexOf("Done: ") === 0) {
                    defs = dst[dst.type];
                    dst.obj[defs.picfield] = dst.id;
                    dst.obj.modified = txt.slice("Done: ".length);
                    app.pcd.display(dst.type, dst.id, dst.tab, dst.obj);
                    return; }
                if(txt && txt.trim() && txt.trim() !== "Ready") {
                    jt.out('imgupstatdiv', txt); } }
            setTimeout(monitorPicUpload, 800); }
    },
    picSettingsHTML = function () {
        var html;
        if(!jt.hasId(dst.obj) ||
               (dst.type === "coop" && 
                app.coop.membershipLevel(dst.obj) < 3)) {
            return ""; }
        html = [["label", {fo: "picuploadform", cla: "overlab"},
                  "Change Picture"],
                ["form", {action: "/picupload", method: "post",
                          enctype: "multipart/form-data", target: "tgif",
                          id: "picuploadform"},
                 [jt.paramsToFormInputs(app.login.authparams()),
                  jt.paramsToFormInputs("picfor=" + dst.type + 
                                        "&_id=" + dst.id +
                                        "&penid=" + app.pen.myPenId()),
                  ["div", {cla: "tablediv"},
                   [["div", {cla: "fileindiv"},
                     [["input", {type: "file", 
                                 name: "picfilein", id: "picfilein"}],
                      ["div", {id: "uploadbuttonsdiv"},
                       ["input", {type: "submit", cla: "formbutton",
                                  value: "Upload&nbsp;Picture"}]]]],
                    ["div", {id: "imgupstatdiv", cla: "formstatdiv"}]]]]],
                ["iframe", {id: "tgif", name: "tgif", src: "/picupload",
                            style: "display:none"}]];
        return html;
    },
    picSettingsInit = function () {
        monitorPicUpload();
    },


    descripSettingsHTML = function () {
        var nh = "", defs, html;
        if(dst.type === "coop") {
            if(app.coop.membershipLevel(dst.obj) < 3) {
                return ""; }
            nh = ["div", {cla: "formline"},
                  [["label", {fo: "namein", cla: "liflab", id: "namelab"},
                    "Name"],
                   ["input", {id: "namein", cla: "lifin", type: "text",
                              placeholder: "Theme name required",
                              value: dst.obj.name}]]]; }
        defs = dst[dst.type];
        html = [nh,
                ["div", {cla: "formline"},
                 ["label", {fo: "shouteditbox", cla: "overlab"}, 
                  defs.desclabel]],
                ["textarea", {id: "shouteditbox", cla: "dlgta"}],
                ["div", {id: "formstatdiv"}],
                ["div", {cla: "dlgbuttonsdiv"},
                 ["button", {type: "button", id: "okbutton",
                             onclick: jt.fs("app.pcd.saveDescription()")},
                  "Update Description"]]];
        return html;
    },
    descripSettingsInit = function () {
        var defs, namein, shout;
        defs = dst[dst.type];
        shout = jt.byId('shouteditbox');
        if(shout) {
            shout.readOnly = false;
            shout.value = dst.obj[defs.descfield];
            shout.placeholder = defs.descplace; }
        //set the focus only if not already filled in
        namein = jt.byId('namein');
        if(namein && !namein.value) {
            namein.focus(); }
        else if(shout && !shout.value) {
            shout.focus(); }
    },


    calendarIconHTML = function () {
        var html;
        html = ["div", {id: "calicodiv", cla: "tabico"},
                [["div", {id: "calicoheaddiv"}],
                 ["div", {id: "caliconumdiv"},
                  new Date().getDate()]]];
        return jt.tac2html(html);
    },


    calendarSettingsHTML = function () {
        var html;
        if(dst.type !== "coop" || app.coop.membershipLevel(dst.obj) < 3 ||
               !jt.isId(jt.instId(dst.obj))) {
            return ""; }
        html = ["div", {cla: "formline"},
                [["a", {href: "#togglecalembed",
                        onclick: jt.fs("app.layout.togdisp('ctmcalembdiv')")},
                  [calendarIconHTML(),
                   ["span", {cla: "settingsexpandlinkspan"},
                    "Embedded Calendar"]]],
                 ["div", {cla: "formline", id: "ctmcalembdiv",
                          style: "display:none;"},
                  [["div", {cla: "formline"},
                    "If your cooperative has an embeddable public calendar, paste the embed code here:"],
                   ["textarea", {id: "calembedta", cla: "dlgta"}],
                   ["div", {cla: "dlgbuttonsdiv"},
                    ["button", {type: "button", id: "savecalbutton",
                                onclick: jt.fs("app.pcd.saveCalEmbed()")},
                     "Update Embed"]]]]]];
        return html;
    },
    calSettingsInit = function () {
        var ceta = jt.byId('calembedta');
        if(ceta) {
            ceta.readOnly = false;
            ceta.value = dst.obj.calembed;
            ceta.placeholder = "<iframe src=... code"; }
    },


    rssEmbedSettingsHTML = function () {
        var sr, html;
        sr = "https://www.commafeed.com";
        if(dst.type !== "coop" || !jt.isId(jt.instId(dst.obj))) {
            return ""; }
        html = ["div", {cla: "formline"},
                [["a", {href: "#toggletools",
                        onclick: jt.fs("app.layout.togdisp('ctmtoolsdiv')")},
                  [["img", {cla: "ctmsetimg", src: "img/rssicon.png"}],
                   ["span", {cla: "settingsexpandlinkspan"},
                    "RSS and Site Embed"]]],
                 ["div", {cla: "formline", id: "ctmtoolsdiv",
                          style: "display:none;"},
                  [["div", {cla: "formline"},
                    [["RSS allows you to make several web pages into a single news feed. To follow posts for this theme with ",
                      ["a", {href: "#sampleRSSReader",
                             onclick: jt.fs("window.open('" + sr + "')")},
                       "an RSS reader"],
                      " use this URL:"],
                     ["div", {cla: "formline"}, 
                      ["textarea", {id: "rssurlta", cla: "dlgta"}]]]],
                   ["div", {cla: "formline"},
                    [["To embed this theme, add this html to your web page:"],
                     ["div", {cla: "formline"},
                      ["textarea", {id: "ctmembedta", cla: "dlgta"}]]]]]]]];
        return html;
    },
    rssEmbedSettingsInit = function () {
        var site, ta;
        site = window.location.href;
        if(site.endsWith("/")) {
            site = site.slice(0, -1); }
        ta = jt.byId('rssurlta');
        if(ta) {
            ta.readOnly = true;
            ta.value = site + "/rsscoop?coop=" + 
                jt.instId(dst.obj); }
        ta = jt.byId('ctmembedta');
        if(ta) {
            ta.readOnly = true;
            ta.value = "<div id=\"membiccssoverride\">" + site + 
                "/css/embedsample.css</div>\n" +
                "<div id=\"membiccoopdiv\"><a href=\"" + site + 
                "?view=coop&coopid=" + dst.id + "\">" + dst.obj.name + 
                "</a></div>\n" +
                "<script src=\"" + site + "/js/embed.js\"></script>\n"; }
    },


    historyCheckpoint = function () {
        var histrec = { view: dst.type, tab: dst.tab };
        histrec[dst.type + "id"] = dst.id;
        app.history.checkpoint(histrec);
    },


    tabHTMLFromDef = function (tabname) {
        var ico, html;
        ico = ["img", {cla: "tabico", src: knowntabs[tabname].img}];
        if(knowntabs[tabname].img === "calico") {
            ico = calendarIconHTML(); }
        html = ["li", {id: tabname + "li", cla: "unselectedTab"},
                ["a", {href: knowntabs[tabname].href,
                       onclick: jt.fs("app.pcd.tabsel('" + tabname + "')")},
                 ico]];
        return html;
    },


    getRecentReviews = function () {
        var revs, rt, all, i;
        revs = app.lcs.resolveIdArrayToCachedObjs("rev", dst.obj.recent);
        rt = app.layout.getType();
        if(rt !== "all") {
            all = revs;
            revs = [];
            for(i = 0; i < all.length; i += 1) {
                if(all[i].revtype === rt) {
                    revs.push(all[i]); } } }
        return revs;
    },


    displayRecent = function (expid) {
        app.review.displayReviews('pcdcontdiv', "pcd", getRecentReviews(), 
                                  "app.pcd.toggleRevExpansion", 
                                  (dst.type === "coop"));
        if(expid) {
            app.pcd.toggleRevExpansion("pcd", expid); }
    },


    getFavoriteReviews = function () {
        var revids, rt, tops, types, i, revs;
        tops = dst.obj.top20s || {};
        if(!tops.all) {
            tops.all = [];
            types = app.review.getReviewTypes();
            for(i = 0; i < types.length; i += 1) {
                rt = types[i].type;
                tops.all = tops.all.concat(tops[rt] || []); }
            revs = app.lcs.resolveIdArrayToCachedObjs("rev", tops.all);
            revs.sort(function (a, b) {
                if(a.rating < b.rating) { return 1; }
                if(a.rating > b.rating) { return -1; }
                if(a.modified < b.modified) { return 1; }
                if(a.modified > b.modified) { return -1; }
                return 0; });
            tops.all = app.lcs.objArrayToIdArray(revs); }
        rt = app.layout.getType();
        revids = tops[rt] || [];
        return app.lcs.resolveIdArrayToCachedObjs("rev", revids);
    },


    displayFavorites = function () {
        app.review.displayReviews('pcdcontdiv', "pcd", getFavoriteReviews(),
                                  "app.pcd.toggleRevExpansion", 
                                  (dst.type === "coop"));
    },


    displaySearch = function () {
        var html;
        html = [["div", {id: "pcdsrchdiv"},
                 ["input", {type: "text", id: "pcdsrchin", size: 40,
                            placeholder: "Membic title or name",
                            value: searchstate.qstr}]],
                ["div", {id: "pcdsrchdispdiv"}]];
        jt.out('pcdcontdiv', jt.tac2html(html));
        searchstate.init = true;
        app.pcd.searchReviews();
    },


    displayCoops = function (coopnames) {
        var html, gid, gname;
        if(!coopnames) {
            return app.pen.coopNames(dst.obj, "pcdcontdiv", displayCoops); }
        html = [];
        for(gid in coopnames) {
            if(coopnames.hasOwnProperty(gid)) {
                gname = coopnames[gid];
                html.push(["div", {cla: "cooplinkdiv"},
                           [["div", {cla: "fpprofdiv"},
                             ["img", {cla: "fpprofpic",
                                      alt: "no pic",
                                      src: dst.coop.picsrc + gid}]],
                            ["a", {href: "coops/" + jt.canonize(gname),
                                   onclick: jt.fs("app.coop.bycoopid('" +
                                                  gid + "')")},
                             ["span", {cla: "penfont"}, gname]]]]); } }
        html.push(["div", {cla: "pcdtext"},
                   [["div", {cla: "pcdtoggle"},
                     ["a", {href: "#findcoops",
                            onclick: jt.fs("app.pcd.toggleFindCoops()")},
                      "Follow cooperative themes"]],
                    ["div", {id: "findctmdiv"}]]]);
        html.push(["div", {cla: "pcdtext"},
                   [["div", {cla: "pcdtoggle"},
                     ["a", {href: "#createcoop",
                            onclick: jt.fs("app.pcd.toggleCreateCoop()")},
                      "Create cooperative theme"]],
                    ["div", {id: "createctmdiv"}]]]);
        jt.out('pcdcontdiv', jt.tac2html(html));
    },


    displayCalendar = function () {
        jt.out('pcdcontdiv', dst.obj.calembed);
    },


    tabsHTML = function (obj) {
        var html = [];
        html.push(tabHTMLFromDef("latest"));
        html.push(tabHTMLFromDef("favorites"));
        if(!app.embedded) {
            html.push(tabHTMLFromDef("search")); }
        if(dst.type === "pen") {  //find or create coop
            html.push(tabHTMLFromDef("coops")); }
        if(dst.type === "coop" && dst.obj.calembed) {
            html.push(tabHTMLFromDef("calendar")); }
        return html;
    },


    displayTab = function (tabname, expid) {
        var kt, elem, dispfunc;
        tabname = tabname || "latest";
        for(kt in knowntabs) {
            if(knowntabs.hasOwnProperty(kt)) {
                elem = jt.byId(kt + "li");
                if(elem) {
                    elem.className = "unselectedTab"; } } }
        jt.byId(tabname + "li").className = "selectedTab";
        dst.tab = tabname;
        dispfunc = knowntabs[tabname].dispfunc;
        app.layout.displayTypes(dispfunc);  //connect type filtering
        if(jt.isId(jt.instId(dst.obj))) {
            return dispfunc(expid); }
        jt.out('pcdcontdiv', dst.type.capitalize() + " settings required");
        app.pcd.settings();
    },


    backgroundVerifyObjectData = function () {
        var pen;
        if(dst.type === "coop" && jt.hasId(dst.obj)) {
            pen = app.pen.myPenName();
            if(app.coop.membershipLevel(dst.obj, app.pen.myPenId()) > 0 &&
               !(pen.coops && pen.coops.csvcontains(jt.instId(dst.obj)))) {
                app.pcd.follow(); } }
    },


    displayObject = function (obj, expid) {
        var defs, html;
        obj = obj || dst.obj;
        dst.obj = obj;
        app.layout.cancelOverlay();  //close user menu if open
        app.layout.closeDialog();    //close search dialog if open
        historyCheckpoint();
        defs = dst[dst.type];
        html = ["div", {id: "pcdouterdiv"},
                [["div", {id: "pcdupperdiv"},
                  [["div", {id: "pcdpicdiv"},
                    ["img", {cla: "pcdpic", src: picImgSrc(obj)}]],
                   ["div", {id: "pcddescrdiv"},
                    [["div", {id: "pcdnamediv"},
                      [["a", {href: defs.accsrc + jt.instId(obj),
                              onclick: jt.fs("app.pcd.share()")},
                        ["span", {cla: "penfont"}, obj.name]],
                       modButtonsHTML(obj)]],
                     ["div", {id: "ppcdshoutdiv"},
                      ["span", {cla: "shoutspan"}, 
                       jt.linkify(obj[defs.descfield] || "")]]]]]],
                 ["div", {id: "tabsdiv"},
                  ["ul", {id: "tabsul"},
                   tabsHTML(obj)]],
                 ["div", {id: "pcdcontdiv"}]]];
        jt.out('contentdiv', jt.tac2html(html));
        setTimeout(backgroundVerifyObjectData, 100);
        displayTab(dst.tab, expid);
    },


    displayRetrievalWaitMessage = function (divid, dtype, id) {
        var mpi, msg;
        mpi = app.pen.myPenId();
        msg = "Retrieving " + dtype.capitalize() + " " + id + "...";
        if(dtype === "coop") {
            msg = "Retrieving cooperative theme " + id + "...";
            if(app.coopnames[id]) {
                msg = "Retrieving " + app.coopnames[id] + "..."; } }
        else if(dtype === "pen") {
            if((!id && !mpi) || (id && id === mpi)) {
                msg = "Retrieving your Pen Name..."; }
            else if(app.pennames[id]) {
                msg = "Retrieving " + app.pennames[id] + "..."; }
            else {
                msg = "Retrieving Pen Name " + id + "..."; } }
        jt.out(divid, msg);
    },


    sourceRevIds = function (revs, dtype, id) {
        var revids, i;
        revids = [];
        for(i = 0; i < revs.length; i += 1) {
            if(dtype !== "coop" || revs[i].ctmid === id) {
                revids.push(jt.instId(revs[i])); } }
        return revids;
    },


    verifyFunctionConnections = function () {
        if(!dst.pen.objupdate) {
            dst.pen.objupdate = app.pen.updatePen;
            dst.coop.objupdate = app.coop.updateCoop; }
        if(!knowntabs.latest.dispfunc) {
            knowntabs.latest.dispfunc = displayRecent;
            knowntabs.favorites.dispfunc = displayFavorites;
            knowntabs.search.dispfunc = displaySearch;
            knowntabs.coops.dispfunc = displayCoops;
            knowntabs.calendar.dispfunc = displayCalendar; }
    };


    ////////////////////////////////////////
    // published functions
    ////////////////////////////////////////
return {

    settings: function (obj) {
        var html;
        if(obj) {
            dst.obj = obj; }
        html = ["div", {id: "pcdsettingsdlgdiv"},
                [["div", {cla: "pcdsectiondiv"},
                  membershipSettingsHTML()],
                 ["div", {cla: "pcdsectiondiv"},
                  adminSettingsHTML()],
                 ["div", {cla: "pcdsectiondiv"},
                  picSettingsHTML()],
                 ["div", {cla: "pcdsectiondiv"},
                  descripSettingsHTML()],
                 ["div", {cla: "pcdsectiondiv"},
                  calendarSettingsHTML()],
                 ["div", {cla: "pcdsectiondiv"},
                  rssEmbedSettingsHTML()]]];
        app.layout.openOverlay({x:10, y:80}, jt.tac2html(html), null,
                               function () {
                                   picSettingsInit();
                                   descripSettingsInit();
                                   calSettingsInit();
                                   rssEmbedSettingsInit(); });
    },


    follow: function () {
        var pen, ctmid;
        if(dst.type === "coop" && jt.hasId(dst.obj)) {
            ctmid = jt.instId(dst.obj);
            pen = app.pen.myPenName();
            pen.coops = pen.coops || "";
            if(!pen.coops.csvcontains(ctmid)) {
                pen.coops = pen.coops.csvappend(ctmid);
                app.pen.updatePen(pen, app.pcd.redisplay, app.failf); } }
    },


    saveDescription: function () {
        var changed = false, defs, elem, val, okfunc, failfunc;
        jt.byId('okbutton').disabled = true;
        defs = dst[dst.type];
        elem = jt.byId("namein");
        if(elem && elem.value && elem.value.trim()) {
            val = elem.value.trim();
            if(dst.obj.name !== val) {
                dst.obj.name = val;
                changed = true; } }
        elem = jt.byId('shouteditbox');
        if(elem && elem.value !== dst.obj[defs.descfield]) {
            dst.obj[defs.descfield] = elem.value;
            changed = true; }
        if(!changed) {
            return app.layout.cancelOverlay(); }
        if(changed) {
            okfunc = function (updobj) {
                dst.obj = updobj;
                app.layout.cancelOverlay();
                app.pcd.display(dst.type, dst.id, dst.tab, dst.obj); };
            failfunc = function (code, errtxt) {
                jt.byId('okbutton').disabled = false;
                jt.out('formstatdiv', jt.errhtml("Update", code, errtxt)); };
            defs.objupdate(dst.obj, okfunc, failfunc); }
    },


    saveCalEmbed: function () {
        var defs, elem, okfunc, failfunc;
        jt.byId('savecalbutton').disabled = true;
        defs = dst[dst.type];
        elem = jt.byId("calembedta");
        if(elem && elem.value !== dst.obj.calembed) {
            dst.obj.calembed = elem.value;
            okfunc = function (upobj) {
                dst.obj = upobj;
                app.layout.cancelOverlay();
                app.pcd.display(dst.type, dst.id, dst.tab, dst.obj); };
            failfunc = function (code, errtxt) {
                jt.byId('savecalbutton').disabled = false;
                jt.out('imgupstatdiv', "Update failed code " + code +
                       ": " + errtxt); };
            defs.objupdate(dst.obj, okfunc, failfunc); }
    },


    ctmmem: function (action) {
        if(action === "apply") {
            jt.out("memappbdiv", "Applying..."); }
        else if(action === "withdraw") {
            jt.out("memappbdiv", "Withdrawing..."); }
        app.coop.applyForMembership(dst.obj, action, app.pcd.settings);
    },


    ctmdownlev: function () {
        var mlev, confmsg, pen;
        if(!jt.hasId(dst.obj)) {  //creating new coop and not instantiated yet
            app.layout.cancelOverlay();
            return app.pcd.display("pen", app.pen.myPenId(), "coops", 
                                   app.pen.myPenName()); }
        mlev = app.coop.membershipLevel(dst.obj);
        confmsg = ctmmsgs[mlev].resconf;
        if(confmsg && !confirm(confmsg)) {
            return; }
        if(mlev > 0) {
            jt.out('rsbdiv', "Resigning");
            app.coop.processMembership(dst.obj, "demote", app.pen.myPenId(),
                                        "", app.pcd.settings); }
        else {
            jt.out('rsbdiv', "Stopping");
            pen = app.pen.myPenName();
            pen.coops = pen.coops.csvremove(dst.id);
            app.pen.updatePen(pen, app.pcd.redisplay, app.failf); }
    },


    share: function () {
        var descrdiv, shurlspan, defs, html;
        descrdiv = jt.byId("ppcdshoutdiv");
        if(descrdiv) {
            defs = dst[dst.type];
            shurlspan = jt.byId("shurlspan");
            if(shurlspan) {
                jt.out("ppcdshoutdiv", jt.tac2html(
                    ["span", {cla: "shoutspan"}, 
                     jt.linkify(dst.obj[defs.descfield] || "")])); }
            else {
                html = [["span", {cla: "shoutspan"},
                         (app.login.isLoggedIn() || dst.type !== "coop"? "" : 
                          "Sign in to follow or join.<br/>")],
                        ["span", {cla: "shoutspan"},
                         "To share this " + dst.type + " via social media, email or text, use the following URL:"],
                        ["br"],
                        ["span", {id: "shurlspan"},
                         window.location.href + defs.accsrc + dst.id]];
                jt.out("ppcdshoutdiv", jt.tac2html(html)); } }
    },


    reviewItemNameHTML: function (type, revobj) {
        var linktxt = "";
        if(type.subkey) {
            linktxt = "<i>" + jt.ellipsis(revobj[type.key], 60) + "</i> " +
                jt.ellipsis(revobj[type.subkey], 40); }
        else {
            linktxt = jt.ellipsis(revobj[type.key], 60); }
        return linktxt;
    },


    searchReviews: function () {
        var srchin, params;
        srchin = jt.byId("pcdsrchin");
        if(!srchin) {  //query input no longer on screen.  probably switched
            return; }  //tabs so just quit
        if(!app.login.isLoggedIn()) {
            jt.out('pcdsrchdispdiv', "Sign in to search");
            return; }
        if(!searchstate.inprog && 
              (searchstate.init ||
               searchstate.revtype !== app.layout.getType() ||
               searchstate.qstr !== srchin.value)) {
            searchstate.qstr = srchin.value;
            searchstate.revtype = app.layout.getType();
            searchstate.inprog = true;
            searchstate.init = false;
            params = app.login.authparams() + 
                "&qstr=" + jt.enc(jt.canonize(searchstate.qstr)) +
                "&revtype=" + app.typeOrBlank(searchstate.revtype) +
                "&" + (dst.type === "coop"? "ctmid=" : "penid=") +
                jt.instId(dst.obj);
            jt.call('GET', "srchrevs?" + params, null,
                    function (revs) {
                        app.lcs.putAll("rev", revs);
                        searchstate.revs = revs;
                        searchstate.inprog = false;
                        app.review.displayReviews(
                            'pcdsrchdispdiv', "pcd", searchstate.revs, 
                            "app.pcd.toggleRevExpansion", 
                            (dst.type === "coop"));
                        setTimeout(app.pcd.searchReviews, 400); },
                    app.failf(function (code, errtxt) {
                        jt.out('pcdsrchdispdiv', "searchReviews failed: " + 
                               code + " " + errtxt); }),
                    jt.semaphore("pcd.searchReviews")); }
        else {  //no change to search parameters yet, monitor
            setTimeout(app.pcd.searchReviews, 400); }
    },


    toggleRevExpansion: function (prefix, revid) {
        var revs;
        if(app.embedded) {
            return window.open("?view=coop&coopid=" + dst.id +
                               "&tab=" + dst.tab + "&expid=" + revid); }
        switch(dst.tab) {
        case "latest":
            revs = getRecentReviews();
            break;
        case "favorites":
            revs = getFavoriteReviews();
            break;
        case "search":
            revs = searchstate.revs;
            break;
        default:
            jt.err("pcd.toggleRevExpansion unknown tab " + dst.tab); }
        app.review.toggleExpansion(revs, prefix, revid);
    },


    toggleFindCoops: function () {
        var html;
        html = ["If you see something good in the ",
                ["a", {href: "#home",
                       onclick: jt.fs("app.activity.displayFeed()")},
                 "main feed display,"],
                " click the title to expand the details. If the membic was posted to a cooperative theme, you can click the theme name to see all recent and top posts. If a theme looks interesting, you can follow it, and apply for membership if you want to contribute."];
        if(!jt.byId("findctmdiv").innerHTML) {
            jt.out('findctmdiv', jt.tac2html(html)); }
        else {
            jt.out('findctmdiv', ""); }
    },


    toggleCreateCoop: function () {
        var html;
        html = ["A cooperative theme holds a curated collection of membics contributed by one or more pen names. As a creating Founder, you have full privileges to manage other members and posts as you want.",
                ["div", {cla: "formbuttonsdiv"},
                 ["button", {type: "button", id: "createcoopbutton",
                             onclick: jt.fs("app.pcd.display('coop')")},
                  "Create New Theme"]]];
        if(!jt.byId("createctmdiv").innerHTML) {
            jt.out('createctmdiv', jt.tac2html(html)); }
        else {
            jt.out('createctmdiv', ""); }
    },


    toggleCtmDet: function (ctype, filter) {
        var midispdiv = jt.byId('midispdiv');
        if(ctype === "info" && (setdispstate.infomode !== "info" ||
                                !midispdiv.innerHTML)) {
            setdispstate.infomode = "info";
            jt.byId('midispdiv').style.display = "block";
            jt.out('midispdiv', coopLogHTML()); }
        else if(ctype === "mbinfo" && (setdispstate.infomode !== "finfo" ||
                                       !midispdiv.innerHTML)) {
            setdispstate.infomode = "finfo";
            jt.byId('midispdiv').style.display = "block";
            jt.out('midispdiv', coopLogHTML("membership")); }
        else if(ctype === "members" && (setdispstate.infomode !== "members" ||
                                        !midispdiv.innerHTML)) {
            setdispstate.infomode = "members";
            jt.byId('midispdiv').style.display = "block";
            jt.out('midispdiv', coopMembershipHTML()); }
        else {
            app.layout.togdisp("midispdiv"); }
    },


    memapp: function (verb, penid) {
        var elem;
        switch(verb) {
        case "reject":
            elem = jt.byId("reasondiv" + penid);
            if(elem.style.display !== "block") {
                elem.style.display = "block";
                jt.byId("reasonin" + penid).focus(); }
            else {
                elem = jt.byId("reasonin" + penid);
                if(!elem.value || !elem.value.trim()) {
                    jt.byId("reasonlab" + penid).style.color = "red"; }
                else { //have reason
                    jt.out("abdiv" + penid, "Rejecting...");
                    app.coop.processMembership(dst.obj, verb, penid, 
                                                elem.value.trim(),
                                                app.pcd.settings); } }
            break;
        case "accept":
            jt.out("abdiv" + penid, "Accepting...");
            app.coop.processMembership(dst.obj, verb, penid, "", 
                                        app.pcd.settings);
            break;
        default:
            jt.log("pcd.memapp unknown verb: " + verb); }
    },


    memdem: function (penid) {
        var elem;
        elem = jt.byId("reasonin" + penid);
        if(elem && elem.value.trim()) {
            jt.out("memdembuttondiv" + penid, "Demoting...");
            app.coop.processMembership(dst.obj, "demote", penid, 
                                        elem.value.trim(),
                                        app.pcd.settings); }
    },


    tabsel: function (tabname) {
        historyCheckpoint();  //history collapses tab changes
        displayTab(tabname);
    },


    display: function (dtype, id, tab, obj, expid) {
        verifyFunctionConnections();
        dst.type = dtype || "pen";
        dst.id = id || (obj? jt.instId(obj) : "") || 
            (dst.type === "pen"? app.pen.myPenId() : "") || "";
        dst.tab = tab || "latest";
        if(obj) {
            return displayObject(obj, expid); }
        if(dst.id) {
            return app.pcd.fetchAndDisplay(dst.type, dst.id, dst.tab); }
        if(dtype === "coop") {  //creating new coop
            dst.obj = { name: "", description: "", 
                        people: {}, founders: app.pen.myPenId() };
            dst.obj.people[app.pen.myPenId()] = app.pen.myPenName().name;
            return displayObject(dst.obj); }
        jt.err("pcd.display called with inadequate data");
    },


    redisplay: function () {
        app.pcd.display(dst.type, dst.id, dst.tab, dst.obj);
    },


    resetState: function () {
        dst.type = "";
        dst.id = "";
        dst.tab = "";
        dst.obj = null;
        searchstate = { revtype: "all", qstr: "", 
                        init: false, inprog: false, revids: [] };
        setdispstate = { infomode: "" };
    },


    blockfetch: function (dtype, id, callback, divid) {
        var objref, url, time;
        divid = divid || 'contentdiv';
        if(dtype === "pen" && !id) {
            id = app.pen.myPenId(); }
        objref = app.lcs.getRef(dtype, id);
        if(objref && objref[dtype] && objref[dtype].recent) {
            return callback(objref[dtype]); }
        displayRetrievalWaitMessage(divid, dtype, id);
        url = "blockfetch?" + app.login.authparams();
        if(dtype === "pen" && id !== app.pen.myPenId()) {
            url += "&penid=" + id; }  //penid not specified if retrieving self
        if(dtype === "coop") {
            url += "&ctmid=" + id; }
        time = new Date().getTime();
        jt.call('GET', url, null,
                function (objs) {  // main obj + recent/top reviews
                    var obj, revs;
                    time = new Date().getTime() - time;
                    jt.log("blockfetch " + dtype + " " + id  + 
                           " returned in " + time/1000 + " seconds.");
                    jt.out(divid, "");
                    if(!objs.length || !objs[0]) {
                        if(dtype === "pen") {
                            return app.pen.newPenName(callback); }
                        app.lcs.tomb(dtype, id, "blockfetch failed");
                        return callback(null); }
                    obj = objs[0];
                    revs = objs.slice(1);
                    revs.sort(function (a, b) {
                        if(a.modified < b.modified) { return 1; }
                        if(a.modified > b.modified) { return -1; }
                        return 0; });
                    app.lcs.putAll("rev", revs);
                    obj.recent = sourceRevIds(revs, dtype, id);
                    app.lcs.put(dtype, obj);
                    if(dtype === "pen" && !app.pen.myPenId() &&
                           obj.stash && obj.stash.account) {
                        app.pen.setMyPenId(jt.instId(obj)); }
                    jt.log("blockfetch cached " + dtype + " " + jt.instId(obj));
                    if(dtype === "coop") {
                        app.coop.verifyPenStash(obj); }
                    callback(obj); },
                app.failf(function (code, errtxt) {
                    jt.log("blockfetch " + code + ": " + errtxt);
                    callback(null); }),
                jt.semaphore("pcd.fetchAndDisplay" + dtype + id));
    },


    fetchAndDisplay: function (dtype, id, tab, expid) {
        app.pcd.blockfetch(dtype, id, function (obj) {
            app.pcd.display(dtype, id, tab || "", obj, expid); });
    }

};  //end of returned functions
}());
