/*global alert: false, console: false, escape: false, unescape: false, confirm: false, setTimeout: false, window: false, document: false, history: false, mor: false */

/*jslint regexp: true, unparam: true, white: true, maxerr: 50, indent: 4 */

var mor = {};  //Top level function closure container

////////////////////////////////////////
// m o r   top level methods and variables
//
(function () {
    "use strict";

    ////////////////////////////////////////
    // app variables
    ////////////////////////////////////////

    mor.sessiontoken = "";
    mor.sesscook = "morsession=";
    mor.y = null;
    mor.colors = { bodybg: "#fffff6",
                   text: "#111111",
                   link: "#3150b2",
                   hover: "#3399cc" };

    ////////////////////////////////////////
    // general utility functions
    ////////////////////////////////////////

    //TODO: history push/pop
    //TODO: window resize adjustment

    //shorthand to log text to the console
    mor.log = function (text) {
        try {
            if(console && console.log) {
                console.log(text); }
        } catch(problem) {  //most likely a bad IE console def, just skip it
        }
    };


    //when you really want the DOM element, not the library node wrapper
    mor.byId = function (elemid) {
        return document.getElementById(elemid);
    };


    //output via the library so it can do housekeeping if it needs to
    mor.out = function (html, domid) {
        var node = mor.y.one("#" + domid);
        if(node) {
            node.setHTML(html); }
        else {
            mor.log("DOM id " + domid + " not available for output"); }
    };


    //factored method to handle a click with no propagation
    mor.onclick = function (divid, func) {
        var node = mor.y.one("#" + divid);
        node.on("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                func(); });
    };


    //factored method to handle a change with no propagation
    mor.onchange = function (divid, func) {
        var node = mor.y.one("#" + divid);
        node.on("change", function (e) {
                e.preventDefault();
                e.stopPropagation();
                func(); });
    };


    //general key handling
    mor.onescapefunc = null;
    mor.globkey = function (e) {
        if(e && e.keyCode === 27) {  //ESC
            if(mor.onescapefunc) {
                e.preventDefault();
                e.stopPropagation();
                mor.onescapefunc(); } }
    };


    mor.prefixed = function (string, prefix) {
        if(string && string.indexOf(prefix) === 0) {
            return true; }
        return false;
    };


    //top level kickoff function called from index.html
    mor.init = function (Y) {
        mor.y = Y;
        mor.layout.init();
        mor.y.on("keypress", mor.globkey);
        mor.login.init();
        //mor.skinner.init();
    };

} () );



////////////////////////////////////////
// m o r . l a y o u t
//
(function () {
    "use strict";

    var


    closeDialog = function () {
        mor.out("", 'dlgdiv');
        mor.byId('dlgdiv').style.visibility = "hidden";
        mor.layout.adjust();
        mor.onescapefunc = null;
    },


    displayDocContent = function (url, html) {
        var bodyidx;
        if(!html || !html.trim()) {
            html = url + " contains no text"; }
        bodyidx = html.indexOf("<body>");
        if(bodyidx > 0) {
            html = html.slice(bodyidx + "<body>".length,
                              html.indexOf("</body")); }
        html = "<div id=\"closeline\">" +
          "<a id=\"closedlg\" href=\"#close\">&lt;close&nbsp;&nbsp;X&gt;</a>" +
          "</div>" + html;
        mor.out(html, 'dlgdiv');
        mor.onclick('closedlg', closeDialog);
        mor.onescapefunc = closeDialog;
    },


    relativeToAbsolute = function (url) {
        var loc = window.location.href;
        loc = loc.slice(0, loc.lastIndexOf("/") + 1);
        return loc + url;
    },


    displayDoc = function (url) {
        var html = "Fetching " + url + " ...";
        mor.out(html, 'dlgdiv');
        mor.byId('dlgdiv').style.visibility = "visible";
        if(url.indexOf(":") < 0) {
            url = relativeToAbsolute(url); }
        mor.y.io(url, { method: 'GET',
            on: { complete: function (transid, resp) {
                        displayDocContent(url, resp.responseText); } } });
    },


    localDocLinks = function () {
        var nodelist = mor.y.all('a');
        nodelist.each(function (node) {
                var href = node.getAttribute("href");
                if(href && href.indexOf("docs/") === 0) {
                    node.on("click", function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            displayDoc(this.getAttribute("href")); }); 
                } });
    },


    fullContentHeight = function () {
        var ch = mor.byId("content").offsetHeight,
            wh = window.innerHeight - 110,
            filldiv = mor.byId("contentfill");
        if(ch < wh) {
            filldiv.style.height = (wh - ch) + "px"; }
        else {  //not filling, just leave a little separator space
            filldiv.style.height = "16px"; }
    };


    mor.layout = {
        init: function () {
            mor.y.on('windowresize', fullContentHeight);
            localDocLinks();
            fullContentHeight(); },
        adjust: function () {
            fullContentHeight(); }
    };

} () );


////////////////////////////////////////
// m o r . l o g i n
//
(function () {
    "use strict";

    var loginprompt = "Login is currently restricted to developers only.",

    userpassLogin = function () {
        var username, password, statmsg;
        username = mor.byId('userin').value;
        password = mor.byId('passin').value;
        if(!username || !password || !username.trim() || !password.trim()) {
            statmsg = "Please specify a username and password"; }
        else {
            username = username.trim();
            password = password.trim();
            statmsg = "Server not connected yet..."; }
        mor.out(statmsg, 'loginstatdiv');
        setTimeout(function () {
                mor.out(loginprompt, 'loginstatdiv');
                mor.byId('userin').value = "";
                mor.byId('passin').value = "";
                mor.byId('userin').focus(); }, 1800);
    },


    displayForm = function () {
        var cdiv, ldiv, html = "";
        cdiv = mor.byId('content');
        ldiv = document.createElement('div');
        ldiv.setAttribute('id','logindiv');
        cdiv.appendChild(ldiv);
        html +=  "<div id=\"loginstatdiv\">&nbsp;</div>" +
        "<table>" +
          "<tr>" +
            "<td align=\"right\">username</td>" +
            "<td align=\"left\">" +
              "<input type=\"text\" id=\"userin\" size=\"20\"/></td>" +
          "</tr>" +
          "<tr>" +
            "<td align=\"right\">password</td>" +
            "<td align=\"left\">" +
              "<input type=\"password\" id=\"passin\" size=\"20\"/></td>" +
          "</tr>" +
          "<tr>" +
            "<td colspan=\"2\" align=\"center\">" +
              "<button type=\"button\" id=\"loginbutton\">Login</button>" +
            "</td>" +
          "</tr>" +
        "</table>";
        mor.out(html, 'logindiv');
        mor.onclick('loginbutton', userpassLogin);
        mor.onchange('userin', function () { mor.byId('passin').focus(); });
        mor.onchange('passin', userpassLogin);
        mor.layout.adjust();
        mor.byId('userin').focus();
        mor.out(loginprompt, 'loginstatdiv');
    };


    mor.login = {
        init: function () {
            displayForm(); }
    };

} () );


////////////////////////////////////////
// m o r . s k i n n e r 
//
(function () {
    "use strict";

    var oldcolors,
        colorcontrols,
        presets = [ { name: "paper (warm)", id: "paperw", 
                      bodybg: "#fffff6", text: "#111111",
                      link: "#3150b2", hover: "#3399cc" },
                    { name: "paper (cool)", id: "paperc",
                      bodybg: "#f8f8f8", text: "#000000",
                      link: "#006666", hover: "#3399cc" },
                    { name: "sky", id: "sky",
                      bodybg: "#caf1f8", text: "#000000",
                      link: "#ae464b", hover: "#fc464b" },
                    { name: "pink", id: "pink",
                      bodybg: "#ffeef3", text: "#000000",
                      link: "#dd464b", hover: "#ff464b" },
                    { name: "matrix", id: "matrix",
                      bodybg: "#000000", text: "#00cc00",
                      link: "#006666", hover: "#3399cc" }
                  ],


    copycolors = function (colors) {
        var cc = { bodybg: colors.bodybg,
                   text: colors.text,
                   link: colors.link,
                   hover: colors.hover };
        return cc;
    },


    safeSetColorProp = function (rule, color) {
        if(rule.style.setProperty) {
            rule.style.setProperty('color', color, null); }
    },


    updateColors = function () {
        var rules, i;
        mor.byId('bodyid').style.backgroundColor = mor.colors.bodybg;
        mor.byId('bodyid').style.color = mor.colors.text;
        rules = document.styleSheets[0].cssRules;
        for(i = 0; i < rules.length; i += 1) {
            if(mor.prefixed(rules[i].cssText, "A:link")) {
                safeSetColorProp(rules[i], mor.colors.link); }
            else if(mor.prefixed(rules[i].cssText, "A:visited")) {
                safeSetColorProp(rules[i], mor.colors.link); }
            else if(mor.prefixed(rules[i].cssText, "A:active")) {
                safeSetColorProp(rules[i], mor.colors.link); }
            else if(mor.prefixed(rules[i].cssText, "A:hover")) {
                safeSetColorProp(rules[i], mor.colors.hover); } }
    },


    dialogCancel = function () {
        var div = mor.byId('dlgdiv');
        mor.colors = oldcolors;
        updateColors();
        div.style.visibility = "hidden";
    },


    dialogOk = function () {
        var div = mor.byId('dlgdiv');
        div.style.visibility = "hidden";
    },


    colorToColorArray = function (color) {
        var cvals;
        color = color.toUpperCase();
        cvals = [ parseInt(color.slice(0,2), 16),
                  parseInt(color.slice(2,4), 16),
                  parseInt(color.slice(4,6), 16) ];
        return cvals;
    },


    colorArrayToColor = function (cvals) {
        var color = "#", val, i;
        for(i = 0; i < cvals.length; i += 1) {
            val = cvals[i].toString(16);
            if(val.length < 2) {
                val = "0" + val; }
            color += val; }
        return color;
    },


    colorAdjust = function (colorfield, index, bump) {
        var color = mor.colors[colorfield], cvals;
        color = color.slice(1);   //remove leading "#"
        cvals = colorToColorArray(color);
        cvals[index] += bump;
        if(cvals[index] > 255) { cvals[index] = 255; }
        if(cvals[index] < 0) { cvals[index] = 0; }
        color = colorArrayToColor(cvals);
        return color;
    },


    safeSetColor = function (colorfield, domid, color) {
        var cvals, i;
        if(color.indexOf("#") === 0) {
            color = color.slice(1); }
        if(color.length === 3) {  //e.g. #ccc
            color = color.slice(0,1) + color.slice(0,1) +
                    color.slice(1,2) + color.slice(1,2) +
                    color.slice(2) + color.slice(2); }
        if(color.length !== 6) {
            alert("Not a valid html color code.");
            return; }
        cvals = colorToColorArray(color);
        for(i = 0; i < cvals.length; i += 1) {
            if(typeof cvals[i] !== "number" ||
               cvals[i] < 0 || cvals[i] > 255) {
                alert("Not a valid html color code.");
                return; } }
        color = colorArrayToColor(cvals);
        mor.colors[colorfield] = color;
        mor.byId(domid).value = color;
        updateColors();
    },


    colorControl = function (domid, colorfield) {
        var node = mor.y.one("#" + domid);
        node.on("change", function (e) {
                var color = mor.byId(domid).value;
                e.preventDefault();
                e.stopPropagation();
                safeSetColor(colorfield, domid, color);
                updateColors(); });
        node.on("keypress", function (e) {
                var outval = e.keyCode;
                switch(e.keyCode) {
                case 82:  //R - increase Red
                    outval = colorAdjust(colorfield, 0, 1); break;
                case 114: //r - decrease Red
                    outval = colorAdjust(colorfield, 0, -1); break;
                case 71:  //G - increase Green
                    outval = colorAdjust(colorfield, 1, 1); break;
                case 103: //g - decrease Green
                    outval = colorAdjust(colorfield, 1, -1); break;
                case 85:  //U - increase Blue
                    outval = colorAdjust(colorfield, 2, 1); break;
                case 117: //u - decrease Blue
                    outval = colorAdjust(colorfield, 2, -1); break;
                }
                if(typeof outval === "string") {
                    e.preventDefault();
                    e.stopPropagation();
                    mor.colors[colorfield] = outval;
                    mor.byId(domid).value = outval;
                    updateColors(); } });
        colorcontrols.push([domid, colorfield]);
    },


   setControlValuesAndUpdate = function (colors) {
       var i, input;
       for(i = 0; i < colorcontrols.length; i += 1) {
           input = mor.byId(colorcontrols[i][0]);
           input.value = colors[colorcontrols[i][1]]; }
       mor.colors = copycolors(colors);
       updateColors();
   },


    setColorsFromPreset = function () {
        var i, sel = mor.byId('presetsel');
        for(i = 0; i < sel.options.length; i += 1) {
            if(sel.options[i].selected) {
                setControlValuesAndUpdate(presets[i]);
                break; } }
    },


    presetSelectorHTML = function () {
        var html, i;
        html = "<table>" +
          "<tr>" + 
            "<td align=\"right\">Starting preset skin</td>" +
            "<td align=\"left\">" +
                "<select id=\"presetsel\">";
        for(i = 0; i < presets.length; i += 1) {
            html += "<option id=\"" + presets[i].id + "\">" + 
                presets[i].name + "</option>"; }
        html += "</select>" +
          "</tr>" +
        "</table>";
        return html;
    },


    colorControlsHTML = function () {
        var link = "", hover = "", html;
        if(document.styleSheets[0].cssRules[0].style.setProperty) {
            link = "</td>" +
            "<td align=\"right\">link</td>" +
            "<td align=\"left\">" + 
              "<input type=\"text\" id=\"linkin\" size=\"7\"" + 
                    " value=\"" + mor.colors.link + "\"/>" + 
                "</td>";
            hover = "</td>" +
            "<td align=\"right\">hover</td>" +
            "<td align=\"left\">" + 
              "<input type=\"text\" id=\"hoverin\" size=\"7\"" + 
                    " value=\"" + mor.colors.hover + "\"/>" + 
                "</td>"; }
        html = "R/r, G/g, U/u to adjust Red/Green/Blue..." +
        "<table>" +
          "<tr>" +
            "<td align=\"right\">background</td>" +
            "<td align=\"left\">" + 
              "<input type=\"text\" id=\"bgbodyin\" size=\"7\"" + 
                    " value=\"" + mor.colors.bodybg + "\"/></td>" + 
            link + 
          "</tr>" +
          "<tr>" +
            "<td align=\"right\">text</td>" +
            "<td align=\"left\">" + 
              "<input type=\"text\" id=\"textcolin\" size=\"7\"" + 
                    " value=\"" + mor.colors.text + "\"/></td>" + 
            hover +
          "</tr>" +
          "<tr>" +
            "<td colspan=\"4\" align=\"center\">" + 
              "<button type=\"button\" id=\"skincancel\">Cancel</button>" +
              "&nbsp;" +
              "<button type=\"button\" id=\"skinok\">Ok</button>" +
            "</td>" +
          "</tr>" +
        "</table>";
        return html;
    },


    displayDialog = function () {
        var html, div;
        oldcolors = copycolors(mor.colors);
        colorcontrols = [];
        html = presetSelectorHTML() + colorControlsHTML();
        mor.out(html, 'dlgdiv');
        div = mor.byId('dlgdiv');
        div.style.visibility = "visible";
        mor.onclick('skincancel', dialogCancel);
        mor.onclick('skinok', dialogOk);
        colorControl("bgbodyin", "bodybg");
        colorControl("textcolin", "text");
        if(document.styleSheets[0].cssRules[0].style.setProperty) {
            colorControl("linkin", "link");
            colorControl("hoverin", "hover"); }
        mor.y.one("#presetsel").on("change", function (e) {
                e.preventDefault();
                e.stopPropagation();
                setColorsFromPreset(); });
    },


    createSkinnerLink = function () {
        var html;
        html = "<a href=\"skinit.html\" id=\"skinit\">skin it</a>";
        mor.out(html, 'topdiv');
        mor.onclick('skinit', displayDialog);
    };


    mor.skinner = {
        init: function () {
            createSkinnerLink(); }
    };

} () );

