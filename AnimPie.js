// http://opensource.org/licenses/MIT
//Copyright (c) 2014 Giles Middleton (@GilesDMiddleton, gilesey.wordpress.com)
//
//Permission is hereby granted, free of charge, to any person obtaining a copy
//of this software and associated documentation files (the "Software"), to deal
//in the Software without restriction, including without limitation the rights
//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//copies of the Software, and to permit persons to whom the Software is
//furnished to do so, subject to the following conditions:
//The above copyright notice and this permission notice shall be included in
//all copies or substantial portions of the Software.
//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//THE SOFTWARE.

// This class makes an animated pie chart appear, rotate and then show the percentage values.
// Usage: AnimPie.makePie([30, 50, 40, 20, 10, 32], "c");
// "c" is the canvas element (for now ~500,500px width).

// Lots more to do:
// extract out common math functions
// Make this part of a bigger library?
// allow configuration of durations, radius extensions
// allow plugin of colours
// review the animation mechanism/maybe do this in D3?
// performance tune/tweak/use tweens?
// review comments etc

var AnimPie = (function () {
    'use strict';
    var settings; // unused right now

    // UTILS
    // why isn't this already standard!
    function radsToDegrees(rad) {
        // afford some level of protection to keep degrees 0-360
        if (rad < 0) {
            return raddegrees(rad + (2 * Math.PI));
        }
        return (rad * (180 / Math.PI)) % 360;
    }

    function degsToRadians(deg) {
        // afford some level of protection to keep radians 0-2pi
        if (deg < 0) {
            return degsToRadians((deg + 360) % 360);
        }
        return deg * (Math.PI / 180);
    }

    // gets the distance between two points http://en.wikipedia.org/wiki/Distance
    function getEuclidianDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));
    }

    // store the state of each arc
    function Arc() {
        this.value = 0; // the value in data terms 
        this.percent = 0; // the percentage of this value compared to the total (calculated)
        this.radians = 0; // the number of radians this arc comprises of
        this.startRadians = 0; // where this current arc starts
        this.endRadians = 0; // where this current arc stops
        this.radius = 0; // the radius from origin
        this.originX = 0; // the origin
        this.originY = 0; // the origin
    }

    // set the origin coordinates of all arcs to x and y
    function setArcsOrigin(context, x, y) {
        var arrayLength = context.arcs.length;
        for (var i = 0; i < arrayLength; i++) {
            context.arcs[i].originX = x;
            context.arcs[i].originY = y;
        }
    }

    // construct an array of arcs from the array of data
    function getArcsFromData(data) {
        var arrayLength = data.length;
        var i = 0;
        var total = 0; // total amount of all values, to calculate a percentage
        var arcs = []; // primary return object - an array of arc structures
        var newArc; // each iteration of the loop creates a new arc

        // calculate total to work out percentages
        for (i = 0; i < arrayLength; i++) {
            total += data[i];
        }

        // fill in arc properties, each arc's length is proportional to the 
        // percentage of the total.
        for (i = 0; i < arrayLength; i++) {
            newArc = new Arc();
            newArc.value = data[i];
            newArc.percent = (newArc.value / total) * 100;
            newArc.radians = degsToRadians((360 / 100) * newArc.percent);
            if (i > 0) {
                newArc.startRadians = arcs[i - 1].endRadians;
            }
            newArc.endRadians = newArc.startRadians + newArc.radians;
            arcs[i] = newArc;
        }
        return arcs;
    }

    // update all arcs in the context to have radius R
    function setArcsRadius(context, r) {
        var arrayLength = context.arcs.length;
        for (var i = 0; i < arrayLength; i++) {
            context.arcs[i].radius = r;
        }
    }

    // get the colour given a segment index within context.arcs
    function getColourForSegment(context, segment) {
        return context.palette[segment % context.palette.length];
    }

    // draw the arcs, wherever they may be
    function drawArcs(context) {
        var arrayLength = context.arcs.length;
        var ctx = context.ctx2d;
        var i = 0;

        for (i = 0; i < arrayLength; i++) {
            ctx.beginPath();
            ctx.arc(context.arcs[i].originX,
            context.arcs[i].originY,
            context.arcs[i].radius,
            context.arcs[i].startRadians,
            context.arcs[i].endRadians,
            false);
            ctx.lineWidth = 10; // todo make configurable
            ctx.strokeStyle = getColourForSegment(context, i);
            ctx.stroke();
        }
    }

    // draw the callout lines
    function drawLines(context) {
        var arrayLength = context.lines.length;
        var ctx = context.ctx2d;
        var i = 0;

        for (i = 0; i < arrayLength; i++) {
            ctx.beginPath();
            ctx.moveTo(context.lines[i].x, context.lines[i].y);
            ctx.lineTo(context.lines[i].toX, context.lines[i].toY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
        }
    }

    // draw the percentages at the given line length 
    function drawText(context, length) {
        var ctx = context.ctx2d;
        var metric;
        var arrayLength = context.lines.length,
            i = 0,
            x = 0,
            y = 0;
        var adjust = 0;
        var text = '';
        var degs = 0;

        ctx.fillStyle = "#000000";
        ctx.font = "12px Arial";

        for (i = 0; i < arrayLength; i++) {
            // first draw the flat lines before drawing the text ontop of them
            degs = radsToDegrees(context.lines[i].angle);
            // canvas degrees 0 is actually 90 degrees on screen - WTF?
            degs = (degs + 90) % 360;

            text = Math.round(context.arcs[i].percent) + '%';
            metric = ctx.measureText(text);
            //metric.height = calculateTextHeight(ctx.font,text);
            if (degs > 0 && degs < 180) {
                ctx.moveTo(context.lines[i].toX, context.lines[i].toY);
                ctx.lineTo(context.lines[i].toX + metric.width + 5, context.lines[i].toY);
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000000';
                ctx.stroke();
                ctx.fillText(text, context.lines[i].toX + 5, context.lines[i].toY - 2);
            } else {
                ctx.moveTo(context.lines[i].toX, context.lines[i].toY);
                ctx.lineTo((context.lines[i].toX - metric.width) - 5, context.lines[i].toY);
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000000';
                ctx.stroke();
                ctx.fillText(text, (context.lines[i].toX - metric.width) - 5, context.lines[i].toY - 2);
            }
        }
    }

    // helper function to clear the drawing surface
    function clearCanvas(context) {
        context.ctx2d.clearRect(0, 0, context.canvas.width, context.canvas.height);
    }

    // return the maximum width/height we can use that keeps us square
    function getSquareDistance(context) {
        return Math.min(context.canvas.width, context.canvas.height);
    }

    ////////////////////////////////////////
    // ANIMATIONS

    // expand the arcs in the context so they animate from 10px to context.expandsTo
    function animateCircleExpansion(context) {
        var i = 10;
        var targetRadius = context.expandsTo; // just easier to read

        // helper to clear, adjust and draw arcs given a radius
        function expandCircle(context, radius) {
            clearCanvas(context);
            setArcsRadius(context, radius);
            drawArcs(context);
        }

        // achieve this at 40fps, 40ms
        for (i = 10; i < targetRadius; i += ((targetRadius - 10) / 40)) {
            context.timeout += 25;
            setTimeout(expandCircle,
            context.timeout,
            context,
            i);
        }
    }

    // helper to rotate arcs given a number of degrees to increment the arcs by
    function rotateArcs(context, increment) {
        var i = 0;
        var arrayLength = context.arcs.length;

        for (i = 0; i < arrayLength; i++) {
            if (increment % 2 === 0) {
                increment *= -1; // invert direction of evens
            }
            context.arcs[i].startRadians = degsToRadians(radsToDegrees(context.arcs[i].startRadians) + increment);
            context.arcs[i].endRadians = degsToRadians(radsToDegrees(context.arcs[i].endRadians) + increment);
        }
        clearCanvas(context);
        drawArcs(context);
    }


    // main function controlling the rotation stage
    // loop through N degrees and update the radians and draw.
    function animateArcRotation(context) {
        var degs = 0;
        var increment = 4; // the amount of degrees to animate by per frame

        for (degs = 0; degs < 180; degs += increment) {
            context.timeout += 20;
            setTimeout(rotateArcs,
            context.timeout,
            context,
            increment);
        }
    }

    // main function controlling the initial expansion stage
    function animateCircleExplosion(context) {
        var i = 0;
        var arrayLength = context.arcs.length;
        var targetRadius = context.explodesTo;
        var startingRadius = context.expandsTo;

        // initialize the point at which each arc should stop growing.
        function initializeBumpStops(context) {
            var i = 0;
            var arrayLength = context.arcs.length;
            var euclidianDistance = 0;
            var startX = 0;
            var startY = 0;
            var endX = 0;
            var endY = 0;

            for (i = 0; i < arrayLength; i++) {
                context.arcs[i].explodeCircleBumpStop = (i * context.gapBetweenExplodedArcs) + context.arcs[i].radius;
                startX = context.arcs[i].originX + context.arcs[i].radius * Math.cos(context.arcs[i].startRadians);
                startY = context.arcs[i].originY + context.arcs[i].radius * Math.sin(context.arcs[i].startRadians);
                endX = context.arcs[i].originX + context.arcs[i].radius * Math.cos(context.arcs[i].endRadians);
                endY = context.arcs[i].originY + context.arcs[i].radius * Math.sin(context.arcs[i].endRadians);
                euclidianDistance = getEuclidianDistance(startX, startY, endX, endY);
                // should probably put these under 'explodedetails' object as they are temporary
                // we need to know the euclidian distance (distance between two points) so that we can use atan2 to work out what 
                // angle the segment should be as it moves away from the center
                // but maintains it's size on screen - otherwise a 10% arc isn't the same through the pie levels as it moves away
                context.arcs[i].euclidianHalfDistance = euclidianDistance / 2;
                context.arcs[i].radianMidPoint = context.arcs[i].startRadians + ((context.arcs[i].endRadians - context.arcs[i].startRadians) / 2);
            }

        }

        // draws segments of the donut expanded away from a starting point
        function explodeCircle(radius, context) {
            // now for each of the segments start stripping them apart from each other
            // first segment stays at starting radius
            // other segments move out to radius and lock in position when they are apart.
            var arrayLength = context.arcs.length;
            var i = 0;
            var newRadians = 0;

            for (i = 0; i < arrayLength; i++) {
                if (context.arcs[i].radius < context.arcs[i].explodeCircleBumpStop) {
                    // calculate new start and end radian based on new radius and euclidian distance
                    context.arcs[i].radius = radius;
                    // we know the distance, and we know the radius, so use TAN to get the angle from the center.
                    newRadians = Math.atan(context.arcs[i].euclidianHalfDistance / radius);
                    // update the start/end radians
                    context.arcs[i].startRadians = context.arcs[i].radianMidPoint - newRadians;
                    context.arcs[i].endRadians = context.arcs[i].radianMidPoint + newRadians;
                    // need to abstract this so object is in a healthy state, and I don't have to remember to do this.
                    context.arcs[i].radians = context.arcs[i].endRadians - context.arcs[i].startRadians;
                }
                if (context.arcs[i].radius > context.arcs[i].explodeCircleBumpStop) {
                    context.arcs[i].radius = context.arcs[i].explodeCircleBumpStop;
                }

            }
            clearCanvas(context);
            drawArcs(context);
        }
        // ensure this code is run just before the animation starts, otherwise
        // radius might not be correct
        context.timeout += 100;

        setTimeout(initializeBumpStops, context.timeout, context);

        context.timeout += 100;
        // achieve this in 1 second at 40fps
        for (i = startingRadius; i < targetRadius; i = i + ((targetRadius - startingRadius) / 40)) {
            context.timeout += 25;
            setTimeout(explodeCircle,
            context.timeout,
            i,
            context);
        }
        context.timeout += 100;
    }

    // animate callout lines - work out start and end points
    function animateCalloutLines(context) {
        var arrayLength = context.arcs.length;
        var i = 0;

        // helper to initialize the callout lines
        function initializeCalloutLines(context) {
            var arrayLength = context.arcs.length;
            var i = 0;
            context.lines = [];

            for (i = 0; i < arrayLength; i++) {
                context.lines[i] = {
                    x: 0,
                    y: 0,
                    angle: 0,
                    toX: 0,
                    toY: 0
                };
                context.lines[i].angle = context.arcs[i].startRadians + context.arcs[i].radians / 3;
                context.lines[i].x = context.arcs[i].originX + ((context.arcs[i].radius) * Math.cos(context.lines[i].angle));
                context.lines[i].y = context.arcs[i].originY + ((context.arcs[i].radius) * Math.sin(context.lines[i].angle));
            }
        }

        // shouldn't this just be the generic draw and we draw what's in the pipleine? TODO
        function drawCalloutLines(context) {
            clearCanvas(context);
            drawArcs(context);
            drawLines(context);
        }

        function updateCalloutLines(context, length) {
            var line = 0;
            var arrayLength = context.lines.length;
            for (line = 0; line < arrayLength; line++) {
                context.lines[line].toX = context.lines[line].x + (
                length * Math.cos(context.lines[line].angle));
                context.lines[line].toY = context.lines[line].y + (
                length * Math.sin(context.lines[line].angle));
            }
        }
        context.timeout++;
        // initialize during the pipleline, so we can keep an updated radian value
        // if we change this, we just need to scan over the existing lines and correct.
        setTimeout(initializeCalloutLines, context.timeout, context);

        context.timeout++;

        // 30 pixels long line, drawn a pixel at a time
        for (i = 0; i < context.linelength; i++) {
            context.timeout += 10;
            setTimeout(updateCalloutLines, context.timeout, context, i);
            context.timeout++;
            setTimeout(drawCalloutLines, context.timeout, context);
        }

        // need to add lines to the members of the class or arcs so we can split this function off?
        context.timeout++;
        setTimeout(drawText, context.timeout, context, 45);
    }

    return {
        // no init right now
        getVersion: function () {
            return 1;
        },
        // main function which instantiates a pie and kicks off the animation
        // specify the array of data, the identifier of the canvas element, and a callback 
        // function which is invoked before the animation pipeline begins.
        makePie: function (data, canvasElementId, preWorkFn) {
            // a pie chart constructed for you, pass array of numerics and the canvas element

            var context = {};

            // find canvas element and drawing context
            context.canvas = document.getElementById(canvasElementId);
            context.ctx2d = context.canvas.getContext("2d");

            // initialize our colour palette
            context.palette = ["#E2DED2", "#D6AABF", "#FFA063", "#E66D00", "#7D2C2B", "#552C2B"];
            context.timeout = 100; // initial starting time

            // these methods know about a context, which should have an array of arcs
            context.arcs = getArcsFromData(data);
            setArcsOrigin(context, context.canvas.width / 2, context.canvas.height / 2);

            context.expandsTo = getSquareDistance(context) * 0.2;
            context.explodesTo = getSquareDistance(context) * 0.5;
            context.linelength = getSquareDistance(context) * 0.1;
            context.gapBetweenExplodedArcs = 15;

            if (typeof preWorkFn === 'function') {
                preWorkFn(context);
            }

            animateCircleExpansion(context);
            context.timeout += 500; // gap
            animateCircleExplosion(context);
            context.timeout += 500; // gap
            animateArcRotation(context);
            animateCalloutLines(context);
        }
    };
}());


/* not used but might be useful to you.
function calculateTextHeight(fontInlineStyle,text) {
  var body = document.getElementsByTagName("body")[0],
      tempelement = document.createElement("div"),
      result=0;
   
  tempelement.setAttribute("style",fontInlineStyle+';position: absolute'); // prevent reflow
  tempelement.appendChild(document.createTextNode(text));
  body.appendChild(tempelement);
  result = tempelement.offsetHeight;
  body.removeChild(tempelement);
  return result;
};*/
