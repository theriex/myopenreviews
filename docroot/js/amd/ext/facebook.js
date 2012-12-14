/*global define: false, alert: false, console: false, confirm: false, setTimeout: false, window: false, document: false, history: false, mor: false, FB: false */

/*jslint regexp: true, unparam: true, white: true, maxerr: 50, indent: 4 */

////////////////////////////////////////
// m o r . f a c e b o o k
//
define([], function () {
    "use strict";

    var svcName = "Facebook",  //no spaces in name, used as an id
        tmprev,  //temporary review holder for posting process
    

    facebookWelcome = function (loginResponse) {
        var html = "<p>&nbsp;</p>" + 
            "<p>Facebook login success! Fetching your info...</p>";
        mor.out('contentdiv', html);
        FB.api('/me', function (infoResponse) {
            html = "<p>&nbsp;</p><p>Welcome " + infoResponse.name + "</p>";
            mor.out('contentdiv', html);
            mor.login.setAuth("fbid", loginResponse.authResponse.accessToken,
                              infoResponse.id + " " + infoResponse.name);
            //The facebook name is NOT a good default pen name since it
            //is unlikely to be unique, and creativity on pen names is good.
            mor.login.authComplete(); });
    },


    facebookLoginFormDisplay = function (loginResponse, domid, 
                                         okfstr, cancelfstr) {
        var msg, html;
        if(loginResponse.status === "not_authorized") {
            msg = "You have not yet authorized MyOpenReviews," +
                " click to authorize."; }
        else {
            msg = "You are not currently logged into Facebook," +
                " click to log in."; }
        html = "<p>&nbsp;</p><p>" + msg + "</p><table><tr>" + 
            "<td><a href=\"http://www.facebook.com\"" +
                  " title=\"Log in to Facebook\"" +
                  " onclick=\"mor.facebook." + okfstr + ";return false;\"" +
                "><img class=\"loginico\" src=\"img/f_logo.png\"" +
                     " border=\"0\"/> Log in to Facebook</a></td>";
        if(cancelfstr) {
            html += "<td>&nbsp;" + 
              "<button type=\"button\" id=\"cancelbutton\"" +
                     " onclick=\"" + cancelfstr + ";return false;\"" +
              ">Cancel</button></td>"; }
        html += "</tr></table>";
        mor.out(domid, html);
        if(cancelfstr) {  //not already in a dialog...
            mor.layout.adjust(); }
    },


    handleFBLogin = function () {
        FB.login(function (loginResponse) {
            if(loginResponse.status === "connected") {
                facebookWelcome(loginResponse); }
            else {
                mor.login.init(); } });
    },


    checkFBLogin = function () {
        FB.getLoginStatus(function (loginResponse) {
            if(loginResponse.status === "connected") {
                facebookWelcome(loginResponse); }
            else {
                facebookLoginFormDisplay(loginResponse, 'contentdiv',
                                         "loginFB()", "mor.login.init()"); } 
        });
    },


    loadFacebook = function (nextfunc) {
        var js, id = 'facebook-jssdk', firstscript, html;
        window.fbAsyncInit = function () {
            FB.init({ appId: 265001633620583, 
                      status: true, //check login status
                      cookie: true, //enable server to access the session
                      xfbml: true });
            nextfunc(); };
        //Load the FB SDK asynchronously if not already loaded
        if(mor.byId(id)) {
            return; }
        js = document.createElement('script');
        js.id = id;
        js.async = true;
        js.src = "//connect.facebook.net/en_US/all.js";
        firstscript = document.getElementsByTagName('script')[0];
        firstscript.parentNode.insertBefore(js, firstscript);
        html = "<p>&nbsp;</p><p>Loading Facebook API...</p>";
        mor.out('contentdiv', html);
        mor.layout.adjust();
    },


    addProfileAuth3 = function (domid, pen, fbUserID) {
        var fbid;
        if(!fbUserID) {
            mor.err("No userID received from Facebook");
            return mor.profile.displayAuthSettings(domid, pen); }
        fbid = parseInt(fbUserID, 10);
        if(!fbid || fbid <= 0) {
            mor.err("Invalid userID received from Facebook");
            return mor.profile.displayAuthSettings(domid, pen); }
        mor.out(domid, "Recording Facebook authorization...");
        pen.fbid = fbid;
        mor.pen.updatePen(pen,
                          function (updpen) {
                              mor.profile.displayAuthSettings(domid, updpen); },
                          function (code, errtxt) {
                              mor.err("facebook.addProfileAuth3 error " +
                                      code + ": " + errtxt);
                              pen.fbid = 0;
                              mor.profile.displayAuthSettings(domid, pen); });
    },


    addProfileAuth2 = function (domid, pen) {
        FB.getLoginStatus(function (loginResponse) {
            if(loginResponse.status === "connected") {
                addProfileAuth3(domid, pen, 
                                loginResponse.authResponse.userID); }
            else {
                facebookLoginFormDisplay(loginResponse, domid, 
                                         "authFB('" + domid + "')"); } 
        });
    },


    addProfileAuth1 = function (domid, pen) {
        if(window.location.href.indexOf(mor.login.mainServer) !== 0) {
            alert("Facebook authentication is only supported from ",
                  mor.login.mainServer);
            return mor.profile.displayAuthSettings(domid, pen); }
        if(typeof FB === 'object' || typeof FB === 'function') {
            return addProfileAuth2(domid, pen); }
        loadFacebook(function () {
            addProfileAuth2(domid, pen); });
    },


    handleFBProfileAuth = function (domid) {
        FB.login(function (loginResponse) {
            if(loginResponse.status === "connected") {
                mor.pen.getPen(function (pen) {
                    addProfileAuth3(domid, pen,
                                    loginResponse.authResponse.userID); 
                }); }
            else {
                mor.pen.getPen(function (pen) {
                    mor.profile.displayAuthSettings(domid, pen); }); }
        });
    },


    authenticate = function () {
        try {
            if(mor.isDefined(FB)) {
                return checkFBLogin(); }
        } catch (e) {
            mor.log("facebook.js authenticate error: " + e);
        }
        loadFacebook(checkFBLogin);
    },


    closeOverlay = function () {
        var odiv = mor.byId('overlaydiv');
        odiv.innerHTML = "";
        odiv.style.visibility = "hidden";
    },


    postRevBailout = function (review) {
        review.svcdata[svcName] = "bailout";
        mor.pen.getPen(function (pen) {
            mor.services.runServices(pen, review); });
    },


    postReview4 = function (review) {
        var fblinkname, fblinkurl, fbimage, fbprompt;
        fblinkname = mor.services.getRevStarsTxt(review) + " " +
            mor.services.getRevTitleTxt(review);
        fblinkurl = "http://www.myopenreviews.com/#view=profile" + 
            "&profid=" + review.penid;
        fbimage = mor.services.getRevTypeImage(review);
        fbprompt = "Check this out if...";
        FB.ui({ method: 'feed',  //use the feed dialog...
                message: review.revtype + " review",
                name: fblinkname,
                caption: review.keywords,
                description: review.text,
                link: fblinkurl,
                picture: fbimage,
                actions: [ { name: 'profile', link: fblinkurl } ],
                user_message_prompt: fbprompt },
              function (response) {
                  if(response && response.post_id) {
                      review.svcdata[svcName] = response.post_id; }
                  else {
                      review.svcdata[svcName] = 'nopost'; } });
    },


    postReview3 = function (review) {
        FB.login(function (loginResponse) {
            closeOverlay();
            mor.onescapefunc = null;
            if(loginResponse.status === "connected") {
                postReview4(review); }
            else {
                postRevBailout(review); } });
    },


    postReview2 = function (review) {
        FB.getLoginStatus(function (loginResponse) {
            var odiv;
            if(loginResponse.status === "connected") {
                postReview4(review, 
                            loginResponse.authResponse.userID); }
            else {
                tmprev = review;
                odiv = mor.byId('overlaydiv');
                odiv.style.top = "80px";
                odiv.style.visibility = "visible";
                odiv.style.backgroundColor = mor.skinner.lightbg();
                mor.onescapefunc = function () {
                    closeOverlay();
                    postRevBailout(); };
                facebookLoginFormDisplay(loginResponse, 'overlaydiv',
                                         "postTmpRev()", "bailTmpRev()"); }
        });
    },


    postReview1 = function (review) {
        if(window.location.href.indexOf(mor.login.mainServer) !== 0) {
            alert("Posting to Facebook is only supported from ",
                  mor.login.mainServer);
            return postRevBailout(review); }
        if(typeof FB === 'object' || typeof FB === 'function') {
            return postReview2(review); }
        loadFacebook(function () {
            postReview2(review); });
    };
            

    return {
        loginurl: "https://www.facebook.com",
        name: svcName,  //no spaces in name, used as an id
        svcDispName: "Facebook Wall Post",
        svcDesc: "Posts a review to your wall",
        iconurl: "img/f_logo.png",
        loginFB: function () {
            handleFBLogin(); },
        authenticate: function () {
            authenticate(); },
        addProfileAuth: function (domid, pen) {
            addProfileAuth1(domid, pen); },
        authFB: function (domid) {
            handleFBProfileAuth(domid); },
        doPost: function (review) {
            postReview1(review); },
        postTmpRev: function () {
            closeOverlay();
            postReview3(tmprev); },
        bailTmpRev: function () {
            closeOverlay();
            postRevBailout(tmprev); }
    };

});

