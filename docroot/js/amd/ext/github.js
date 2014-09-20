/*global alert: false, window: false, app: false, jt: false */

/*jslint unparam: true, white: true, maxerr: 50, indent: 4 */

app.github = (function () {
    "use strict";

    ////////////////////////////////////////
    // closure variables
    ////////////////////////////////////////

    var svcName = "GitHub",
        iconurl = "img/blacktocat-32.png",


    ////////////////////////////////////////
    // helper functions
    ////////////////////////////////////////

    backToParentDisplay = function () {
        var addAuthOutDiv = jt.cookie("addAuthOutDiv");
        if(addAuthOutDiv) {
            return app.pen.getPen(function (pen) {
                app.profile.displayAuthSettings(addAuthOutDiv, pen); }); }
        return app.login.init();
    },


    recordGitHubAuthorization = function (token, json) {
        var prevLoginToken;
        jt.out('contentdiv', "Restoring session...");
        prevLoginToken = app.login.readAuthCookie();
        if(!prevLoginToken) {
            jt.log("no previous login found on return from GitHub");
            return app.login.init(); }
        jt.out('contentdiv', "Recording GitHub authorization...");
        //the last used pen name will be selected authomatically when
        //pen names are loaded
        app.pen.getPen(function (pen) {
            pen.ghid = json.id;
            app.pen.updatePen(pen,
                              function (updpen) {
                                  backToParentDisplay(); },
                              function (code, errtxt) {
                                  jt.err("record GitHub auth error " + 
                                          code + ": " + errtxt);
                                  pen.ghid = 0;
                                  backToParentDisplay(); }); });
    },


    handleGitHubLogin = function (token, json) {
        jt.out('contentdiv', "<p>Welcome " + json.login + "</p>");
        app.login.setAuth("ghid", token, json.id + " " + json.login);
        //name is not necessarily cool or unique, so not using it as a
        //default pen name value.
        app.login.authComplete();
    },


    convertToken = function (token) {
        var addAuthOutDiv, url;
        addAuthOutDiv = jt.cookie("addAuthOutDiv");
        url = "https://api.github.com/user?access_token=" + token;
        url = jt.enc(url);
        url = "jsonget?geturl=" + url;
        jt.call('GET', url, null,
                 function (json) {
                     if(addAuthOutDiv) {
                         recordGitHubAuthorization(token, json); }
                     else {
                         handleGitHubLogin(token, json); } },
                 app.failf(function (code, errtxt) {
                     jt.log("GitHub authent fetch details failed code " +
                             code + ": " + errtxt);
                     backToParentDisplay(); }),
                jt.semaphore("github.convertToken"));
    };


    ////////////////////////////////////////
    // published functions
    ////////////////////////////////////////
return {

    loginurl: "https://github.com",
    name: svcName, //ascii with no spaces, used as an id
    iconurl: iconurl,

    //This function gets called when you click "Login via GitHub", and
    //when adding authentication, and on return from GitHub.
    authenticate: function (params) {
        var url, state;
        if(params.code) {  //back from github
            jt.out("contentdiv", "Returned from GitHub...");
            state = jt.cookie("githubAuthState");
            if(state !== params.state) {
                jt.log("Bad state returned from GitHub. Sent " + state +
                        " got back " + params.state);
                backToParentDisplay(); }
            url = "githubtok?code=" + params.code + "&state=" + state;
            jt.call('GET', url, null,
                     function (json) {
                         convertToken(json.access_token); },
                     app.failf(function (code, errtxt) {
                         jt.log("GitHub token retrieval failed code " + 
                                 code + ": " + errtxt);
                         backToParentDisplay(); }),
                    jt.semaphore("github.authenticate")); }
        else {  //initial login or authorization call
            state = "AltAuth3" + Math.random().toString(36).slice(2);
            jt.cookie("githubAuthState", state, 2);
            url = "https://github.com/login/oauth/authorize" +
                "?client_id=be02d0691db630ee69c7" +
                "&redirect_uri=" + jt.enc("http://www.fgfweb.com/") +
                //no scope (public read-only access)
                "&state=" + state;
            window.location.href = url; }
    },


    addProfileAuth: function (domid, pen) {
        if(window.location.href.indexOf(app.mainsvr) !== 0) {
            alert("GitHub authentication is only supported from ",
                  app.mainsvr);
            return app.profile.displayAuthSettings(domid, pen); }
        jt.cookie("addAuthOutDiv", domid, 2);
        app.github.authenticate( {} );
    }


};  //end of returned functions
}());

