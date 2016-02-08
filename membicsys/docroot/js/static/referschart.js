/*global d3, stat, jt, window */
/*jslint browser, multivar, white, fudge */

stat.rc = (function () {
    "use strict";

    ////////////////////////////////////////
    // closure variables
    ////////////////////////////////////////

    var dispdiv = null,
        nextdiv = null,
        offh = null,
        dat = null,
        rc = {},


    ////////////////////////////////////////
    // helper functions
    ////////////////////////////////////////

    makeNodes = function () {
        rc.nodes = [];
        rc.nos = {};
        rc.nr = {min: 1, max: 1};
        dat.days.forEach(function (day) {
            if(day.refers) {
                if(typeof day.refers === "string") {
                    day.refers = day.refers.split(","); }
                day.refers.forEach(function (rv) {
                    var rves, node;
                    rves = rv.split(":");
                    if(rves.length === 2) {  //skip any bad entries
                        node = {id: rves[0],
                                name: jt.dec(rves[0]),
                                value: +rves[1]};
                        if(!rc.nos[node.id]) {
                            rc.nos[node.id] = node;
                            rc.nodes.push(node); }
                        else {
                            node = rc.nos[node.id];
                            node.value += +rves[1]; }
                        rc.nr.max = Math.max(rc.nr.max, node.value); } });
            } });
        // rc.nodes = [{id: "testA", name: "testA actually has a really long name which comes up when you mouse over it", value: 4},
        //             {id: "testB", name: "testB", value: 3},
        //             {id: "testD", name: "testD", value: 1},
        //             {id: "testE", name: "testE", value: 7},
        //             {id: "testC", name: "testC", value: 2}];
    },


    computeDims = function () {
        var margin;
        margin = {top: 10, right: 20, bottom: 10, left: 20};
        rc.diam = window.innerWidth - (margin.left + margin.right);
        rc.margin = margin;
    },


    adjustContentDisplay = function () {
        var miny = rc.diam,
            maxy = 0, adjh, adjp = 1.0;
        rc.nodes.forEach(function (node) {
            var nodey = node.y - node.r;
            nodey = Math.floor(nodey) - rc.margin.top;
            miny = Math.min(miny, nodey);
            nodey = node.y + node.r;
            nodey = Math.ceil(nodey) + rc.margin.bottom;
            maxy = Math.max(maxy, nodey); });
        if(!offh) {
            offh = jt.byId(dispdiv).offsetHeight; }
        else {
            adjp = jt.byId(dispdiv).offsetHeight / offh; }
        //Scroll the blank top out of the top of the enclosing div:
        rc.bcon.attr("transform", "translate(0,-" + miny + ")");
        //Do not resize the svg containment or the whole chart will be shrunk.
        if(nextdiv) {
            //total height - bottom bubble coordinate, adjusted for scroll
            adjh = (rc.diam - maxy) + miny - rc.margin.bottom;
            adjh = Math.round(adjh * adjp);
            jt.byId(nextdiv).style.marginTop = String(-1 * adjh) + "px"; }
    },


    drawContents = function () {
        rc.bcon = rc.svg.append("g")
            .attr("class", "nodecontainer");
        rc.nbs = rc.bcon.selectAll(".node")
            .data(rc.bpack.nodes({children: rc.nodes})
                  .filter(function (d) { return !d.children; }))
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")"; });
        rc.nbs.append("title")
            .text(function (d) {
                return d.name + ": " + rc.format(d.value); });
        rc.nbs.append("circle")
            .attr("r", function (d) { return d.r; })
            .attr("id", function (d) { return "circle" + d.id; })
            .style({"fill": "#fd700a", "stroke": "#b9100f"})
            .on("mouseover", function (d) { stat.rc.mo(d, true); })
            .on("mouseout", function (d) { stat.rc.mo(d, false); });
        rc.nbs.append("text")
            .attr("dy", ".3em")
            .attr("id", function (d) { return "textlabel" + d.id; })
            .style({"font-size": "20px", "text-anchor": "middle"})
            .text(function (d) { 
                d.shortname = jt.ellipsis(d.name, d.r / 6);
                return d.shortname; })
            .on("mouseover", function (d) { stat.rc.mo(d, true); })
            .on("mouseout", function (d) { stat.rc.mo(d, false); });
        adjustContentDisplay();
        if(window.addEventListener) {
            window.addEventListener("resize", adjustContentDisplay); }
    },
        

    drawChart = function () {
        computeDims();
        rc.format = d3.format(",d");
        rc.bpack = d3.layout.pack()
            .sort(null)
            .size([rc.diam, rc.diam])
            .padding(1.5);
        rc.svg = d3.select("#" + dispdiv).append("svg")
            .attr({"width": "98%", "height": "98%",
                   "viewBox": "0 0 " + rc.diam + " " + rc.diam,
                   "preserveAspectRatio": "xMidYMid",
                   "class": "bubble"});
        // rc.svg.append("rect")
        //     .attr({"x": 0, "y": 0, "width": rc.diam, "height": rc.diam,
        //            "fill": "#fff"});
        rc.nodes.sort(function (a, b) {
            return a.name.localeCompare(b.name); });
        drawContents();
    };


    ////////////////////////////////////////
    // published functions
    ////////////////////////////////////////
return {

    display: function (divid, data, nextdivid) {
        dispdiv = divid;
        nextdiv = nextdivid;
        dat = data;
        makeNodes();
        if(rc.nodes && rc.nodes.length > 1) {
            drawChart(); }
    },


    mo: function (d, over) {
        if(over) {
            jt.byId("circle" + d.id).style.fill = "#ff900a";
            jt.byId("textlabel" + d.id).textContent = d.name; }
        else {
            jt.byId("circle" + d.id).style.fill = "#fd700a";
            jt.byId("textlabel" + d.id).textContent = d.shortname; }
    }

}; //end of returned functions
}());

