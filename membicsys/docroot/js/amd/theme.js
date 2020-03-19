/*global app, jt, confirm, window */

/*jslint browser, white, fudge, long */

// coop.adminlog (array of entries maintained by server)
//   when: ISO date
//   profid: admin that took the action
//   pname: name of admin that took the action
//   action: e.g. "Accepted Membership", "Removed Membic", "Removed Member"
//   target: revid or profid of what or was affected
//   tname: name of profile or review that was affected
//   reason: text given as to why (required for removals)
app.theme = (function () {
    "use strict";

    //Fields that need to be deserialized after fetching.
    var serflds = ["adminlog", "people", "cliset", "preb"];

    ////////////////////////////////////////
    // published functions
    ////////////////////////////////////////
return {

    memberlev: function (tid) {
        if(!tid) {
            return 0; }
        var auth = app.login.authenticated();
        if(!auth) {
            return 0; }
        var theme = app.refmgr.cached("Theme", tid);
        if(theme) {
            if(theme.founders.csvcontains(auth.authId)) {
                return 3; }
            if(theme.moderators.csvcontains(auth.authId)) {
                return 2; }
            if(theme.members.csvcontains(auth.authId)) {
                return 1; } }
        //possibly theme not cached, possibly just following.
        var muser = app.refmgr.cached("MUser", auth.authId);
        if(muser) {
            theme = muser.themes[tid];
            if(theme) {
                return theme.lev || 0; } }
        return 0;
    },


    bycoopid: function (coopid, src, cmd) {
        var solopage = app.solopage();
        var cts = ["review", "membership"];
        if(cts.indexOf(src) >= 0 || solopage) {
            var ctype = "sitev";
            if(solopage) {
                    ctype = "permv"; }
            var data = jt.objdata({ctype:"Theme", parentid:coopid,
                                   field:ctype, profid:app.profile.myProfId(),
                                   refer:app.refer});
            app.fork({
                descr:"bump counters for access to theme " + coopid,
                func:function () {
                    jt.call("POST", "bumpmctr?" + app.login.authparams(), data,
                            function () {
                                app.refer = "";  //only count referrals once
                                jt.log("bumpmctr?" + data + " success"); },
                            function (code, errtxt) {
                                jt.log("bumpmctr?" + data + " failed " + 
                                       code + ": " + errtxt); }); },
                ms:800}); }  //longish delay to avoid blocking current work
        app.pcd.fetchAndDisplay("Theme", coopid, cmd);
    },


    updateCoop: function (coop, callok, callfail) {
        var data;
        app.coop.serializeFields(coop);
        data = jt.objdata(coop, ["preb", "revids"]) +
            "&profid=" + app.profile.myProfId();
        app.coop.deserializeFields(coop);  //if update fails or interim use
        jt.call("POST", "ctmdesc?" + app.login.authparams(), data,
                function (updcoops) {
                    app.refmgr.put(updcoops[0]);
                    app.profile.verifyMembership(updcoops[0]);
                    app.statemgr.setState(updcoops[0]);
                    app.refmgr.uncache("activetps", "411");
                    callok(updcoops[0]); },
                app.failf(function (code, errtxt) {
                    callfail(code, errtxt); }),
                jt.semaphore("coop.updateCoop"));
    },


    applyForMembership: function (coop, memact, contf) {
        //action: apply, withdraw, accrej
        var data = jt.objdata({profid:app.profile.myProfId(),
                               action:memact, coopid:coop.instid});
        jt.call("POST", "ctmmemapply?" + app.login.authparams(), data,
                function (updobjs) {
                    app.lcs.addReplaceAll(updobjs);
                    //No profile.verifyMembership. notices possibly removed.
                    contf(updobjs[0]); },
                function (code, errtxt) {
                    jt.err("membership " + memact + " failed code: " +
                           code + ": " + errtxt);
                    contf(); },
                jt.semaphore("coop.applyForMembership"));
    },


    processMembership: function (coop, pact, pseekid, preason, contf) {
        //action: accept, reject, demote
        var data = jt.objdata({action:pact, profid:app.profile.myProfId(),
                               coopid:coop.dsId, seekerid:pseekid,
                               reason:preason});
        jt.call("POST", "ctmmemprocess?" + app.login.authparams(), data,
                function (updobjs) {
                    app.lcs.addReplaceAll(updobjs);
                    //No profile.verifyMembership. notices possibly removed.
                    contf(updobjs[0]); },
                function (code, errtxt) {
                    jt.err("Membership processing failed code: " + code +
                           ": " + errtxt);
                    contf(); },
                jt.semaphore("coop.processMembership"));
    },


    membershipLevel: function (coop, profid) {
        if(!coop) {
            return 0; }
        if(!profid || profid === "0") {
            profid = app.profile.myProfId(); }
        if(!profid) {
            return 0; }
        var fields = ["members", "moderators", "founders"];
        var lev = 0;
        fields.forEach(function (field, idx) {
            coop[field] = coop[field] || "";
            if(coop[field].csvcontains(profid)) {
                lev = idx + 1; } });  //member:1, moderator:2, founder:3
        return lev;
    },


    memberSummary: function (coop) {
        var summary = [];
        var fields = ["founders", "moderators", "members"];
        fields.forEach(function (field, idx) {
            coop[field].csvarruniq().forEach(function (pid) {
                var pname = coop.people[pid] || pid;
                summary.push({profid:pid, lev:(3 - idx), name:pname}); }); });
        return summary;
    },


    isSeeking: function (coop, profid) {
        if(!coop) {
            return 0; }
        profid = profid || app.profile.myProfId();
        if(coop.seeking && coop.seeking.csvcontains(profid)) {
            return true; }
        return false;
    },


    isRejected: function (coop, profid) {
        if(!coop) {
            return 0; }
        profid = profid || app.profile.myProfId();
        if(coop.rejects && coop.rejects.csvcontains(profid)) {
            return true; }
        return false;
    },


    confirmPostThrough: function (membic) {
        var retval = true;
        if(!membic.ctmids) {  //not posting through, so nothing to check
            return true; }
        var theme; var rejection;
        membic.ctmids.csvarray().every(function (ctmid) {
            theme = app.refmgr.cached("Theme", ctmid);
            if(theme && theme.adminlog) {
                theme.adminlog.every(function (logentry) {
                    if(logentry.action === "Removed Membic" &&
                       logentry.targid === membic.dsId &&
                       logentry.profid !== app.profile.myProfId()) {
                        rejection = logentry;
                        return false; }
                    return true; }); }
            if(rejection) {
                retval = confirm(rejection.pname + 
                                 " previously removed this membic from " + 
                                 theme.name + ". Reason: \"" + 
                                 rejection.reason + "\". Repost anyway?"); }
            return retval; });  //stop on first non-confirmed rejection
        return retval;
    },


    hasFlag: function (ctm, flagname) {
        if(ctm && ctm.cliset && ctm.cliset.flags) {
            return ctm.cliset.flags[flagname]; }
        return false;
    },


    setFlag: function (ctm, flagname, value) {
        ctm.cliset = ctm.cliset || {};
        ctm.cliset.flags = ctm.cliset.flags || {};
        ctm.cliset.flags[flagname] = value;
    },


    serializeFields: function (ctm) {
        //Server-maintained fields are ignored in POST.  They are serialized
        //here for deserialize symmetry and informative transmission logs.
        serflds.forEach(function (field) {
            if(typeof ctm[field] === "object") {
                ctm[field] = JSON.stringify(ctm[field]); } });
    },


    deserializeFields: function (ctm) {
        serflds.forEach(function (field) {
            app.lcs.reconstituteJSONObjectField(field, ctm); });
    }

}; //end of returned functions
}());