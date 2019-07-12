/*global app, jt, window, confirm, document */

/*jslint browser, white, fudge, for, long */

//////////////////////////////////////////////////////////////////////
// PenName or Coop common display functions.
//

app.pcd = (function () {
    "use strict";

    var dst = {type:"", id:"", tab:"", obj:null,
               profile: {desclabel: "About Me",
                         descplace: "A message for visitors. Link to your site, or favorite quote?",
                         descfield: "aboutme",
                         piclabel: "Profile Pic",
                         picfield: "profpic",
                         picsrc: "profpic?profileid=" },
               coop:    {desclabel: "Description",
                         descplace: "What is this cooperative theme focused on? What's appropriate to post?",
                         descfield: "description", 
                         piclabel: "Theme Pic",
                         picfield: "picture",
                         picsrc: "ctmpic?coopid="} };
    var srchst = {mtypes:"", kwrds:"", mode:"nokeys", qstr:"", status:""};
    var setdispstate = {infomode:""};
    var standardOverrideColors = [
        {name:"tab", value:"#ffae50", sel:".tablinksel", attr:"background"},
        {name:"link", value:"#84521a", sel: "A:link,A:visited,A:active", 
         attr:"color"},
        {name:"hover", value:"#a05705", sel:"A:hover", attr:"color"}];
    var noassoc =    //standardized messages if no Coop association
        {name:"Not Connected", //MUser.coops lev: 0
         imgsrc: "img/tsnoassoc.png",
         levtxt:"You are not following this $obtype.",
         uptxt:"Follow for membic notices.",
         upbtn:"Follow",
         cantxt:"",
         canbtn:"",
         rejtxt:"",
         rejbtn:"",
         restxt:"",
         resbtn:"",
         resconf:"",
         notice:"" };
    var ctmmsgs = [  //standardized messages organized by Coop level
        {name:"Following", //MUser.coops lev: -1
         imgsrc: "img/tsfollowing.png",
         levtxt:"Following shows you are interested in reading membics posted to this $obtype.",
         uptxt:"Only members may post.",
         upbtn:"Apply for membership",
         cantxt:"You are applying for membership.",
         canbtn:"Withdraw membership application",
         rejtxt:"Your membership application was rejected.",
         rejbtn:"Ok rejection",
         restxt:"",
         resbtn:"Stop following",
         resconf:"",
         notice:"is applying for membership" },
        {name:"Member",    //MUser.coops lev: 1
         imgsrc: "img/tsmember.png",
         levtxt:"As a member, you may post membics related to this theme.",
         uptxt:"If you would like to help make sure posts are relevant, and help approve new members, you can apply to become a Moderator.",
         upbtn:"Apply to become a Moderator",
         cantxt:"You are applying to become a Moderator.",
         canbtn:"Withdraw Moderator application",
         rejtxt:"Your Moderator application was rejected.",
         rejbtn:"Ok rejection",
         restxt:"If you no longer wish to contribute, you can resign your membership and go back to just following.",
         resbtn:"Resign membership",
         resconf:"Are you sure you want to resign your membership?",
         notice:"is applying to become a Moderator" },
        {name:"Moderator", //MUser.coops lev: 2
         imgsrc: "img/tsmoderator.png",
         levtxt:"As a Moderator, you can post, remove membics that don't belong, and approve membership applications.",
         uptxt:"If you think it would be appropriate for you to be recognized as a permanent co-owner of this cooperative theme, you can apply to become a Founder.",
         upbtn:"Apply to become a Founder",
         cantxt:"You are applying to become a Founder.",
         canbtn:"Withdraw your Founder application",
         rejtxt:"Your Founder application was rejected.",
         rejbtn:"Ok rejection",
         restxt:"If you no longer wish to help moderate, you can resign as a Moderator and go back to being a regular member.",
         resbtn:"Resign as Moderator",
         resconf:"Are you sure you want to resign as moderator?",
         notice:"is applying to become a Founder" },
        {name:"Founder",   //MUser.coops lev: 3
         imgsrc: "img/tsfounder.png",
         levtxt:"As a Founder, you permanently have all privileges available.",
         uptxt:"",
         upbtn:"",
         cantxt:"",
         rejtxt:"",
         rejbtn:"",
         canbtn:"",
         restxt:"If you no longer want ownership, you can resign as a Founder and allow others to continue the cooperative theme.",
         resbtn:"Resign as Founder",
         resconf:"Are you sure you want to resign as Founder?"}];


    function printType () {
        var pt = "theme";
        if(dst.type !== "coop") {
            pt = "profile"; }
        return pt;
    }


    function getDirectLinkInfo (usehashtag) {
        var infobj = {title: "", url: app.hardhome};
        if(dst.type === "profile") {
            infobj.url += "/" + dst.id;
            infobj.title = "Direct profile URL:"; }
        else if(usehashtag && dst.obj && dst.obj.hashtag) {
            infobj.url += "/" + dst.obj.hashtag;
            infobj.title = "Custom direct theme URL:"; }
        else {
            infobj.url += "/" + dst.id;
            infobj.title = "Direct theme URL:"; }
        return infobj;
    }


    function picImgSrc (obj) {
        var defs = dst[dst.type];
        var src = "img/nopicprof.png";
        if(obj[defs.picfield]) {  //e.g. profile.profpic
            //fetch with mild cachebust in case modified
            src = defs.picsrc + jt.instId(obj) +
                "&modified=" + obj.modified; }
        return src;
    }


    function modButtonsHTML () {
        if(app.solopage()) {
            return ""; }
        var html = ["a", {id:"pcdsettingslink", 
                          href:"#" + printType() + "settings",
                          title:printType().capitalize() + " Settings",
                          onclick:jt.fs("app.pcd.settings()")},
                    ["img", {cla:"webjump", src:"img/settings.png"}]];
        if(!app.profile.myProfile()) {  //not loaded yet, return placeholder
            html = ["img", {cla:"webjump", src:"img/settings.png",
                            style:"opacity:0.4;"}]; }
        return jt.tac2html(html);
    }


    function accountInfoHTML () {
        var html = "";
        if(dst.type === "profile") {
            html = ["p", "Last modified " + 
                    jt.colloquialDate(jt.isoString2Day(dst.obj.modified))]; }
        return jt.tac2html(html);
    }


    function isMyMembershipAction (entry) {
        if(entry.targid === app.profile.myProfId() &&
           (entry.action.indexOf("Rejected") >= 0 ||
            entry.action.indexOf("Denied") >= 0 ||
            entry.action.indexOf("Accepted") >= 0 ||
            entry.action.indexOf("Demoted") >= 0)) {
            return true; }
        return false;
    }


    function personalInfoButtonHTML () {
        var les = dst.obj.adminlog;
        var html = "";
        if(les && les.length) {
            les.every(function (action) {
                if(isMyMembershipAction(action)) {
                    html = ["a", {href: "#myloginfo",
                              onclick: jt.fs("app.pcd.toggleCtmDet('mbinfo')")},
                            ["img", {cla: "myinfoimg", src: "img/info.png"}]];
                    return false; } //found my latest, end iteration
                return true; }); }
        return html;
    }


    function membershipButtonLine (msgtxt, buttondivid, buttondeco, 
                                   buttonid, buttonfs, buttontxt) {
        var html;
        html = ["div", {cla: "formline"},
                [["div", {cla: "ctmlevtxt"},
                  msgtxt],
                 ["div", {cla: "formbuttonsdiv", id: buttondivid},
                  [buttondeco,
                   ["button", {type: "button", id: buttonid,
                               onclick: buttonfs},
                    buttontxt]]]]];
        return html;
    }


    function getAssociationMessages(prof, porc) {
        var msgs = null;
        if(porc.obtype === "Coop") {
            var mlev = app.coop.membershipLevel(porc, prof.instid);
            if(mlev) {
                msgs = ctmmsgs[mlev]; } }
        if(!msgs) {  //Use profile cache only if no Coop info
            if(prof.coops[porc.instid]) {  //following
                msgs = ctmmsgs[0]; }
            else {  //no association
                msgs = noassoc; } }
        var cm = {};
        var pt = printType();
        Object.keys(msgs).forEach(function (key) {
            cm[key] = msgs[key].replace(/\$obtype/g, pt); });
        if(prof.coops[porc.instid] && porc.obtype === "MUser") {
            cm.uptxt = "";
            cm.upbtn = ""; }  //no further up levels if following profile
        return cm;
    }


    function membershipSettingsHTML () {
        var msgs = getAssociationMessages(app.profile.myProfile(), dst.obj);
        var seeking = app.coop.isSeeking(dst.obj);
        var rejected = app.coop.isRejected(dst.obj);
        var html = [];
        //show application button if not in application process
        if(msgs.uptxt && !seeking && !rejected) {
            html.push(membershipButtonLine(
                msgs.uptxt, "memappbdiv", personalInfoButtonHTML(),
                "uplevelbutton", jt.fs("app.pcd.ctmmem('apply')"),
                msgs.upbtn)); }
        //show appropriate process button or default downlevel button
        if(rejected) {
            html.push(membershipButtonLine(
                msgs.rejtxt, "memappbdiv", personalInfoButtonHTML(),
                "accrejbutton", jt.fs("app.pcd.ctmmem('accrej')"),
                msgs.rejbtn)); }
        else if(seeking) {
            html.push(membershipButtonLine(
                msgs.cantxt, "memappbdiv", "",
                "withdrawbutton", jt.fs("app.pcd.ctmmem('withdraw')"),
                msgs.canbtn)); }
        //not seeking or rejected, show downlevel/resign button if relevant
        else if(msgs.resbtn) {
            html.push(membershipButtonLine(
                msgs.restxt, "rsbdiv", "",
                "downlevelbutton", jt.fs("app.pcd.ctmdownlev()"),
                msgs.resbtn)); }
        html = [["div", {cla: "formline", style:"text-align:center;"},
                 ["a", {href: "#togglecoopstat",
                        onclick: jt.fs("app.layout.togdisp('ctmstatdetdiv')")},
                  [["img", {src:msgs.imgsrc}],
                   ["span", {id: "memlevspan"},
                    (seeking? "Applying" : msgs.name)]]]],
                ["div", {cla: "formline", id: "ctmstatdetdiv",
                         style: "display:none;"},
                 [["div", {cla: "formline"},
                   msgs.levtxt],
                  html]]];
        return html;
    }


    function membershipAppNoticeHTML (profid, name, mlev) {
        var html;
        html = ["div", {cla: "ctmmemdiv"},
                [["div", {cla: "fpprofdivsp"},
                  ["img", {cla: "fpprofpic",
                           src: "profpic?profileid=" + profid,
                           title: jt.ndq(name),
                           alt: "prof pic"}]],
                 ["a", {href: "view=profile&profid=" + profid,
                        onclick: jt.fs("app.profile.byprofid('" + profid + 
                                       "','membapp')")},
                  ["span", {cla: "proflist"}, name]],
                 "&nbsp;" + ctmmsgs[mlev].notice,
                 ["div", {cla: "formline"}],
                 ["div", {cla: "formline", id: "reasondiv" + profid,
                          style: "display:none;"},
                  [["label", {fo: "reasonin" + profid, cla: "liflab",
                              id: "reasonlab" + profid},
                    "Reason"],
                   ["input", {id: "reasonin" + profid, cla: "lifin",
                              type: "text"}]]],
                 ["div", {cla: "formline inlinebuttonsdiv", 
                          id: "abdiv" + profid},
                  [["button", {type: "button", id: "rejectb" + profid,
                               onclick: jt.fs("app.pcd.memapp('reject" +
                                              "','" + profid + "')")},
                    "Reject"],
                   ["button", {type: "button", id: "acceptb" + profid,
                               onclick: jt.fs("app.pcd.memapp('accept" +
                                              "','" + profid + "')")},
                    "Accept"]]]]];
        return html;
    }


    function outstandingApplicationsHTML () {
        if(!dst.obj.seeking) {
            return ""; }
        var mlev = app.coop.membershipLevel(dst.obj);
        if(mlev < 2) {
            return ""; }
        var html = [];
        var people = dst.obj.people || {};
        dst.obj.seeking.csvarray().forEach(function (profid) {
            var name = people[profid] || profid;
            var slev = app.coop.membershipLevel(dst.obj, profid);
            if(mlev > slev || mlev === 3) {
                html.push(membershipAppNoticeHTML(profid, name, slev)); } });
        return html;
    }


    function adminLogTargetHTML (logentry) {
        var profid;
        if(logentry.action === "Removed Membic") {
            return logentry.tname; }
        if(logentry.action.startsWith("Resigned")) {
            return ""; }
        profid = logentry.targid;
        return ["a", {href: "view=profile&profid=" + profid,
                      onclick: jt.fs("app.profile.byprofid('" + profid + 
                                     "','adminlog')")},
                logentry.tname];
    }


    function coopLogHTML (filter) {
        var les = dst.obj.adminlog;
        if(!les || !les.length) {
            return "No log entries"; }
        les = les.slice(0, 10);  //don't scroll forever
        var html = [];
        les.forEach(function (logentry) {
            var profid;
            if(!filter || (filter === "membership" &&
                           isMyMembershipAction(logentry))) {
                profid = logentry.profid;
                html.push(
                    ["div", {cla: "adminlogentrydiv"},
                     [["span", {cla: "logdatestampspan"}, 
                       logentry.when.slice(0, 10) + ": "],
                      ["a", {href: "view=profile&profid=" + profid,
                             onclick: jt.fs("app.profile.byprofid('" + profid + 
                                            "')")},
                       ["span", {cla: "logdatestampspan"},
                        logentry.pname || profid]],
                      " " + logentry.action + " ",
                      adminLogTargetHTML(logentry),
                      (logentry.reason? ": " + logentry.reason : "")]]); } });
        return jt.tac2html(html);
    }


    function coopMembershipLineHTML (mlev, plev, pid, pname) {
        var icons = ["", "tsmember.png", "tsmoderator.png", "tsfounder.png"];
        var html = [["img", {src:"img/" + icons[plev],
                             alt:icons[plev].slice(2, -4)}],
                    ["img", {cla:"memberlistprofpic", 
                             alt:"prof pic for " + pname,
                             src:"profpic?profileid=" + pid}],
                    ["span", {cla:"memberlistnamespan"}, pname]];
        if(mlev > plev && pid !== app.profile.myProfId()) { //wrap for edit
            html = [["div", {cla:"formline", id:"memlistdiv" + pid},
                     ["a", {href:"#demote", 
                            onclick:jt.fs("app.layout.togdisp('memdemdiv" +
                                          pid + "')")},
                      html]],
                    ["div", {cla:"formline", id:"memdemdiv" + pid,
                             style:"display:none;"},
                     [["label", {fo:"reasonin" + pid, cla:"liflab",
                                  id:"reasonlab" + pid},
                       "Reason"],
                      ["input", {id:"reasonin" + pid, cla:"lifin",
                                  placeholder:"Reason required",
                                  type:"text"}],
                       ["div", {cla:"formline formbuttonsdiv",
                                id:"memdembuttondiv" + pid},
                        ["button", {type:"button", id:"demoteb" + pid,
                                    onclick:jt.fs("app.pcd.memdem('" + 
                                                  pid + "')")},
                         "Demote"]]]]]; }
        else {  //not modifiable, just wrap in plain enclosing div
            html = ["div", {cla:"formline", id:"memlistdiv" + pid}, html]; }
        html = ["div", {cla:"memberlistlinediv"}, html];
        return html;
    }


    function coopMembershipHTML () {
        var mlev = app.coop.membershipLevel(dst.obj);
        var html = [];
        app.coop.memberSummary(dst.obj).forEach(function (sum) {
            html.push(coopMembershipLineHTML(
                mlev, sum.lev, sum.profid, sum.name)); });
        html.push(["div", {cla: "formline"}, ""]); //final clear
        return jt.tac2html(html);
    }


    function statSummaryHTML () {
        var dat = dst.obj.mctr;
        if(!dat) {
            return "No stats available."; }
        var html = ["table", {style:"margin:auto;"},
                    [["tr",
                      [["td", {style:"text-align:right;padding-right:10px;"}, 
                        "Visits Today:"],
                       ["td", 
                        ["em", String((dat.sitev || 0) + (dat.sitek || 0) +
                                      (dat.permv || 0) + (dat.permk || 0) +
                                      (dat.rssv || 0))]]]],
                     ["tr",
                      [["td", {style:"text-align:right;padding-right:10px;"}, 
                        "Membics:"],
                       ["td", ["em", String(dat.membics || 0)]]]],
                     ["tr",
                      [["td", {style:"text-align:right;padding-right:10px;"}, 
                        "Actions:"],
                       ["td", ["em", String((dat.starred || 0) +
                                            (dat.remembered || 0) +
                                            (dat.responded || 0))]]]]]];
        return jt.tac2html(html);
    }


    function statsDisplayHTML () {
        var sumh;
        if(dst.obj.mctr) { 
            sumh = statSummaryHTML(); }
        else {
            sumh = "fetching stats...";
            app.fork({
                descr:"stats data retrieval",
                func:function () {  //fetch after initial display finished
                    var params = app.login.authparams() + "&ctype=" + dst.type +
                        "&parentid=" + dst.id + jt.ts("&cb=", "minute");
                    jt.call("GET", "currstats?" + params, null,
                            function (mctrs) {
                                dst.obj.mctr = mctrs[0];
                                jt.out("statsumdiv", statSummaryHTML()); },
                            app.failf(function (code, errtxt) {
                                jt.out("statsumdiv", "currstats failed " +
                                       code + ": " + errtxt); }),
                            jt.semaphore("pcd.fetchStats")); },
                ms:200}); }
        var vaurl = "docs/stat.html?ctype=" + dst.type + "&parentid=" + dst.id +
            "&" + app.login.authparams() + "&profid=" + app.profile.myProfId() +
            "&title=" + jt.embenc(dst.obj.name);
        jt.log("Visualize All url: " + vaurl);
        var html = ["div", {id: "statsdisplaydiv"},
                    [["div", {id: "statsumdiv"}, sumh],
                     ["div", {cla: "formbuttonsdiv", id: "statsvisbdiv"},
                      ["button", {type:"button", 
                                  onclick:jt.fs("window.open('" + 
                                                vaurl + "')")},
                       "Visualize All"]]]];
        return jt.tac2html(html);
    }


    function adminSettingsHTML () {
        var memsel = "";
        var oah = "";
        if(dst.type === "coop") {
            oah = outstandingApplicationsHTML();
            if(app.coop.membershipLevel(dst.obj) >= 2) {
                memsel = [
                    "a", {href: "#memberinfo",
                          onclick: jt.fs("app.pcd.toggleCtmDet('members')")},
                    ["img", {cla: "ctmsetimg", src: "img/membership.png"}]]; } }
        var signout = "";
        if(dst.type === "profile" && dst.id === app.profile.myProfId()) {
            signout = ["button", {type:"button", 
                                  onclick:jt.fs("app.login.logout()")},
                       "Sign&nbsp;out"]; }
        var html = [["div", {cla: "formline", id: "settingsinfolinediv"},
                     [["div", {id: "ctminfoseldiv"},
                       ["a", {href: "#actioninfo",
                              onclick: jt.fs("app.pcd.toggleCtmDet('info')")},
                        ["img", {cla: "ctmsetimg", src: "img/info.png"}]]],
                      ["div", {id: "meminfoseldiv",
                               style: (memsel? "" : "display:none;")}, 
                       memsel],
                      ["div", {id: "statsdiv"},
                       ["a", {href: "#stats",
                              onclick: jt.fs("app.pcd.toggleCtmDet('stats')")},
                        ["img", {cla: "ctmsetimg", src: "img/stats.png"}]]],
                      signout]],
                    ["div", {cla: "formline"}, oah],
                    ["div", {cla: "formline", id: "midispdiv",
                             style: "display:none;"}]];
        return html;
    }


    function getPicInfo () {
        var pi = {havepic: false, src: "img/nopicprof.png"};
        if(dst.type === "profile") {
            pi.lab = "Upload a profile picture!";
            pi.exp = "An image for your profile helps people identify membics you write. Choose something unique that visually represents you.";
            if(dst.obj.profpic) {
                pi.havepic = true;
                pi.lab = "Change Profile Picture";
                pi.src = picImgSrc(dst.obj); } }
        else if(dst.type === "coop") {
            pi.lab = "Upload a theme logo or picture!";
            pi.exp = "Themes with an image look much better and are easier to find in the theme overview.";
            if(dst.obj.picture) {
                pi.havepic = true;
                pi.lab = "Change Theme Logo or Picture";
                pi.src = picImgSrc(dst.obj); } }
        pi.lab = [pi.lab + " ",
                  ["a", {href: "#WhyPic",
                         onclick: jt.fs("app.toggledivdisp('whypicdiv')")},
                   ["i", "Why?"]]];
        pi.src += jt.ts((pi.src.indexOf("?") >= 0? "&" : "?") + "cb=", 
                        dst.obj.modified);
        return pi;
    }


    function picFileSelChange () {
        var fv = jt.byId("picfilein").value;
        //chrome yields a value like "C:\\fakepath\\circuit.png"
        fv = fv.split("\\").pop();
        jt.out("picfilelab", fv);
        jt.byId("picfilelab").className = "filesellab2";
        jt.byId("upldsub").style.visibility = "visible";
    }


    function picSettingsHTML () {
        if(!jt.hasId(dst.obj) ||  //need an instance to upload image into
           (dst.type === "coop" && app.coop.membershipLevel(dst.obj) < 3) ||
           (dst.type === "profile" && dst.id !== app.profile.myProfId())) {
            return ""; }
        var pinf = getPicInfo();
        var html = [["label", {fo:"picuploadform", cla:"overlab",
                               style:(pinf.havepic? "display:none;" : "")},
                     pinf.lab],
                    ["div", {id:"whypicdiv", cla:"formline", 
                             style:"display:none;"},
                     ["div", {cla:"fieldexpdiv"}, pinf.exp]],
                    ["form", {action:"/picupload", method:"post",
                              enctype:"multipart/form-data", target:"tgif",
                              id:"picuploadform"},
                     [jt.paramsToFormInputs(app.login.authparams()),
                      jt.paramsToFormInputs("picfor=" + dst.type + 
                                            "&instid" + dst.obj.instid),
                      ["div", {cla:"ptddiv"},
                       [["img", {id:"upldpicimg", cla:"profimgdis",
                                 src:pinf.src}],
                        ["div", {id:"upldpicform", cla:"picsideform"},
                         [["div", {cla:"fileindiv"},
                           [["input", {type:"file", cla:"hidefilein",
                                       name:"picfilein", id:"picfilein"}],
                            ["label", {fo:"picfilein", cla:"filesellab",
                                       id:"picfilelab"},
                             "Choose&nbsp;Image"],
                            ["div", {cla:"picsideformbuttonsdiv"},
                             ["input", {type:"submit", cla:"formbutton",
                                        style:"visibility:hidden;",
                                        onclick:jt.fs("app.pcd.upsub()"),
                                        id:"upldsub", value:"Upload"}]]]]]],
                        ["div", {id:"imgupstatdiv", cla:"formstatdiv"}]]]]],
                    ["iframe", {id:"tgif", name:"tgif", src:"/picupload",
                                style:"display:none"}]];
        return html;
    }
    function picSettingsInit () {
        jt.on("picfilein", "change", picFileSelChange);
        app.pcd.monitorPicUpload();
    }


    function descripSettingsHTML () {
        if((dst.type === "coop" && app.coop.membershipLevel(dst.obj) < 3) ||
           (dst.type === "profile" && dst.id !== app.profile.myProfId())) {
            return ""; }
        var nameplace = "Theme name required";
        if(dst.type !== "coop") {
            nameplace = "Set a profile name!"; }
        var nh = ["div", {cla:"formline"},
                  [["label", {fo:"namein", cla:"liflab", id:"namelab"},
                    "Name"],
                   ["input", {id:"namein", cla:"lifin", type:"text",
                              placeholder:nameplace, value:dst.obj.name}]]];
        var ht = ["div", {cla:"formline"},
                  [["label", {fo:"hashin", cla:"liflab", id:"hashlab"},
                    "Hashtag&nbsp;#"],
                   ["input", {id:"hashin", cla:"lifin", type:"text",
                              placeholder:"Easy access and share",
                              value:dst.obj.hashtag}]]];
        var ark = "";
        if(dst.type === "coop") {
            ark = ["div", {cla:"formline"},
                   [["input", {type:"checkbox", id:"arkcb", value:"archived",
                               checked:jt.toru(
                                   app.coop.hasFlag(dst.obj,"archived"))}],
                    ["label", {fo:"arkcb"}, "Archive (no further posts)"]]]; }
        var btxt = "Create Theme";
        if(jt.hasId(dst.obj)) {
            btxt = "Update Description"; }
        var html = [nh,
                    //textarea label conflicts visually with placeholder
                    //text when empty.  Removed to reduce visual clutter.
                    ["textarea", {id:"shouteditbox", cla:"dlgta"}],
                    ht,
                    ark,
                    ["div", {id:"formstatdiv"}],
                    ["div", {cla:"dlgbuttonsdiv"},
                     ["button", {type:"button", id:"okbutton",
                                 onclick:jt.fs("app.pcd.saveDescription()")},
                      btxt]]];
        return html;
    }
    function descripSettingsInit () {
        var defs = dst[dst.type];
        var shout = jt.byId("shouteditbox");
        if(shout) {
            shout.readOnly = false;
            shout.value = dst.obj[defs.descfield];
            shout.placeholder = defs.descplace; }
        //set the focus only if not already filled in
        var namein = jt.byId("namein");
        if(namein && !namein.value) {
            namein.focus(); }
        else if(shout && !shout.value) {
            shout.focus(); }
    }


    function personalSettingsHTML () {
        if(dst.type !== "profile" || dst.id !== app.profile.myProfId()) {
            return ""; }
        var html = ["div", {cla:"formline"},
                    [["a", {href:"#togglepersonalinfo",
                            onclick:jt.fs("app.layout.togdisp('profpidiv')")},
                      [["img", {cla:"ctmsetimg", src:"img/personinfo.png"}],
                       ["span", {cla:"settingsexpandlinkspan"},
                        "Personal Info"]]],
                     ["div", {cla:"formline", id:"profpidiv",
                              style:"display:none;"},
                      app.login.accountSettingsHTML()]]];
        return html;
    }


    function reviewTypeKeywordsHTML (prof) {
        var html = [];
        app.profile.verifyStashKeywords(prof);
        var kwu = app.profile.getKeywordUse(prof);
        app.review.getReviewTypes().forEach(function (rt) {
            html.push(
                ["div", {cla:"rtkwdiv", id:"rtkwdiv" + rt.type},
                 [["div", {cla:"formline"},
                   [["img", {cla:"reviewbadge", src:"img/" + rt.img}],
                    ["input", {id:"kwcsvin" + rt.type, cla:"keydefin", 
                               type:"text", placeholder:"Checkbox keywords",
                               value:prof.stash.keywords[rt.type]}]]],
                  ["div", {cla:"formline"},
                   ["span", {cla:"kwcsvspan"},
                    [["span", {cla:"kwcsvlabel"}, "Recent:"],
                     jt.spacedCSV(kwu.recent[rt.type])]]],
                  ["div", {cla:"formline"},
                   ["span", {cla:"kwcsvspan"},
                    [["span", {cla:"kwcsvlabel"}, "Default:"],
                     jt.spacedCSV(kwu.system[rt.type])]]]]]); });
        return html;
    }


    function themeKeywordsHTML () {
        var html;
        html = ["div", {cla:"rtkwdiv", id:"themekwdiv"},
                ["div", {cla:"formline"},
                 [["img", {cla:"reviewbadge", src:picImgSrc(dst.obj)}],
                  ["input", {id:"kwcsvin", cla:"keydefin",
                             type:"text", 
                             placeholder:"keywords separated by commas",
                             value:dst.obj.keywords}]]]];
        return html;
    }


    function keywordSettingsHTML () {
        var label = "";
        var html = "";
        switch(dst.type) {
        case "profile": 
            if(dst.id !== app.profile.myProfId()) {
                return ""; }
            label = "Checkbox Keywords";
            html = reviewTypeKeywordsHTML(dst.obj);
            break;
        case "coop": 
            if(!jt.hasId(dst.obj) || app.coop.membershipLevel(dst.obj) < 2) {
                return ""; }
            label = "Theme Keywords";
            html = themeKeywordsHTML();
            break;
        default: return ""; }
        html = ["div", {cla:"formline"},
                [["a", {href:"#togglecustomkeywords",
                        onclick:jt.fs("app.layout.togdisp('profkwdsdiv')")},
                  [["img", {cla:"ctmsetimg", src:"img/checkbox.png"}],
                   ["span", {cla:"settingsexpandlinkspan"},
                    label]]],
                 ["div", {cla:"formline", id:"profkwdsdiv",
                          style:"display:none;"},
                  [html,
                   ["div", {cla:"dlgbuttonsdiv"},
                    ["button", {type:"button", id:"updatekwdsdiv",
                                onclick:jt.fs("app.pcd.updateKeywords()")},
                     "Update Keywords"]]]]]];
        return html;
    }


    function mailinSettingsHTML () {
        if(dst.type !== "profile" || dst.id !== app.profile.myProfId() ||
           !jt.hasId(dst.obj)) {
            return ""; }  //mail-in support for themes not supported yet
        dst.obj.stash = dst.obj.stash || {};
        dst.obj.stash.mailins = dst.obj.stash.mailins || "";
        var stash = dst.obj.stash;
        var subj = "Membic Title or URL or Description";
        var body = "Membic URL and/or Description";
        var mh = "mailto:membic@membicsys.appspotmail.com?subject=" + 
            jt.dquotenc(subj) + "&body=" + jt.dquotenc(body);
        var html = ["div", {cla:"formline"},
                    [["a", {href:"#togglemailinsettings",
                            onclick:jt.fs("app.layout.togdisp('mailinsdiv')")},
                      [["img", {cla:"ctmsetimg", src:"img/emailbw22.png"}],
                       ["span", {cla:"settingsexpandlinkspan"},
                        "Mail-In Membics"]]],
                     ["div", {cla:"formline", id:"mailinsdiv",
                              style:"display:none;"},
                      ["div", {cla:"rtkwdiv", id:"mailinaccsdiv"},
                       [["div", {cla:"formline"},
                         ["Authorized ",
                          ["a", {href:mh}, "mail-in membic "],
                          "addresses (comma separated)"]],
                        ["div", {cla:"formline"},
                         ["input", {id:"emaddrin", cla:"keydefin", type:"text",
                                    placeholder:"myaccount@example.com",
                                    value:stash.mailins}]],
                        ["div", {cla:"dlgbuttonsdiv"},
                         ["button", {type:"button", id:"updatemiab",
                                     onclick:jt.fs("app.pcd.updateMailins()")},
                          "Update Mail-Ins"]]]]]]];
        return html;
    }


    function rssSettingsHTML () {
        if(!jt.hasId(dst.obj) ||  //need an instid for rss url
           (dst.type === "coop" && app.coop.membershipLevel(dst.obj) < 3) ||
           (dst.type === "profile" && dst.id !== app.profile.myProfId())) {
            return ""; }
        var html = ["div", {cla:"formline"},
                    [["a", {href:"#rss", 
                            onclick:jt.fs("app.pcd.rssHelp()")},
                      [["img", {cla:"ctmsetimg", src:"img/rssicon.png"}],
                       ["span", {cla:"settingsexpandlinkspan"},
                        "RSS Feed"]]]]];
        return html;
    }
    function fillRSSDialogAreas () {
        var furl = window.location.href;
        if(furl.endsWith("/")) {
            furl = furl.slice(0, -1); }
        furl += "/rssfeed?" + dst.type + "=" + jt.instId(dst.obj) +
            "&ts=st&ds=dvrk";
        var ta = jt.byId("rsslinkta");
        if(ta) {
            ta.readOnly = true;
            ta.value = furl; }
    }


    function soloSettingsHTML () {
        if(dst.type !== "coop" || !jt.hasId(dst.obj) || 
               app.coop.membershipLevel(dst.obj) < 3) {
            return ""; }
        dst.obj.soloset = dst.obj.soloset || {};
        if(!dst.obj.soloset.colors || Array.isArray(dst.obj.soloset.colors)) {
            dst.obj.soloset.colors = {};
            standardOverrideColors.forEach(function (soc) {
                dst.obj.soloset.colors[soc.name] = soc.value; }); }
        var html = [];
        standardOverrideColors.forEach(function (soc) {
            var colorval = dst.obj.soloset.colors[soc.name] || soc.value;
            html.push(["div", {cla:"formline"},
                       [["label", {fo:soc.name + "in", cla:"liflab"},
                         soc.name],
                        ["input", {id:soc.name + "in", cla:"lifin",
                                   type:"color", value:colorval}]]]); });
        html = ["div", {cla:"formline"},
                [["a", {href:"#togglepermcolors",
                        onclick:jt.fs("app.layout.togdisp('ctmcolordiv')")},
                  [["img", {cla:"ctmsetimg", src:"img/colors.png"}],
                   ["span", {cla:"settingsexpandlinkspan"},
                    "Permalink Page Colors"]]],
                 ["div", {cla:"formline", id:"ctmcolordiv",
                          style:"display:none;"},
                  [html,
                   ["div", {cla:"dlgbuttonsdiv"},
                    ["button", {type:"button", id:"savecolorsbutton",
                                onclick:jt.fs("app.pcd.saveSoloColors()")},
                     "Update Colors"]],
                   ["div", {cla:"formline", id:"colorupderrdiv"}]]]]];
        return html;
    }


    function embedSettingsHTML () {
        if(!jt.hasId(dst.obj)) {
            return ""; }
        var html = ["div", {cla:"formline"},
                    [["a", {href:"#embed", 
                            onclick:jt.fs("app.pcd.embedHelp()")},
                      [["img", {cla:"ctmsetimg", src:"img/embed.png"}],
                       ["span", {cla:"settingsexpandlinkspan"},
                        "Embed Feed"]]]]];
        return html;
    }
    function fillEmbedDialogAreas () {
        var site = window.location.href;
        if(site.endsWith("/")) {
            site = site.slice(0, -1); }
        var ta = jt.byId("embdlta");
        if(ta) {
            ta.readOnly = true;
            ta.value = getDirectLinkInfo().url; }
        ta = jt.byId("embifta");
        if(ta) {
            ta.readOnly = true;
            ta.value = "<iframe id=\"membiciframe\" src=\"" + app.hardhome +
                "/" + dst.id + "?site=EXAMPLE.COM\" " +
                "style=\"position:relative;height:100%;width:100%\" " +
                "seamless=\"seamless\" frameborder=\"0\"/></iframe>"; }
        ta = jt.byId("embwpta");
        if(ta) {
            ta.readOnly = true;
            ta.value = site + "/rssfeed?" + dst.type + "=" + 
                jt.instId(dst.obj); }
    }


    function historyCheckpoint () {
        var histrec = { view: dst.type };
        if(dst.type === "coop" && !dst.id) {
            //don't push a theme history with no id. Can't restore it.
            return; }
        histrec[dst.type + "id"] = dst.id;
        app.history.checkpoint(histrec);
    }


    function isKeywordMatch (membic) {
        if(!srchst.kwrds) {  //not filtering by keyword
            return true; }
        //if the membic keywords include at least one of the specified
        //search keywords then it's a match.
        return srchst.kwrds.csvarray().some(function (keyword) {
            return (membic.keywords &&   //in case null rather than ""
                    membic.keywords.csvcontains(keyword)); });
    }


    function isTypeMatch (membic) {
        if(!srchst.mtypes) {  //not filtering by type
            return true; }
        if(srchst.mtypes.csvcontains(membic.revtype)) {
            return true; }
        return false;
    }


    function isQueryStringMatch (membic) {
        if(!srchst.qstr) {  //not filtering by text search
            return true; }
        var revtxt = membic.text || "";
        revtxt = revtxt.toLowerCase();
        var toks = srchst.qstr.toLowerCase().split(/\s+/);
        //if the membic text includes each of the search words regardless of
        //ordering, then it's a match.
        return toks.every(function (token) {
            return revtxt.indexOf(token) >= 0; });
    }


    function isSearchableMembic (obj) {
        if(!obj.revtype) {  //could be an overflow indicator
            return false; }
        if(dst.type === "coop" && obj.ctmid !== dst.obj.instid) {  //src ref
            return false; }
        return true;
    }


    function searchFilterReviews (membics) {
        var filtered = [];
        membics.forEach(function (membic) {
            if(isSearchableMembic(membic) && 
               isKeywordMatch(membic) &&
               isTypeMatch(membic) &&
               isQueryStringMatch(membic)) {
                filtered.push(membic); } });
        return filtered;
    }


    function updateResultsEmailLink (sortedRevs) {
        var eml = jt.byId("emaillink");
        if(!eml) {
            return; }
        var subj = "Selected links from " + dst.obj.name;
        var body = "Here are some links from " + dst.obj.name + ".\n" +
            "To select links yourself, go to https://membic.org/" +
            dst.obj.instid;
        sortedRevs.forEach(function (rev) {
            body += "\n\n" + rev.url + "\n" + (rev.title || rev.name) + "\n" +
                rev.text; });
        var link = "mailto:?subject=" + jt.dquotenc(subj) + "&body=" +
            jt.dquotenc(body);
        eml.href = link;
    }


    function displaySearchResults () {
        var sortedRevs = srchst.revs;
        if(srchst.mode === "srchkey") {
            sortedRevs = srchst.revs.slice();  //copy recency ordered array
            sortedRevs.sort(function (a, b) {
                if(a.rating > b.rating) { return -1; }
                if(a.rating < b.rating) { return 1; }
                if(a.modified > b.modified) { return -1; }
                if(a.modified < b.modified) { return 1; }
                return 0; }); }
        var includeAuthorsInRevs = (dst.type === "coop");
        app.review.displayReviews("pcdsrchdispdiv", "pcds", sortedRevs, 
                                  "app.pcd.toggleRevExpansion",
                                  includeAuthorsInRevs);
        updateResultsEmailLink(sortedRevs);
        srchst.disprevs = sortedRevs;
        srchst.status = "waiting";
    }


    function createStyleOverridesForEmbedding () {
        jt.byId("pcduppercontentdiv").style.display = "none";
        jt.byId("bodyid").style.paddingLeft = "0px";
        jt.byId("bodyid").style.paddingRight = "0px";
    }


    function createColorOverrides () {
        var sheet;
        if(!app.embedded) {
            return; }
        if(!dst || !dst.obj || !dst.obj.soloset || !dst.obj.soloset.colors) {
            return; }
        sheet = window.document.styleSheets[0];
        standardOverrideColors.forEach(function (soc) {
            var color = dst.obj.soloset.colors[soc.name];
            if(color) {
                soc.sel.csvarray().forEach(function (sel) {
                    var rule = sel + " { " + soc.attr + ": " + color + "; }";
                    sheet.insertRule(rule, sheet.cssRules.length); }); } });
    }


    function changeSiteTabIcon () {
        var link = document.createElement("link");
        link.type = "image/x-icon";
        link.rel = "shortcut icon";
        link.href = "ctmpic?" + dst.type + "id=" + dst.id;
        document.getElementsByTagName("head")[0].appendChild(link);
    }


    function customizeSoloPageDisplay () {
        if(app.embedded) {
            createStyleOverridesForEmbedding(); }
        createColorOverrides();
        changeSiteTabIcon();
    }


    function shareButtonsAndRSS () {
        var rssurl = app.hardhome + "/rssfeed?" + dst.type + "=" + dst.id;
        var tac = app.layout.shareButtonsTAC(
            {url:app.secsvr + "/" + dst.obj.instid,
             title:dst.obj.name,
             socmed:["tw", "fb"]});
        tac.push(["a", {href:rssurl,  //support right click to copy link
                        cla:"resp-sharing-button__link",
                        id:"rsslink", title:"RSS feed",
                        onclick:jt.fs("app.pcd.rssHelp('standalone')")},
                  ["div", {cla:"resp-sharing-button" + 
                           " resp-sharing-button--small" +
                           " resp-sharing-button--rss"},
                   ["div", {cla:"resp-sharing-button__icon" + 
                            " resp-sharing-button__icon--solid",
                           "aria-hidden":"true"},
                    ["img", {src:"img/rssicon.png"}]]]]);
        return tac;
    }


    function writeTopContent (defs, obj) {
        var shtxt = obj[defs.descfield] || "";
        var fsz = "large";
        if(shtxt.length > 300) {
            fsz = "medium"; }
        var html = ["div", {id:"pcdouterdiv"},
                    [["div", {id:"pcduppercontentdiv"},
                      [["div", {id:"pcdpicdiv"},
                        ["img", {cla:"pcdpic", src:picImgSrc(obj)}]],
                       ["div", {id:"pcddescrdiv"},
                        [["div", {id:"pcdnamediv"},
                          ["span", {id:"pcdnamespan", cla:"penfont"},
                           obj.name || obj.instid]],
                         ["div", {id:"ppcdshoutdiv"},
                          ["span", {cla:"shoutspan",
                                    style:"font-size:" + fsz + ";"}, 
                           jt.linkify(shtxt)]]]]]],
                     ["div", {id:"pcdctrldiv"},
                      ["div", {id:"pcdactdiv"}]],
                     ["div", {id:"pcdnotidiv"}],
                     ["div", {id:"pcdcontdiv"}]]];
        jt.out("contentdiv", jt.tac2html(html));
    }


    function showContentControls () {
        var html = [
            ["div", {id:"pcdactcontentdiv"}, 
             [["div", {id:"pcdacsharediv"},
               [["a", {href: "/" + dst.id, title:"Share",
                       onclick: jt.fs("app.pcd.togshare()")},
                 ["span", {id:"namearrowspan", cla:"penbutton"},
                  ["img", {id:"pnarw", cla:"webjump", 
                           src:"img/sharemenu.png"}]]],
                ["span", {cla:"penbutton"},
                 modButtonsHTML()]]],
              ["div", {id:"pcdacsrchdiv"},
               [["a", {href:"#search", title:"Search Membics",
                       onclick:jt.fs("app.pcd.searchReviews()")},
                 ["img", {src:"img/search.png", cla:"webjump"}]],
                ["input", {type:"text", id:"pcdsrchin", size:26,
                           placeholder: "Text search...",
                           value: srchst.qstr,
                           onchange:jt.fs("app.pcd.searchReviews()")}]]],
              ["div", {id:"pcdacemdiv"},
               ["a", {id:"emaillink", href:"#filledInByMembicsDisplay"},
                ["img", {src:"img/emailbw22.png"}]]]]],
            ["div", {id:"pcdsharediv", style:"display:none;"}, 
             shareButtonsAndRSS()],
            ["div", {id:"pcdkeysrchdiv"}],
            ["div", {id:"pcdtypesrchdiv"}]];
        jt.out("pcdactdiv", jt.tac2html(html));
        html = [["div", {id:"pcdsrchdispdiv"}],
                ["div", {id:"pcdovermorediv"}]];
        jt.out("pcdcontdiv", jt.tac2html(html));
    }
        

    function initializeSearchState () {
        srchst.status = "initializing";
        srchst.mtypes = "";
        srchst.kwrds = "";
        srchst.qstr = "";
        srchst.revs = [];
        srchst.disprevs = [];
    }


    function resetDisplayStateFromObject (obj) {
        if(typeof(obj.preb) === "object" && !obj.preb.length) {
            //just in case preb had a bad value like {}
            obj.preb = []; }
        jt.log("resetDisplayStateFromObject " + obj.obtype + 
               " id:" + obj.instid + " name:" + obj.name);
        dst.obj = obj;
        dst.mtypes = "";
        dst.keywords = "";
    }


    function findKeywordsFromMembics () {
        var keys = "";
        dst.obj.preb.forEach(function (membic) {
            //keywords are filtered based on type selections
            if(isSearchableMembic(membic) && isTypeMatch(membic)) {
                var keywords = membic.keywords || "";
                keywords.csvarray().forEach(function (key) {
                    key = key.trim();
                    if(!keys.csvcontains(key)) {
                        keys = keys.csvappend(key); } }); } });
        return keys;
    }


    function updateKeywordsSelectionArea () {
        dst.keywords = findKeywordsFromMembics();
        // if(!dst.keywords) {
        //     jt.byId("pcdkeysrchdiv").style.display = "none";
        //     return; }
        var html = [];
        dst.keywords.csvarray().forEach(function (kwd, i) {
            var chk = jt.toru(srchst.kwrds.indexOf(kwd) >= 0, "checked");
            html.push(["div", {cla: "srchkwrbdiv"},
                       [["div", {cla: "skbidiv"},
                         ["input", {type: "checkbox", id: "skw" + i,
                                    name: "srchkwds", value: kwd, 
                                    checked: chk,
                                    onclick: jt.fsd("app.pcd.keysrch()")}]],
                        ["label", {fo: "skw" + i}, kwd.trim()]]]); });
        jt.out("pcdkeysrchdiv", jt.tac2html(html));
    }


    function findTypesFromMembics () {
        var types = "";
        dst.obj.preb.forEach(function (membic) {
            //types are filtered based on keyword selections
            if(isSearchableMembic(membic) && isKeywordMatch(membic) &&
               !types.csvcontains(membic.revtype)) {
                types = types.csvappend(membic.revtype); } });
        return types;
    }


    function updateTypesSelectionArea () {
        dst.mtypes = findTypesFromMembics();
        // if(dst.mtypes.csvarray().length < 2) {
        //     jt.byId("pcdtypesrchdiv").style.display = "none";
        //     return; }
        var html = [];
        dst.mtypes.csvarray().forEach(function (mt, i) {
            var chk = jt.toru(srchst.mtypes.csvcontains(mt), "checked");
            html.push(["div", {cla:"srchkwrbdiv"},
                       [["div", {cla:"skbidiv"},
                         ["input", {type:"checkbox", id:"smt" + i,
                                    name:"srchtypes", value:mt,
                                    checked:chk,
                                    onclick:jt.fsd("app.pcd.typesrch()")}]],
                        ["label", {fo:"smt" + i}, mt.capitalize()]]]); });
        jt.out("pcdtypesrchdiv", jt.tac2html(html));
    }


    function displayObject (obj, command) {
        obj = obj || dst.obj;
        resetDisplayStateFromObject(obj);
        app.layout.cancelOverlay();  //close user menu if open
        app.layout.closeDialog();    //close search dialog if open
        historyCheckpoint();
        initializeSearchState();
        var defs = dst[dst.type];
        writeTopContent(defs, obj);
        if(app.solopage()) {
            customizeSoloPageDisplay(); }
        if(!jt.hasId(dst.obj)) {  //creating a new theme
            jt.out("pcdcontdiv", "Settings required.");
            return app.pcd.settings(); }
        if(dst.type === "coop" && dst.obj.instid) {
            app.profile.verifyMembership(dst.obj); }
        showContentControls();
        updateKeywordsSelectionArea();
        updateTypesSelectionArea();
        app.pcd.showNotices();
        app.pcd.searchReviews();
        if(command === "Settings") {
            app.pcd.settings(); }
        //To show relevant notices for the theme, or do anything personal
        //with it, the profile needs to be available.  Fault in if needed
        if(!app.solopage() && app.login.isLoggedIn() && 
           !app.profile.myProfile()) {
            //This has to be significantly delayed or the browser thinks it
            //should skip loading pics and otherwise finishing the display.
            app.fork({descr:"pcd displayObject call profile.fetchProfile",
                      ms:1800,
                      func:function () {
                          app.profile.fetchProfile(function () {
                              displayObject(dst.obj); }); }}); }
    }


    function verifyFunctionConnections () {
        if(!dst.profile.objupdate) {
            dst.profile.objupdate = app.profile.update;
            dst.coop.objupdate = app.coop.updateCoop; }
    }


    function addNotice (notice) {
        jt.log("addNotice " + notice.text);
        var imgsrc = "img/info.png";
        switch(notice.type) {
            case "settings": imgsrc = "img/settings.png"; break; }
        var ndiv = document.createElement("div");
        ndiv.className = "noticediv";
        ndiv.id = notice.id;
        ndiv.innerHTML = jt.tac2html([
            ["div", {cla:"notimgdiv"},
             ["a", {href:"#" + notice.id, onclick:notice.fstr,
                    title:notice.text},
              ["img", {cla:"noticeimg", src:imgsrc}]]],
            ["div", {cla:"noticetxtdiv"},
             ["a", {href:"#" + notice.id, onclick:notice.fstr},
              notice.text]]]);
        jt.byId("pcdnotidiv").appendChild(ndiv);
    }


    function showThemeNotices(prof, lev, coop) {
        jt.log("showThemeNotices not implemented yet.");
    }


    function showProfileNotices(prof) {
        if(!prof.name) {
            addNotice({type:"settings", id:"profileName",
                       text:"Set your Profile name...",
                       fstr:jt.fs("app.pcd.settings()")}); }
        if(!prof.profpic) {
            addNotice({type:"settings", id:"profilePic",
                       text:"Upload a profile pic for visual authorship.",
                       fstr:jt.fs("app.pcd.settings()")}); }
    }


    function indicateAndHandleOverflow () {
        var preb = dst.obj.preb;
        if(!preb.length || !preb[preb.length - 1].overflow) {
            return jt.out("pcdovermorediv", ""); }
        //indicate that the current display is missing overflowed info
        //and they can click to get more
        jt.out("pcdovermorediv", jt.tac2html(
            ["a", {href:"#more",
                   onclick:jt.fs("app.pcd.searchReviews()")},
             "More..."]));
        //fetch one more level of overflow so it will be available next time
        //dst.obj.preb is copied/filtered/sorted before display, so generally
        //no timing conflict updating preb here after fetch.
        jt.call("GET", "ovrfbyid?overid=" + preb[preb.length].overflow, null,
                function (overs) {
                    dst.obj.preb = preb.slice(0, -1).concat(overs[0].preb); },
                app.failf(function (code, errtxt) {
                    jt.out("pcdovermorediv", "ovrfbyid " +
                           preb[preb.length - 1].overflow + " " + code + " " +
                           errtxt); }),
                jt.semaphore("pcd.indicateAndHandleOverflow"));
    }


    ////////////////////////////////////////
    // published functions
    ////////////////////////////////////////
return {

    settings: function (obj) {
        if(obj) {
            dst.obj = obj; }
        var html = [
            "div", {id: "pcdsettingsdlgdiv"},
            [["div", {cla: "bumpedupwards"},
              ["div", {cla: "headingtxt"}, "Settings"]],
             ["div", {cla: "pcdsectiondiv"},
              adminSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              membershipSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              picSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              descripSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              personalSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              keywordSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              mailinSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              soloSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              rssSettingsHTML()],
             ["div", {cla: "pcdsectiondiv"},
              embedSettingsHTML()]]];
        app.layout.openOverlay({x:10, y:80}, jt.tac2html(html), null,
                               function () {
                                   app.login.accountSettingsInit();
                                   picSettingsInit();
                                   descripSettingsInit(); },
                               jt.hasId(dst.obj)? "" : 
                                   jt.fs("app.pcd.cancelThemeCreate()"));
    },


    upsub: function () {
        var upldbutton = jt.byId("upldsub");
        upldbutton.disabled = true;
        upldbutton.value = "Uploading...";
        jt.byId("picuploadform").submit();
    },


    //There are lots of RSS feed plugins for WordPress, including at least
    //one that will copy the content into the page.
    rssHelp: function (standalone) {
        var sampreader = "https://feedly.com";  //sample RSS reader
        var samphub = "https://hootsuite.com";  //sample social media hub
        var html = [
            //title
            ["div", {id: "pcdembeddlgdiv"},
             [["div", {cla: "bumpedupwards"},
               ["div", {cla: "headingtxt"}, 
                printType().capitalize() + " Feed"]]]],
            //rss link text area
            ["div", {cla: "pcdsectiondiv"},
             [["span", {cla: "setpldlgmspan"}, "RSS feed"],
                       " (for ",
              ["a", {href: "#sampleRSSReader",
                     onclick: jt.fs("window.open('" + sampreader + "')")},
               "RSS reader"],
              ", site feed plugin, or ",
              ["a", {href: "#socialMediaHub",
                     onclick: jt.fs("window.open('" + samphub + "')")},
               "social media hub"],
              ")",
              ["div", {cla: "setplustdiv"},
               ["textarea", {id: "rsslinkta", cla: "setpldlgta", rows: 4}]]]],
            //custom param description.  Anyone who wants to know if https
            //is available will already know enough to just try it.
            ["div", {cla: "pcdsectiondiv"},
             ["You can customize the title summary <em>ts</em> and detail summary <em>ds</em> values:",
              ["ul",
               [["li", "<b>t</b>: title or name"],
                ["li", "<b>s</b>: stars (as asterisks)"],
                ["li", "<b>d</b>: why memorable"],
                ["li", "<b>r</b>: membic type (e.g. \"book\")"],
                ["li", "<b>k</b>: keywords"],
                ["li", "<b>v</b>: vertical bar delimiter"]]]]]];
        if(!standalone) {
            //back link to return to settings
            html.push(["div", {cla: "pcdsectiondiv"},
                      ["a", {href: "#settings",
                             onclick: jt.fs("app.pcd.settings()")},
                       [["img", {src: "img/arrow18left.png"}],
                        " Return to Settings"]]]); }
        app.layout.openOverlay({x:10, y:80}, jt.tac2html(html), null,
                               function () {
                                   fillRSSDialogAreas(); });
    },


    embedHelp: function () {
        var html = [
            //title
            ["div", {id: "pcdembeddlgdiv"},
             [["div", {cla: "bumpedupwards"},
               ["div", {cla: "headingtxt"},
                "Embed " + printType().capitalize()]]]],
            //iframe text area
            ["div", {cla: "pcdsectiondiv"},
             [["span", {cla: "setpldlgmspan"}, "Embed iframe"],
              " (replace EXAMPLE.COM with your domain)",
              ["div", {cla: "embdlgline"},
               ["textarea", {id: "embifta", cla: "setpldlgta", rows: 5}]]]],
            //Standalone URL text area
            ["div", {cla: "pcdsectiondiv"},
             [["span", {cla: "setpldlgmspan"}, "Standalone URL"],
              " (for use with your own custom domain)",
              ["div", {cla: "embdlgline"},
               ["textarea", {id: "embdlta", cla: "setpldlgta"}]]]],
            //use RSS feed for syndicated content wordpress and such
            ["div", {cla: "pcdsectiondiv"},
             ["If your site does not support frames, try including your " +
              "syndicated content via ",
              ["a", {href:"#RSS", onclick:jt.fs("app.pcd.rssHelp()")},
               "RSS"]]],
            //back link to return to settings
            ["div", {cla: "pcdsectiondiv"},
             ["a", {href: "#settings",
                    onclick: jt.fs("app.pcd.settings()")},
              [["img", {src: "img/arrow18left.png"}],
               " Return to Settings"]]]];
        app.layout.openOverlay({x:10, y:80}, jt.tac2html(html), null,
                               function () {
                                   fillEmbedDialogAreas(); });
    },


    saveDescription: function () {
        var changed = false; var val;
        jt.byId("okbutton").disabled = true;
        var defs = dst[dst.type];
        var elem = jt.byId("namein");
        if(elem) {  //can be changed back to "" so read even if no value
            changed = jt.changeSet(dst.obj, "name", jt.trimval(elem.value)) ||
                changed; }
        elem = jt.byId("shouteditbox");
        if(elem) {
            changed = jt.changeSet(dst.obj, defs.descfield, elem.value) ||
                changed; }
        elem = jt.byId("hashin");
        if(elem) {
            val = jt.trimval(elem.value);
            if(val.indexOf("#") === 0) {
                val = val.slice(1); }
            changed = jt.changeSet(dst.obj, "hashtag", val) || changed; }
        elem = jt.byId("arkcb");
        if(elem) {
            val = "";
            if(elem.checked) {
                val = new Date().toISOString(); }
            if((app.coop.hasFlag(dst.obj, "archived") && !val) ||
               (!app.coop.hasFlag(dst.obj, "archived") && val)) {
                changed = true; }
            app.coop.setFlag(dst.obj, "archived", val); }
        if(!changed) {
            return app.layout.cancelOverlay(); }
        if(changed) {  //update functions handle cache and bookkeeping
            defs.objupdate(dst.obj,
                           function (updobj) {
                               dst.obj = updobj;
                               app.layout.cancelOverlay();
                               app.pcd.redisplay(); },
                           function (code, errtxt) {
                               jt.byId("okbutton").disabled = false;
                               jt.out("formstatdiv", 
                                      jt.errhtml("Update", code, errtxt)); }); }
    },


    updateKeywords: function () {
        var val;
        if(dst.type === "profile") {
            app.review.getReviewTypes().forEach(function (rt) {
                val = jt.byId("kwcsvin" + rt.type).value;
                dst.obj.stash.keywords[rt.type] = val; });
            app.profile.update(dst.obj, app.pcd.redisplay, app.failf); }
        else if(dst.type === "coop") {
            val = jt.byId("kwcsvin").value;
            dst.obj.keywords = val;
            app.coop.updateCoop(dst.obj, app.pcd.redisplay, app.failf); }
    },


    updateMailins: function () {
        dst.obj.stash.mailins = jt.byId("emaddrin").value;
        app.profile.update(dst.obj, app.pcd.redisplay, app.failf);
    },


    monitorPicUpload: function () {
        var mtag = "Done: ";
        var tgif = jt.byId("tgif");
        if(tgif) {
            var txt = tgif.contentDocument || tgif.contentWindow.document;
            if(txt && txt.body) {
                txt = txt.body.innerHTML;
                if(txt.indexOf(mtag) === 0) {
                    var defs = dst[dst.type];
                    dst.obj[defs.picfield] = dst.id;
                    dst.obj.modified = txt.slice(mtag.length);
                    app.pcd.display(dst.type, dst.id);
                    return; }
                if(txt && txt.trim() && txt.trim() !== "Ready") {
                    jt.out("imgupstatdiv", txt); } }
            app.fork({descr:"monitor pic upload",
                      func:app.pcd.monitorPicUpload,
                      ms:800}); }
    },


    saveSoloColors: function () {
        var defs = dst[dst.type];
        jt.byId("savecolorsbutton").disabled = true;
        standardOverrideColors.forEach(function (soc) {
            var color = jt.byId(soc.name + "in").value;
            dst.obj.soloset.colors[soc.name] = color; });
        defs.objupdate(dst.obj,
            function (updobj) {
                dst.obj = updobj;
                app.layout.cancelOverlay();
                app.pcd.display(dst.type, dst.id); },
            function (code, errtxt) {
                jt.byId("savecolorsbutton").disabled = false;
                jt.out("colorupderrdiv", "Update failed code " + code +
                       ": " + errtxt); });
    },


    ctmmem: function (action) {
        if(action === "apply") {
            if(!app.profile.following(dst.id)) {
                jt.out("memappbdiv", "Following");
                return app.profile.follow(dst.obj, function () {
                    app.pcd.settings(dst.obj); }); }
            jt.out("memappbdiv", "Applying..."); }
        else if(action === "withdraw") {
            jt.out("memappbdiv", "Withdrawing..."); }
        else if(action === "accrej") {
            jt.out("memappbdiv", "Acknowledging..."); }
        app.coop.applyForMembership(dst.obj, action, app.pcd.settings);
    },


    ctmdownlev: function () {
        if(!jt.hasId(dst.obj)) {  //creating new coop and not instantiated yet
            app.layout.cancelOverlay();
            return app.pcd.display("coop"); }
        var mlev = app.coop.membershipLevel(dst.obj);
        var confmsg = ctmmsgs[mlev].resconf;
        if(confmsg && !confirm(confmsg)) {
            return; }
        if(mlev > 0) {
            jt.out("rsbdiv", "Resigning");
            app.coop.processMembership(dst.obj, "demote", 
                                       app.profile.myProfId(),
                                       "", app.pcd.settings); }
        else {
            jt.out("rsbdiv", "Disconnecting");
            app.profile.unfollow(dst.obj, function () {
                app.pcd.settings(dst.obj); }); }
    },


    togshare: function () {
        var sharediv = jt.byId("pcdsharediv");
        if(!sharediv) {
            return; }
        if(sharediv.style.display === "block") {
            sharediv.style.display = "none"; }
        else {
            sharediv.style.display = "block"; }
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


    keysrch: function () {
        srchst.kwrds = "";
        dst.keywords.csvarray().forEach(function (kwd, i) {
            var cb = jt.byId("skw" + i);
            if(cb.checked) {
                srchst.kwrds = srchst.kwrds.csvappend(kwd); } });
        updateTypesSelectionArea();  //update types in response to keys
        app.pcd.searchReviews();
    },


    typesrch: function () {
        srchst.mtypes = "";
        dst.mtypes.csvarray().forEach(function (mt, i) {
            var cb = jt.byId("smt" + i);
            if(cb.checked) {
                srchst.mtypes = srchst.mtypes.csvappend(mt); } });
        updateKeywordsSelectionArea();  //update keys in response to types
        app.pcd.searchReviews();
    },


    showNotices: function () {
        jt.out("pcdnotidiv", "");
        if(dst.obj) {
            var prof = app.profile.myProfile();
            if(!prof) {  //not signed in, so no notices to display
                return; }
            if(dst.type === "profile" && dst.id === prof.instid) {
                showProfileNotices(prof); }
            else if(dst.type === "coop" && prof.coops && prof.coops[dst.id] &&
                    prof.coops[dst.id].lev > 0) {
                var lev = app.coop.membershipLevel(dst.obj, prof.instid);
                if(lev > 0) {
                    showThemeNotices(prof, lev, dst.obj); } } }
    },


    searchReviews: function () {
        var srchin;
        srchin = jt.byId("pcdsrchin");
        if(!srchin) {  //query input no longer on screen, quit
            return; }
        if(srchst.status === "processing") {  //not finished with prev call
            return app.fork({descr:"refresh search results",
                             func:app.pcd.searchReviews, ms:800}); }
        srchst.status = "processing";
        srchst.qstr = srchin.value;
        srchst.revs = searchFilterReviews(dst.obj.preb);
        displaySearchResults();  //clears the display if none matching
        indicateAndHandleOverflow();
    },


    toggleRevExpansion: function (prefix, revid) {
        var actspan = jt.byId(prefix + revid + "actspan");
        if(!actspan) {
            jt.log("pcd.toggleRevExpansion: no actspan to toggle");
            return; }
        if(!actspan.innerHTML) {  //initialize
            var rev = dst.obj.preb.find(function (r) {
                return r.instid === revid; });
            if(rev.penid === app.profile.myProfId()) {
                actspan.innerHTML = jt.tac2html(
                    ["a", {href:"#edit",
                           onclick:jt.fs("app.pcd.editMembic('" + rev.instid + 
                                         "')")},
                     ["img", {cla:"revedimg", src:"img/writereview.png"}]]); }
            else {  //someone else's review
                var prof = app.profile.myProfile();
                if(prof && prof.coops && prof.coops[dst.id] && 
                   dst.prof.coops[dst.id].lev >= 2) {
                    actspan.innerHTML = jt.tac2html(
                        ["a", {href:"#remove",
                               onclick:jt.fs("app.pcd.removeMembic('" + 
                                             rev.instid + "')")},
                         ["img", {cla:"revedimg", src:"img/trash.png"}]]); }
                else {  //fill with a space to avoid initializing again
                    actspan.innerHTML = "&nbsp;"; } } }
        if(actspan.style.display === "none") {
            actspan.style.display = "inline"; }
        else {
            actspan.style.display = "none"; }
        app.review.toggleExpansion(srchst.disprevs, prefix, revid);
    },


    toggleCreateCoop: function () {
        var html;
        html = ["A cooperative theme holds related membics from one or more members. As a founder, you have full privileges to manage other members and posts.",
                ["div", {cla: "formbuttonsdiv"},
                 ["button", {type: "button", id: "createcoopbutton",
                             onclick: jt.fs("app.pcd.display('coop')")},
                  "Create New Theme"]]];
        if(!jt.byId("createctmdiv").innerHTML) {
            jt.out("createctmdiv", jt.tac2html(html)); }
        else {
            jt.out("createctmdiv", ""); }
    },


    toggleCtmDet: function (ctype) {
        var midispdiv = jt.byId("midispdiv");
        if(ctype === "info" && (setdispstate.infomode !== "info" ||
                                !midispdiv.innerHTML)) {
            setdispstate.infomode = "info";
            jt.byId("midispdiv").style.display = "block";
            if(dst.type === "coop") {
                jt.out("midispdiv", coopLogHTML()); }
            else {
                jt.out("midispdiv", accountInfoHTML()); } }
        else if(ctype === "mbinfo" && (setdispstate.infomode !== "finfo" ||
                                       !midispdiv.innerHTML)) {
            setdispstate.infomode = "finfo";
            jt.byId("midispdiv").style.display = "block";
            jt.out("midispdiv", coopLogHTML("membership")); }
        else if(ctype === "members" && (setdispstate.infomode !== "members" ||
                                        !midispdiv.innerHTML)) {
            setdispstate.infomode = "members";
            jt.byId("midispdiv").style.display = "block";
            jt.out("midispdiv", coopMembershipHTML()); }
        else if(ctype === "stats" && (setdispstate.infomode !== "stats" ||
                                      !midispdiv.innerHTML)) {
            setdispstate.infomode = "stats";
            jt.byId("midispdiv").style.display = "block";
            jt.out("midispdiv", statsDisplayHTML()); }
        else {
            app.layout.togdisp("midispdiv"); }
    },


    memapp: function (verb, profid) {
        var elem;
        switch(verb) {
        case "reject":
            elem = jt.byId("reasondiv" + profid);
            if(elem.style.display !== "block") {
                elem.style.display = "block";
                jt.byId("reasonin" + profid).focus(); }
            else {
                elem = jt.byId("reasonin" + profid);
                if(!elem.value || !elem.value.trim()) {
                    jt.byId("reasonlab" + profid).style.color = "red"; }
                else { //have reason
                    jt.out("abdiv" + profid, "Rejecting...");
                    app.coop.processMembership(dst.obj, verb, profid, 
                                                elem.value.trim(),
                                                app.pcd.settings); } }
            break;
        case "accept":
            jt.out("abdiv" + profid, "Accepting...");
            app.coop.processMembership(dst.obj, verb, profid, "", 
                                        app.pcd.settings);
            break;
        default:
            jt.log("pcd.memapp unknown verb: " + verb); }
    },


    memdem: function (profid) {
        var elem;
        elem = jt.byId("reasonin" + profid);
        if(elem && elem.value.trim()) {
            jt.out("memdembuttondiv" + profid, "Demoting...");
            app.coop.processMembership(dst.obj, "demote", profid, 
                                        elem.value.trim(),
                                        app.pcd.settings); }
    },


    display: function (dtype, id, command) {
        verifyFunctionConnections();
        if(dtype === "profile" && !id) {
            id = app.profile.myProfId(); }
        if(dtype && id) {  //object should already be cached
            dst.type = dtype;
            dst.id = id;
            dst.obj = app.lcs.getRef(dtype, id)[dtype];
            return displayObject(dst.obj, command); }
        if(dtype === "coop") {  //creating new coop
            var profname = app.profile.myName();
            if(!profname) {
                jt.err("You need to have a name for your profile.");
                return app.profile.displayProfile(); }
            dst.obj = { name: "", description: "", 
                        people: {}, founders: app.profile.myProfId() };
            dst.obj.people[app.profile.myProfId()] = profname;
            return displayObject(dst.obj); }
    },


    redisplay: function () {
        app.pcd.display(dst.type, dst.id);
    },


    resetState: function () {
        dst.type = "";
        dst.id = "";
        dst.obj = null;
        srchst = { revtype: "all", qstr: "", status: "" };
        setdispstate = { infomode: "" };
    },


    getDisplayState: function () {
        return dst;
    },


    fetchAndDisplay: function (dtype, id, command) {
        //jt.log("pcd.fetchAndDisplay " + dtype + " " + id);
        if(!id) {
            jt.log("pcd.fetchAndDisplay " + dtype + " required an id");
            jt.log(new Error().stack); }
        app.lcs.getFull(dtype, id, function (obj) {
            if(!obj) {
                jt.log("pcd.fetchAndDisplay no obj " + dtype + " " + id);
                return app.themes.display(); }
            app.pcd.display(dtype, id, command); });
    },


    cancelThemeCreate: function () {
        app.layout.cancelOverlay();
        app.pcd.display("profile", app.profile.myProfId(), "coops");
    },


    editMembic: function (revid) {
        var rev = dst.obj.preb.find(function (r) { 
            return r.instid === revid; });
        if(dst.type === "coop") {
            rev = app.profile.myProfile().preb.find(function (r) {
                return r.instid === rev.srcrev; }); }
        app.review.start(rev);
    },


    removeMembic: function (revid) {
        jt.err("removeMembic " + revid + " not implemented yet");
    }

};  //end of returned functions
}());

