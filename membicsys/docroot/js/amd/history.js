/*global window, document, history, JSON, app, jt */

/*jslint browser, white, fudge */

////////////////////////////////////////
// history utility methods
//

app.history = (function () {
    "use strict";

    function getTitle (ignore /*state*/) {
        var title = document.title;
        return title;
    }


    function getURL (ignore /*state*/) {
        var url = window.location.href;
        return url;
    }


    function indicateState (/*state*/) {
        //This used to display a "home" clickable icon if state.view
        //was anything other than "activity", but that looks like
        //visual graffiti.  Buttons need to remain static so they are
        //recognized as stable anchor points for navigation.
        jt.out("topdiv", "");
    }


    ////////////////////////////////////////
    // closure exposed functions
    ////////////////////////////////////////

return {

    //if the view or profid has changed, then push a history record.
    //if anything else has changed, replace the current history record.
    //otherwise no effect.
    checkpoint: function (pstate) {
        var title; var url;
        indicateState(pstate);
        if(history) {  //verify history object defined, otherwise skip
            var hstate = history.state;
            if(!hstate 
               || hstate.view !== pstate.view 
               || hstate.profid !== pstate.profid
               || hstate.penid !== pstate.penid
               || hstate.revid !== pstate.revid) {
                if(history.pushState && 
                   typeof history.pushState === "function") {
                    title = getTitle(pstate);
                    url = getURL(pstate);
                    history.pushState(pstate, title, url);
                    jt.log("history.pushState: " + 
                            JSON.stringify(pstate) +
                            ", title: " + title + ", url: " + url); 
                } }
            else if(pstate.tab && hstate.tab !== pstate.tab) {
                if(history.replaceState &&
                   typeof history.replaceState === "function") {
                    title = getTitle(pstate);
                    url = getURL(pstate);
                    history.replaceState(pstate, title, url);
                    jt.log("history.replaceState: " + 
                            JSON.stringify(pstate) +
                            ", title: " + title + ", url: " + url); 
                } } }
    },


    dispatchState: function (state) {
        state = state || app.history.currState();
        //jt.log("history.dispatchState " + jt.objdata(state));
        indicateState(state);
        switch(state.view) {
        case "themes":
            return app.themes.display();
        case "coop":
            return app.coop.bycoopid(state.coopid, "history", state.action);
        case "profile":
            return app.profile.byprofid(state.profid, state.action);
        default:
            jt.log("history.dispatchState unknown state: " + state);
        }
    },


    pop: function (event) {
        var state;
        if(event) {
            state = event.state; }
        jt.log("historyPop: " + JSON.stringify(state));
        if(state && state.view) {
            app.history.dispatchState(state); }
        //if there is no state, then this was a call from the browser
        //resulting from a script error or user action outside of the scope
        //of the app (like trying to back-button to a previous site).  That
        //should not be handled here or the site gets sticky in a not good
        //way and errors cause weird display changes.
    },


    currState: function () {
        var state = {};
        if(history && history.state) {
            state = history.state; }
        return state;
    }

}; //end of returned functions
}());

