/*global alert: false, console: false, confirm: false, setTimeout: false, window: false, document: false, history: false, FB: false, navigator: false, require: false, jtminjsDecorateWithUtilities: false */

/*jslint regexp: true, unparam: true, white: true, maxerr: 50, indent: 4 */

var app = {},  //Global container for application level funcs and values
    jt = {};   //Global access to general utility methods

////////////////////////////////////////
// g l o
//
(function () {
    "use strict";

    ////////////////////////////////////////
    // app variables
    ////////////////////////////////////////

    app.colors = { bodybg: "#fffff6",
                   text: "#111111",
                   link: "#3150b2",
                   hover: "#3399cc" };
    app.winw = 0;  //adjusted in app.layout
    app.winh = 0;
    app.introtext = "";
    app.authcookname = "myopenreviewauth";
    app.secsvr = "https://myopenreviews.appspot.com";
    app.mainsvr = "http://www.wdydfun.com";
    app.onescapefunc = null;  //app global escape key handler


    ////////////////////////////////////////
    // application level functions
    ////////////////////////////////////////

    //app global key handling
    app.globkey = function (e) {
        if(e && e.keyCode === 27) {  //ESC
            if(app.onescapefunc) {
                jt.evtend(e);
                app.onescapefunc(); } }
    };


    app.cancelOverlay = function () {
        jt.out('overlaydiv', "");
        jt.byId('overlaydiv').style.visibility = "hidden";
        app.onescapefunc = null;
    };


    app.redirectToSecureServer = function (params) {
        var href, state;
        state = {};
        if(history && history.state) {
            state = history.state; }
        href = app.secsvr + "#returnto=" + jt.enc(app.mainsvr) + 
            "&logout=true";
        if(state && state.view === "profile" && state.profid) {
            href += "&reqprof=" + state.profid; }
        href += "&" + jt.objdata(params);
        jt.out('contentfill', "Redirecting to secure server...");
        window.location.href = href;
    };


    app.redirectIfNeeded = function () {
        var href = window.location.href;
        if(href.indexOf(app.mainsvr) >= 0 &&
           href.indexOf("authtoken=") < 0 &&
           href.indexOf("at=") < 0 &&
           href.indexOf("AltAuth") < 0 &&
           (!jt.cookie(app.authcookname))) {
            app.redirectToSecureServer(jt.parseParams());
            return true; }
    };


    //secondary initialization load since single monolithic is dog slow
    app.init2 = function () {
        var cdiv;
        app.amdtimer.load.end = new Date();
        cdiv = jt.byId('contentdiv');
        jt.out('contentfill', " &nbsp; ");
        if(!app.introtext) {  //capture original so we can revert as needed
            app.introtext = cdiv.innerHTML; }
        app.layout.init();
        jt.on(document, 'keypress', app.globkey);
        jt.on(window, 'popstate', app.history.pop);
        app.login.init();
    };


    app.init = function () {
        var href = window.location.href,
            modules = [ "js/amd/layout", "js/amd/login", "js/amd/review", 
                        "js/amd/profile", "js/amd/activity", "js/amd/pen", 
                        "js/amd/rel", "js/amd/skinner", "js/amd/services", 
                        "js/amd/lcs", "js/amd/history", 
                        "js/amd/ext/facebook", "js/amd/ext/twitter", 
                        "js/amd/ext/googleplus", "js/amd/ext/github",
                        "js/amd/ext/amazon", "js/amd/ext/email",
                        "js/amd/ext/readurl" ];
        if(href.indexOf("http://www.wdydfun.com") >= 0) {
            app.mainsvr = "http://www.wdydfun.com"; }
        if(href.indexOf("http://www.myopenreviews.com") >= 0) {
            app.mainsvr = "http://www.myopenreviews.com"; }
        if(href.indexOf("#") > 0) {
            href = href.slice(0, href.indexOf("#")); }
        if(href.indexOf("?") > 0) {
            href = href.slice(0, href.indexOf("?")); }
        jtminjsDecorateWithUtilities(jt);
        jt.out('contentfill', "loading modules...");
        app.amdtimer = {};
        app.amdtimer.load = { start: new Date() };
        jt.loadAppModules(app, modules, href, app.init2);
    };


    app.crash = function (code, errtxt, method, url, data) {
        var html = "<div id=\"chead\"> </div><div id=\"cmain\">" + 
        "<p>The server crashed.</p>" +
        "<p>If you want to help out, copy the contents of this page and " +
        "post it to " +
        "<a href=\"https://github.com/theriex/myopenreviews/issues\" " +
        "onclick=\"window.open('https://github.com/theriex/myopenreviews/" +
        "issues');return false\">open issues</a>.  Otherwise reload the " +
        "page in your browser and see if it happens again...</p>" +
        "<ul>" +
        "<li>method: " + method +
        "<li>url: " + url +
        "<li>data: " + data +
        "<li>code: " + code +
        "</ul></div>" +
        errtxt;
        jt.out('contentdiv', html);
    };


    app.failf = function (failfunc) {
        if(!failfunc) {
            failfunc = function (code, errtxt, method, url, data) {
                jt.log(jt.safestr(code) + " " + method + " " + url + 
                       " " + data + " " + errtxt); }; }
        return function (code, errtxt, method, url, data) {
            switch(code) {
            //   400 (bad request) -> general error handling
            //If the user has attempted to do something unauthorized,
            //then it's most likely because their session has expired
            //or they logged out and are trying to resubmit an old
            //form.  The appropriate thing is to redo the login.
            case 401: return jt.login.logout();
            //   404 (not found) -> general error handling
            //   405 (GET instead of POST) -> general error handling
            //   412 (precondition failed) -> general error handling
            case 500: return app.crash(code, errtxt, method, url, data);
            default: failfunc(code, errtxt, method, url, data); } };
    };


    ////////////////////////////////////////
    // supplemental utility funtions
    ////////////////////////////////////////

    //factored method to create an image link.  Some older browsers put
    //borders around these...
    jt.imglink = function (href, title, funcstr, imgfile, cssclass) {
        var html;
        if(!cssclass) {
            cssclass = "navico"; }
        if(funcstr.indexOf(";") < 0) {
            funcstr += ";"; }
        if(imgfile.indexOf("/") < 0) {
            imgfile = "img/" + imgfile; }
        html = "<a href=\"" + href + "\" title=\"" + title + "\"" +
                 " onclick=\"" + funcstr + "return false;\"" +
               "><img class=\"" + cssclass + "\" src=\"" + imgfile + "\"" +
                    " border=\"0\"/></a>";
        return html;
    };


    jt.imgntxt = function (imgfile, text, funcstr, href, 
                            title, cssclass, idbase) {
        var html, tblid = "", imgtdid = "", imgid = "", txttdid = "";
        if(!cssclass) {
            cssclass = "navico"; }
        if(funcstr.indexOf(";") < 0) {
            funcstr += ";"; }
        if(imgfile && imgfile.indexOf("/") < 0) {
            imgfile = "img/" + imgfile; }
        if(title) {
            title = " title=\"" + title + "\""; }
        else {
            title = ""; }
        if(idbase) {
            tblid = " id=\"" + idbase + "table\"";
            imgtdid = " id=\"" + idbase + "imgtd\"";
            imgid = " id=\"" + idbase + "img\"";
            txttdid = " id=\"" + idbase + "txttd\""; }
        html = "<table" + tblid + " class=\"buttontable\" border=\"0\"" + 
                       title + " onclick=\"" + funcstr + "return false;\">" +
            "<tr>" +
              "<td" + imgtdid + ">" +
                "<img" + imgid + " class=\"" + cssclass + "\" src=\"" + 
                     imgfile + "\"" + " border=\"0\"/></td>" +
              "<td" + txttdid + " class=\"buttontabletexttd\">" +
                  text + "</td>" +
            "</tr></table>";
        return html;
    };


    jt.checkrad = function (type, name, value, label, checked, chgfstr) {
        var html;
        if(!label) {
            label = value.capitalize(); }
        html = "<input type=\"" + type + "\" name=\"" + name + "\" value=\"" +
            value + "\" id=\"" + value + "\"";
        if(checked) {
            html += " checked=\"checked\""; }
        //the source element for the change event is unreliable if 
        //you click on a label, so not passing back any value.  
        //Change listener will need to check what is selected.
        if(chgfstr) {
            html += " onchange=\"" + chgfstr + "();return false;\""; }
        html += "/>" + "<label for=\"" + value + "\">" + label + "</label>";
        return html;
    };


    //factored method to create a checkbox with a label.
    jt.checkbox = function (name, value, label) {
        return jt.checkrad("checkbox", name, value, label);
    };


    jt.radiobutton = function (name, value, label, checked, chgfstr) {
        return jt.checkrad("radio", name, value, label, checked, chgfstr);
    };


    //Referencing variables starting with an underscore causes jslint
    //complaints, but it still seems the clearest and safest way to
    //handle an ID value in the server side Python JSON serialization.
    //This utility method encapsulates the access, and provides a
    //single point of adjustment if the server side logic changes.
    jt.instId = function (obj) {
        var idfield = "_id";
        if(obj && obj.hasOwnProperty(idfield)) {
            return obj[idfield]; }
    };
    jt.setInstId = function (obj, idval) {
        var idfield = "_id";
        obj[idfield] = idval;
    };
    jt.isId = function (idval) {
        if(idval && typeof idval === 'string' && idval !== "0") {
            return true; }
        return false;
    };


    //Some things don't work in older browsers and need code workarounds
    //to degrade gracefully.  Like the background texture.
    jt.isLowFuncBrowser = function () {
        var nav;
        if(navigator) {
            nav = navigator;
            // alert("appCodeName: " + nav.appCodeName + "\n" +
            //       "appName: " + nav.appName + "\n" +
            //       "appVersion: " + nav.appVersion + "\n" +
            //       "platform: " + nav.platform + "\n" +
            //       "userAgent: " + nav.userAgent + "\n");
            if(nav.appName === "Microsoft Internet Explorer") {
                return true; } }
        return false;
    };


} () );