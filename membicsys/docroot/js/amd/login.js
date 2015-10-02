/*global confirm, setTimeout, window, document, history, app, jt */

/*jslint white, fudge, for */

app.login = (function () {
    "use strict";

    ////////////////////////////////////////
    // closure variables
    ////////////////////////////////////////

    var authmethod = "",
        authtoken = "",
        authname = "",
        moracct = null,
        cookdelim = "..morauth..",
        toprightdivcontents = "",
        altauths = [],
        loginhtml = "",


    ////////////////////////////////////////
    // helper functions
    ////////////////////////////////////////

    secureURL = function (endpoint) {
        var url = window.location.href;
        if(url.indexOf("https://") === 0 || url.search(/:\d080/) >= 0) {
            url = endpoint; }  //relative path url ok, data is encrypted
        else {  //return secured URL for endpoint
            url = app.secsvr + "/" + endpoint; }
        return url;
    },


    authparams = function () {
        var params, sec; 
        params = "am=" + authmethod + "&at=" + authtoken + 
                 "&an=" + jt.enc(authname);
        sec = jt.cookie(authtoken);
        if(sec) {
            params += "&as=" + jt.enc(sec); }
        return params;
    },


    //Produces less cryptic params to read
    authparamsfull = function () {
        var params = "authmethod=" + authmethod + 
                     "&authtoken=" + authtoken + 
                     "&authname=" + jt.enc(authname);
        return params;
    },


    logoutWithNoDisplayUpdate = function () {
        //remove the cookie and reset the app vars
        jt.cookie(app.authcookname, "", -1);
        authmethod = "";
        authtoken = "";
        authname = "";
        moracct = null;
        app.review.resetStateVars();
        app.pen.resetStateVars();
    },


    clearParams = function () {
        //this also clears any search parameters to leave a clean url.
        //that way a return call from someplace like twitter doesn't
        //keep token info and similar parameter stuff hanging around.
        var url = window.location.pathname;
        //note this is using the standard html5 history directly.  That's
        //a way to to clear the URL noise without a redirect triggering
        //a page refresh. 
        if(history && history.pushState && 
                      typeof history.pushState === 'function') {
            history.pushState("", document.title, url); }
    },


    //Cookie timeout is enforced both by the expiration setting here,
    //and by the server (moracct.py authenticated).  On FF14 with
    //noscript installed, the cookie gets written as a session cookie
    //regardless of the expiration set here.  This happens even if
    //directly using Cookie.set, or setting document.cookie directly.
    //On FF14 without noscript, all is normal.
    setAuthentication = function (method, token, name) {
        var cval = method + cookdelim + token + cookdelim + name;
        jt.cookie(app.authcookname, cval, 365);
        authmethod = method;
        authtoken = token;
        authname = name;
        if(authname) {
            authname = authname.replace("%40", "@"); }
        app.login.updateAuthentDisplay();
    },


    displayEmailSent = function () {
        var html;
        html = [["p", 
                 [["Your account information has been emailed to "],
                  ["code", jt.byId('emailin').value],
                  [" and should arrive in a few minutes.  If it doesn't" + 
                   " show up, please"]]],
                ["ol",
                 [["li", "Make sure your email address is spelled correctly"],
                  ["li", "Check your spam folder"],
                  ["li", "Confirm the email address you entered is the same" +
                        " one you used when you created your account."]]],
                ["div", {cla: "dlgbuttonsdiv"},
                 ["button", {type: "button", id: "okbutton",
                             onclick: jt.fs("app.layout.closeDialog()")},
                  "OK"]]];
        html = app.layout.dlgwrapHTML("Email Account Password", html);
        app.layout.openDialog({y:90}, jt.tac2html(html), null,
                              function () {
                                  jt.byId('okbutton').focus(); });
    },


    //all alternate login is done from the main server. 
    handleAlternateAuthentication = function (idx, params) {
        var redurl;
        if(!params) {
            params = jt.parseParams(); }
        if(window.location.href.indexOf("localhost") >= 0) {
            jt.err("Not redirecting to main server off localhost. Confusing.");
            return; }
        if(window.location.href.indexOf(app.mainsvr) !== 0) {
            redurl = app.mainsvr + "#command=AltAuth" + (+idx);
            if(params.reqprof) {
                redurl += "&view=pen&penid=" + params.reqprof; }
            setTimeout(function () {
                window.location.href = redurl; 
            }, 20); }
        else {  //we are on app.mainsvr at this point
            if(typeof idx !== "number") {
                idx = parseInt(idx, 10); }
            altauths[idx].authenticate(params); }
    },


    onLoginEmailChange = function (e) {
        var passin;
        jt.evtend(e); 
        passin = jt.byId('passin');
        //Unbelievably, the passin field may not be available yet if
        //this is a browser autosubmit of saved credentials in Safari.
        //Don't create error noise in that case.
        if(passin) {
            passin.focus(); }
    },


    //webkit likes to escape at signs
    fixEmailAddress = function (emaddr) {
        emaddr = emaddr.replace(/%40/g, "@");
        return emaddr;
    },


    //safari displays "No%20match%20for%20those%20credentials"
    //and even "No%2520match%2520for%2520those%2520credentials"
    fixServerText = function (text) {
        var emailin;
        if(!text) {
            text = ""; }
        text = text.replace(/%20/g, " ");
        text = text.replace(/%2520/g, " ");
        if(text.startsWith("Not registered")) {
            emailin = jt.byId('emailin');
            if(emailin && emailin.value) {
                text = fixEmailAddress(emailin.value); }
            else {
                text = "Account"; }
            text += " not registered yet."; }
        return text;
    },


    setFocusOnEmailInput = function () {
        jt.retry(function () {  //setting the focus is not reliable
            var actel = document.activeElement;
            if(!actel || actel.id !== 'emailin') {
                actel = jt.byId('emailin');
                if(actel) {
                    actel.focus();
                    jt.log("Set emailin focus..."); } }
            else {
                jt.log("emailin focus set already."); }
        }, [200, 400, 600]);
    },



    verifyCoreLoginForm = function () {
        var html;
        if(!jt.byId('logindiv') || !jt.byId('loginform')) {
            html = jt.tac2html(["div", {id: "logindiv"}, loginhtml]);
            jt.out('toprightdiv', html); }
    },


    addParamValuesToLoginForm = function (params) {
        var html = [];
        //add url parameters to pass through on form submit.  Except for
        //emailin, which should always be read from the form even if it
        //is passed back from the server for use in error handling.
        Object.keys(params).forEach(function (name) {
            if(name !== "emailin") {
                html.push(["input", {type: "hidden", name: name,
                                     value: params[name]}]); } });
        if(!params.returnto) {
            html.push(["input", {type: "hidden", name: "returnto",
                                 //window.location.origin is webkit only
                                 value: window.location.protocol + "//" + 
                                        window.location.host}]); }
        jt.out('loginparaminputs', jt.tac2html(html));
    },


    //The login form must already exist in index.html for saved passwords
    //to work on some browsers.  This adds the detail.
    displayLoginForm = function (params) {
        var html;
        verifyCoreLoginForm();
        addParamValuesToLoginForm(params);
        //decorate contents and connect additional actions
        if(params.loginerr) {
            jt.out('loginstatdiv', fixServerText(params.loginerr)); }
        html = ["a", {id: "forgotpw", href: "#forgotpassword",
                      title: "Email my password, I spaced it",
                      onclick: jt.fs("app.login.forgotPassword()")},
                "forgot my password..."];
        jt.out('forgotpassdiv', jt.tac2html(html));
        if(authname) {
            jt.byId('emailin').value = authname; }
        if(params.emailin) {
            jt.byId('emailin').value = params.emailin; }
        jt.on('emailin', 'change', onLoginEmailChange);
        //Since this is an actual form, the default form action is
        //already triggered on return, and setting a handler
        //interferes with the Create Account button press.
        //jt.on('passin', 'change', onLoginPasswordChange);
        setFocusOnEmailInput();
    },


    activateButtonOrNoticeHTML = function (moracct) {
        var html, sent = false;
        html = ["button", {type: "button", id: "activatebutton",
                           onclick: jt.fs("app.login.sendActivation()")},
                "Activate"];
        if(moracct.actsends) {
            moracct.actsends.split(",").every(function (act) {
                var ta = act.split(";");
                if(ta[1] === moracct.email && 
                       jt.timewithin(ta[0], 'hours', 4)) {
                    sent = jt.tz2loc(jt.ISOString2Time(ta[0]));
                    return false; }
                return true; }); }
        if(sent) {
            html = ["sent " + sent,
                    ["p", {cla: "activationsentdet"},
                     "Expedited email service is not available, so delivery may take up to 4 hrs (please also check spam folders). Click the link in the email to activate your account."]];
            jt.out("accstatdetaildiv", jt.tac2html(html));
            html = ["span", {cla: "actmailtext"},
                    ["a", {href: "#activationmaildetails",
                           onclick: jt.fs("app.login.toggleactmaildet()")},
                     "mail sent"]]; }
        return html;
    },


    writeUsermenuAccountFormElements = function (moracct) {
        var html;
        if(moracct.status === "Active") {
            html = [["span", {cla: "accstatvalspan"}, "Active"],
                    ["button", {type: "button", id: "deactivatebutton",
                                onclick: jt.fs("app.login.deactivateAcct()")},
                     "Deactivate"]]; }
        else { //Pending|Inactive|Unreachable
            html = [["span", {cla: "accstatvalspan"}, 
                     moracct.status || "Pending"],
                    activateButtonOrNoticeHTML(moracct)]; }
        //With an empty label, this line of the form gets skewed to
        //the left.  With visible text, the font height is off and the
        //vertical alignment looks bad.  Using a hard space as the label.
        html = [["label", {fo: "emptyspace", cla: "liflab"}, "&nbsp;"],
                ["span", {id: "buttonornotespan"},
                 html]];
        jt.out('accstatusupdatediv', jt.tac2html(html));
        //You can request your password be mailed to you, so simple
        //entry seems best here.
        html = [["label", {fo: "passin", cla: "liflab"}, "Password"],
                ["input", {type: "password", cla: "lifin", 
                           name: "passin", id: "passin"}]];
        jt.out('accpassupdatediv', jt.tac2html(html));
        app.pen.getPen("", function (pen) {
            var accpenin = jt.byId("accpenin");
            if(accpenin) {
                accpenin.value = pen.name;
                moracct.penName = pen.name; }}, "usermenustat");
    },


    readUsermenuAccountForm = function () {
        var ua;
        ua = { email: moracct.email,
               penName: moracct.penName };
        ua.email = jt.byId('emailin').value.trim();
        if(!jt.isProbablyEmail(ua.email)) {
            return jt.out('usermenustat', "Invalid email address"); }
        if(ua.email !== moracct.email &&
           (!confirm("You will need to login again and re-activate your account from your new email address. Setting your email address to " + ua.email))) {
            return; }
        if(jt.byId('passin').value) {
            ua.password = jt.byId('passin').value.trim(); }
        ua.penName = jt.byId('accpenin').value;
        return ua;
    },


    getAccountInfoFromPenStash = function () {
        var mypen = app.pen.myPenName();
        if(mypen && mypen.stash && mypen.stash.account) {
            moracct = mypen.stash.account; }
    },


    setPenStashFromAccountInfo = function (acct) {
        var mypen = app.pen.myPenName();
        if(mypen && mypen.stash && mypen.stash.account) {
            mypen.stash.account = acct; }
    },


    logLoadTimes = function () {
        var millis, timer = app.amdtimer;
        millis = timer.load.end.getTime() - timer.load.start.getTime();
        jt.log("load app: " + millis);
    },


    loadThirdPartyUtilities = function () {
        //google fonts can occasionally be slow or unresponsive.  Load here to
        //avoid holding up app initialization
        var elem = document.createElement('link');
        elem.rel = "stylesheet";
        elem.type = "text/css";
        elem.href = "//fonts.googleapis.com/css?family=Open+Sans:400,700";
        document.head.appendChild(elem);
        jt.log("added stylesheet " + elem.href);
        //handwriting font for pen name display
        elem = document.createElement('link');
        elem.rel = "stylesheet";
        elem.type = "text/css";
        elem.href = "//fonts.googleapis.com/css?family=Shadows+Into+Light+Two";
        document.head.appendChild(elem);
        jt.log("added stylesheet " + elem.href);
        //The google places API doesn't like being loaded asynchronously so
        //leaving it last in the index file instead.
    },


    loggedInAuthentDisplay = function () {
        var mypen, html;
        mypen = app.pen.myPenName();
        //if no pen name, then the app is prompting for that and there
        //is no authenticated menu displayed.
        if(mypen) {
            html = ["a", {href: "#SignOut",
                          onclick: jt.fs("app.login.logout()")},
                    ["span", {cla: "taslinkspan"},
                     "Sign out"]];
            jt.out('toprightdiv', jt.tac2html(html));
            html = [
                ["div", {id: "topbuttonsdiv"},
                 [["a", {href: "#remembered", title: "Remembered membics",
                         onclick: jt.fs("app.login.topnav('remembered')")},
                   [["img", {cla: "topbuttonimg",
                             src: "img/remembered.png"}],
                    ["span", {id: "rememberedcountspan"},
                     mypen.remembered.csvarray().length || ""]]],
                  ["a", {href: "#write", title: "Make a membic",
                         onclick: jt.fs("app.login.topnav('write')")},
                   ["img", {cla: "topbuttonimg",
                            src: "img/writereview.png"}]]]],
                ["div", {id: "topproflinkdiv"},
                 ["a", {href: "#view=pen&penid=" + jt.instId(mypen),
                        onclick: jt.fs("app.login.topnav('mymembics')")},
                  ["span", {cla: "taslinkspan"},
                   "My membics"]]]];
            jt.out('topactionsdiv', jt.tac2html(html)); }
    },


    //On localhost, params are lost when the login form is displayed.
    //On the server, they are passed to the secure host and returned
    //post-login.  These are separate flows.  Not supporting a
    //separate param processing path just for local development.
    loggedInDoNextStep = function (params) {
        if(params.url) {
            app.review.readURL(jt.dec(params.url), params); }
        else {  //pass parameters along to the general processing next step
            app.login.doNextStep(params); }
    },


    standardizeAuthParams = function (params) {
        if(params.authmethod) { params.am = params.authmethod; }
        if(params.authtoken) { params.at = params.authtoken; }
        if(params.authname) { params.an = params.authname; }
    },


    convertPermalinkURLElemsToParams = function (params) {
        var idx, href = window.location.href;
        idx = href.indexOf("/p/");
        if(idx >= 0) {
            params.view = "pen";
            params.penid = href.slice(idx + 3); }
        idx = href.indexOf("/t/");
        if(idx >= 0) {
            params.view = "coop";
            params.coopid = href.slice(idx + 3); }
    },


    applyCSSOverride = function (cssurl) {
        var csselem = document.createElement('link');
        csselem.rel = "stylesheet";
        csselem.type = "text/css";
        cssurl = jt.dec(cssurl);
        cssurl = cssurl.toLowerCase();
        if(cssurl.indexOf("http") < 0) {
            cssurl = "css/embed/" + cssurl + ".css"; }
        csselem.href = cssurl;
        document.head.appendChild(csselem);
    },


    handleInitialParamSideEffects = function (params) {
        if(params.am && params.at && params.an && !params.special) {
            params.at = jt.enc(params.at);  //restore token encoding 
            setAuthentication(params.am, params.at, params.an); }
        if(params.logout) {
            logoutWithNoDisplayUpdate(); }
        if(!params.returnto) {  //clean up the URL display
            clearParams(); }
        if(params.css) {
            applyCSSOverride(params.css); }
        //handle specific context requests
        if(params.view && (params.penid || params.profid || params.coopid)) {
            //Note who requested a specific profile or coop
            params = "clickthrough=" + params.view + jt.ts("&cb=", "second");
            setTimeout(function () {
                jt.call('GET', "/bytheway?" + params, null,
                        function () {
                            jt.log("noted profile clickthrough"); },
                        app.failf); }, 200);
            app.history.checkpoint({ view: params.view, 
                                     penid: params.penid,
                                     profid: params.profid,
                                     coopid: params.coopid,
                                     tab: params.tab,
                                     expid: params.expid }); }
        else if(params.revedit) {
            app.history.checkpoint({ view: "review", mode: "edit",
                                     revid: params.revedit }); }
    },


    handleRedirectOrStartWork = function () {
        var idx, altpn = "AltAuth", params = jt.parseParams();
        standardizeAuthParams(params);
        convertPermalinkURLElemsToParams(params);
        handleInitialParamSideEffects(params);
        //figure out what to do next
        if(params.command && params.command.indexOf(altpn) === 0) {
            idx = params.command.slice(altpn.length);
            handleAlternateAuthentication(idx, params); }
        else if(params.state && params.state.indexOf(altpn) === 0) {
            idx = params.state.slice(altpn.length, altpn.length + 1);
            handleAlternateAuthentication(idx, params); }
        else if(authtoken || app.login.readAuthCookie()) {
            loggedInDoNextStep(params); }
        else if(secureURL("login") === "login") {
            displayLoginForm(params);
            app.login.doNextStep(params); }
        else { 
            app.redirectToSecureServer(params); }
    };


    ////////////////////////////////////////
    // published functions
    ////////////////////////////////////////
return {

    init: function () {
        logLoadTimes();
        setTimeout(loadThirdPartyUtilities, 5);
        if(!loginhtml) {  //save original html in case needed later
            loginhtml = jt.byId('logindiv').innerHTML; }
        //do not change this ordering. Some auths leverage their index
        altauths = [ app.facebook, app.twitter, app.googleplus, app.github ];
        handleRedirectOrStartWork();
    },


    accountSettingsHTML: function () {
        var html;
        html = ["div", {id: "accountsettingsformdiv"},
                [["div", {cla: "lifsep", id: "accpenupdatediv"},
                  [["label", {fo: "accpenin", cla: "liflab"}, "Pen&nbsp;Name"],
                   ["input", {type: "text", cla: "lifin", 
                              name: "accpenin", id: "accpenin"}]]],
                 ["div", {cla: "lifsep", id: "accemailupdatediv"},
                  [["label", {fo: "emailin", cla: "liflab"}, "Email"],
                   ["input", {type: "email", cla: "lifin",
                              name: "emailin", id: "emailin",
                              value: authname,
                              placeholder: "nospam@example.com"}]]],
                 ["div", {cla: "lifsep", id: "accstatusupdatediv"}],
                 ["div", {cla: "lifsep", id: "accstatdetaildiv"}],
                 ["div", {cla: "lifsep", id: "accpassupdatediv"}],
                 ["div", {cla: "lifsep", id: "usermenustat"}],
                 ["div", {cla: "dlgbuttonsdiv"},
                  [["button", {type: "button", id: "okbutton",
                               onclick: jt.fs("app.login.updateAccount()")},
                    "Update Account"]]]]];
        return html;
    },


    accountSettingsInit: function () {
        var params, detdiv = jt.byId('accstatdetaildiv');
        if(!detdiv) { //form fields no longer displayed so nothing to do
            return; }
        detdiv.style.display = "none";
        if(!moracct) {
            getAccountInfoFromPenStash(); }
        if(moracct) {
            writeUsermenuAccountFormElements(moracct); }
        else {
            params = authparams() + jt.ts("&cb=", "second");
            jt.call('GET', "getacct?" + params, null,
                    function (accarr) {
                        if(accarr.length > 0) {
                            moracct = accarr[0];
                            writeUsermenuAccountFormElements(moracct); }
                        else {
                            jt.err("Account details unavailable"); } },
                    app.failf(function (code, errtxt) {
                        jt.err("Account details retrieval failed: " + code + 
                               " " + errtxt); }),
                    jt.semaphore("login.usermenu")); }
    },


    toggleactmaildet: function () {
        var detdiv = jt.byId("accstatdetaildiv");
        if(detdiv) {
            if(detdiv.style.display === "block") {
                detdiv.style.display = "none"; }
            else {
                detdiv.style.display = "block"; } }
    },


    deactivateAcct: function () {
        var params, emaddr = jt.byId('emailin').value;
        if(emaddr !== authname) {
            jt.err("Please ok your email address change before deactivating.");
            return; }
        if(confirm("If you want to re-activate your account after deactivating, you will need to confirm your email address again.")) {
            jt.out('buttonornotespan', "Deactivating...");
            params = app.login.authparams() + "&status=Inactive" + 
                jt.ts("&cb=", "second");
            jt.call('GET', "activate?" + params, null,
                    function (accounts) {
                        moracct = accounts[0];
                        writeUsermenuAccountFormElements(moracct); },
                    app.failf(function (code, errtxt) {
                        jt.err("Deactivation failed " + code + ": " + errtxt);
                        writeUsermenuAccountFormElements(moracct); }),
                    jt.semaphore("login.deactivateAcct")); }
    },


    sendActivation: function (ignore /*status*/) {
        var emaddr = jt.byId('emailin').value;
        if(emaddr !== authname) {
            jt.err("Please ok your email address change before activating.");
            return; }
        jt.out('buttonornotespan', "Sending...");
        jt.call('POST', "sendcode?" + app.login.authparams(), "",
                function (accounts) {
                    moracct = accounts[0];
                    writeUsermenuAccountFormElements(moracct); },
                app.failf(function (code, errtxt) {
                    jt.err("Sending failed " + code + ": " + errtxt);
                    writeUsermenuAccountFormElements(moracct); }),
                jt.semaphore("login.sendActivation"));
    },


    //create the logged-in display areas
    updateAuthentDisplay: function (override) {
        if(!toprightdivcontents) {
            toprightdivcontents = jt.byId('toprightdiv').innerHTML; }
        if(authtoken && override !== "hide") {
            loggedInAuthentDisplay(); }
        else if(override === "hide") { 
            jt.out('toprightdiv', ""); }
        else {  //restore whatever was in index.html to begin with
            jt.out('toprightdiv', toprightdivcontents); }
    },


    redirhome: function (e) {
        var url = app.mainsvr;
        jt.evtend(e);
        if(window.location.href.indexOf("http://localhost:8080") === 0) {
            url = "http://localhost:8080"; }
        window.location.href = url;
    },


    topnav: function (bname) {
        app.verifyHome();
        switch(bname) {
        case "remembered":
            return app.activity.displayRemembered();
        case "write":
            return app.review.start();
        case "mymembics":
            return app.pcd.display("pen"); }
    },


    nukeAppData: function () {
        app.activity.resetAllFeeds();
        app.pcd.resetState();
        app.lcs.nukeItAll();
    },


    updateAccount: function () {
        var ua, data, contf = app.pcd.display;
        ua = readUsermenuAccountForm();
        if(ua.penName !== moracct.penName) {
            if(!confirm("Theme action logs and older membics may still reference your previous pen name \"" + moracct.penName + "\".")) {
                return; }
            contf = function () {
                app.pen.getPen("", function (pen) {
                    pen.name = ua.penName;
                    app.pen.updatePen(
                        pen,
                        function (ignore /*penref*/) {
                            app.login.updateAuthentDisplay();
                            app.login.nukeAppData();
                            app.history.dispatchState(); },
                        function (code, errtxt) {
                            jt.out('usermenustat', "Pen name update failed " + 
                                   code + ": " + errtxt); }); }); }; }
        else if(ua.password) {
            if(!confirm("The next time you sign in, you will need to use your updated password.")) {
                return; } }
        if(ua.email === moracct.email && !ua.password) {
            contf(); }  //nothing changed
        else {  //account info changed
            if(ua.email !== moracct.email) {
                contf = app.login.logout; }
            data = jt.objdata(ua) + "&" + authparams();
            jt.log("updacc data: " + data);
            jt.call('POST', secureURL("updacc"), data,
                    function (objs) {
                        if(authmethod === "mid") {
                            setAuthentication("mid", objs[0].token, authname); }
                        setPenStashFromAccountInfo(objs[0]);
                        moracct = null;  //reset so they log in again
                        contf(); },
                    app.failf(function (code, errtxt) {
                        jt.out('setstatdiv', "Account update failed " +
                               code + ": " + errtxt); }),
                    jt.semaphore("login.updateAccount")); }
    },


    authparams: function () {
        return authparams();
    },


    isLoggedIn: function () {
        if(authmethod && authtoken && authname) {
            return true; }
        return false;
    },


    noteAccountInfo: function (pen) {
        //only have stash.account if it is the pen you logged in with
        if(pen && pen.stash && pen.stash.account) {
            moracct = pen.stash.account;
            app.pen.setMyPenId(jt.instId(pen)); }
    },


    accountInfo: function (fieldname) {
        var pen;
        if(moracct) {
            return moracct[fieldname]; }
        pen = app.pen.myPenName();
        if(pen && pen.stash && pen.stash.account) {
            app.login.noteAccountInfo(pen);
            return moracct[fieldname]; }
        return "";
    },


    readAuthCookie: function () {
        var cval, mtn;
        cval = jt.cookie(app.authcookname);
        if(cval) {
            mtn = cval.split(cookdelim);
            authmethod = mtn[0];
            authtoken = mtn[1];
            authname = mtn[2].replace("%40", "@"); }
        app.login.updateAuthentDisplay();
        return authtoken;  //true if set earlier
    },


    logout: function (errprompt) {
        app.layout.closeDialog();
        app.layout.cancelOverlay();
        logoutWithNoDisplayUpdate();
        app.history.checkpoint({ view: "profile", profid: 0 });
        app.login.updateAuthentDisplay();
        app.login.init();
        if(errprompt) {
            jt.err(errprompt); }
        app.verifyHome();
    },


    altLogin: function (idx) {
        handleAlternateAuthentication(idx);
    },


    setAuth: function (method, token, name) {
        setAuthentication(method, token, name);
    },


    //Return point for 3rd party auth completion
    authComplete: function () {
        var params;
        //any original params probably didn't make it through the 3rd
        //party auth calls, but capture them in case they did.
        params = jt.parseParams();
        //kick off the pen access time update, hinter etc.
        loggedInDoNextStep(params);
    },


    createAccount: function () {
        var emaddr, password, data, url, buttonhtml;
        emaddr = jt.byId('emailin').value;
        password = jt.byId('passin').value;
        if(!emaddr || !password || !emaddr.trim() || !password.trim()) {
            jt.out('loginstatdiv', "Please specify an email and password");
            jt.byId('emailin').focus();
            return; }
        jt.out('loginstatdiv', "&nbsp;");  //clear any previous message
        buttonhtml = jt.byId('loginbuttonsdiv').innerHTML;
        jt.out('loginbuttonsdiv', "Creating new account...");
        emaddr = emaddr.toLowerCase();
        data = jt.objdata({ emailin: emaddr, passin: password });
        url = secureURL("newacct");
        jt.call('POST', url, data, 
                 function (objs) {
                     var html = "<p>Your account has been created." + 
                         " Welcome to the Membic community!</p>" +
                         "<p>Signing you in for the first time now...</p>";
                     jt.out('logindiv', html);
                     setAuthentication("mid", objs[0].token, emaddr);
                     //wait briefly to give the db a chance to stabilize
                     setTimeout(app.login.doNextStep, 3000); },
                 app.failf(function (ignore /*code*/, errtxt) {
                     jt.out('loginstatdiv', errtxt);
                     jt.out('loginbuttonsdiv', buttonhtml); }),
                jt.semaphore("login.createAccount"));
    },


    doNextStep: function (params) {
        var state, redurl, xpara;
        if(!params) {
            params = jt.parseParams(); }
        if(params.returnto) {
            //if changing here, also check /redirlogin
            redurl = decodeURIComponent(params.returnto) + "#" +
                authparamsfull();
            if(params.special === "nativeonly") {
                redurl += "&special=nativeonly"; }
            if(params.reqprof) {
                redurl += "&view=pen&penid=" + params.reqprof; }
            xpara = jt.objdata(params, ["logout", "returnto"]);
            if(xpara) {
                redurl += "&" + xpara; }
            window.location.href = redurl;
            return; }
        //no tag redirect so check current state.  State may be from history
        //pop or set by handleRedirectOrStartWork
        state = app.history.currState();
        if(!state || !state.view) {
            if(params.view === "profile") {
                state = {view: "profile"}; }
            else {  //default initialization
                state = {view: "activity"}; } }
        if(app.login.isLoggedIn()) {
            app.pen.getPen("", function (ignore /*pen*/) {
                app.login.updateAuthentDisplay();
                setTimeout(app.coop.processInvites, 1000);
                app.history.dispatchState(state); }); }
        else {
            app.history.dispatchState(state); }
    },


    forgotPassword: function () {
        var emaddr, data;
        emaddr = jt.byId('emailin').value;
        if(!jt.isProbablyEmail(emaddr)) {
            jt.out('loginstatdiv', "Please fill in your email address...");
            return; }
        jt.out('loginstatdiv', "Sending...");
        data = "emailin=" + jt.enc(emaddr);
        jt.call('POST', "mailcred", data,
                function (ignore /*objs*/) {
                    jt.out('loginstatdiv', "&nbsp;");
                    displayEmailSent(); },
                app.failf(function (ignore /*code*/, errtxt) {
                    jt.out('loginstatdiv', errtxt); }),
                jt.semaphore("forgotPassword"));
    }

};  //end of returned functions
}());

