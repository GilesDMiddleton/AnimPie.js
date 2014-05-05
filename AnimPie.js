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
// allow callers to hook into the pipeline and change things
// make this scale with the area provided, not just fixed coordinates.
// allow configuration of durations, radius extensions
// allow plugin of colours
// review the animation mechanism/maybe do this in D3?
// performance tune/tweak/use tweens?
// get rid of overkill 'stricts'
// review comments etc

var AnimPie = (function () {
    'use strict';
    var settings; // unused right now

    // UTILS
    // why isn't this already standard!
    function radsToDegrees(rad) {
        'use strict';
        // afford some level of protection to keep degrees 0-360
        if (rad < 0) {
            return raddegrees(rad + (2 * Math.PI));
        }
        return (rad * (180 / Math.PI)) % 360;
    }

    function degsToRadians(deg) {
        'use strict';
        // afford some level of protection to keep radians 0-2pi
        if (deg < 0) {
            return degsToRadians((deg + 360) % 360);
        }
        return deg * (Math.PI / 180);
    }
    // store the state of each arc
    function arc() {
        this.value = 0; // the value in data terms 
        this.percent = 0; // the percentage of this value compared to the total (calculated)
        this.radians = 0; // the number of radians this arc comprises of
        this.startRadians = 0; // where this current arc starts
        this.endRadians = 0; // where this current arc stops
        this.radius = 0; // the radius from origin
        this.originX = 0; // the origin
        this.originY = 0; // the origin
    }

    function initializeArcsOrigin(context, x, y) {
        var arrayLength = context.arcs.length;
        for (var i = 0; i < arrayLength; i++) {
            context.arcs[i].originX = x;
            context.arcs[i].originY = y;
        }
    }

    function arcsFromData(data) {
        var arrayLength = data.length,
            i = 0,
            total = 0,
            arcs = [],
            currentAngle = 0,
            newArc;

        // calculate total to work out percentages
        for (i = 0; i < arrayLength; i++) {
            total += data[i];
        }

        // fill in arc properties
        for (i = 0; i < arrayLength; i++) {
            newArc = new arc();
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

    function setArcsRadius(context, r) {
        'use strict';
        var arrayLength = context.arcs.length;
        for (var i = 0; i < arrayLength; i++) {
            context.arcs[i].radius = r;
        }
    }

    function drawArcs(context) {
        'use strict';
        var arrayLength = context.arcs.length,
            ctx = context.ctx2d,
            i = 0,
            colourBlend = 0;


        for (i = 0; i < arrayLength; i++) {
            ctx.beginPath();
            // not breaking the data up at this point
            ctx.arc(context.arcs[i].originX, context.arcs[i].originY, context.arcs[i].radius, context.arcs[i].startRadians, context.arcs[i].endRadians, false);
            ctx.lineWidth = 10;
            colourBlend = 255 * (context.arcs[i].percent / 100);
            colourBlend = Math.floor(colourBlend);
            ctx.strokeStyle = 'rgb(' + colourBlend + ',' + colourBlend + ',' + colourBlend + ')';
            ctx.stroke();
        }
    }

    function drawLines(context) {
        'use strict';
        var arrayLength = context.lines.length,
            ctx = context.ctx2d,
            i = 0;

        for (i = 0; i < arrayLength; i++) {
            ctx.beginPath();
            // not breaking the data up at this point
            ctx.moveTo(context.lines[i].x, context.lines[i].y);
            ctx.lineTo(context.lines[i].toX, context.lines[i].toY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
        }
    }

    function _clearCanvas(context) {
        'use strict';
        var ctx = context.ctx2d;

        ctx.clearRect(0, 0, context.canvas.width, context.canvas.height);
    }

    ////////////////////////////////////////
    // ANIMS

    function _expandCircle(context,radius) {
        'use strict';
        _clearCanvas(context);
        setArcsRadius(context, radius);
        drawArcs(context);
    }

    function expandCircle(context) {
        'use strict';
        var i = 10,
            timeRet = 0;

        for (i = 10; i < 50; i++) {
            context.timeout += 10;
            setTimeout(_expandCircle, context.timeout, context, i);
        }
    }

    function rotateArcs(context) {
        'use strict';

        // loop through N degrees and update the radians and draw.

        var degs = 0,
            i = 0,
            arrayLength = context.arcs.length,
            increment = 4;

        for (degs = 0; degs < 180; degs += increment) {
            context.timeout += 20;
            setTimeout(function (context, increment) {
                for (i = 0; i < arrayLength; i++) {
                    if (i % 2 === 1) {
                        increment *= -1; // invert direction of odds.
                    }
                    context.arcs[i].startRadians = degsToRadians(radsToDegrees(context.arcs[i].startRadians) + increment);
                    context.arcs[i].endRadians = degsToRadians(radsToDegrees(context.arcs[i].endRadians) + increment);
                }
                _clearCanvas(context);
                drawArcs(context);
            }, context.timeout, context, increment);
        }
    }

    function explodeCircle(context) {
        'use strict';
        // calculate bump stops before drawing
        var i = 0,
            arrayLength = context.arcs.length,
            timeRet = 0;
        // ensure this code is run just before the animation starts, otherwise
        // radius isn't filled in yet.
        setTimeout(function () {
            for (i = 0; i < arrayLength; i++) {
                context.arcs[i].explodeCircleBumpStop = (i * 15) + context.arcs[i].radius;
            }
        }, context.timeout);
        
        for (i = 50; i < 140; i++) {
            context.timeout += 10;
            setTimeout(_explodeCircle, context.timeout, i, context);
        }
    }

    // step 2 draws segments of the donut expanded away from a starting point
    function _explodeCircle(radius, context) {
        'use strict';
        // now for each of the segments start stripping them apart from each other
        // first segment stays at starting radius
        // other segments move out to radius and lock in position when they are apart.

        var arrayLength = context.arcs.length,
            i = 0;

        for (i = 0; i < arrayLength; i++) {
            if (context.arcs[i].radius < context.arcs[i].explodeCircleBumpStop) {
                context.arcs[i].radius = radius;
            }
            if (context.arcs[i].radius > context.arcs[i].explodeCircleBumpStop) {
                context.arcs[i].radius = context.arcs[i].explodeCircleBumpStop;
            }
        }
        _clearCanvas(context);
        drawArcs(context);
    }

    // callout lines - work out start and end points
    function calloutLines(context) {
        'use strict';
        var arrayLength = context.arcs.length,
            i = 0;
        context.lines = [];

        setTimeout(function (context, arrayLength) {

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
        }, context.timeout, context, arrayLength);
        context.timeout++;

        // 30 pixels long line, drawn a pixel at a time
        for (i = 0; i < 50; i++) {
            context.timeout += 10;
            setTimeout(function (context, length) {
                var line = 0;
                _clearCanvas(context);
                drawArcs(context);
                for (line = 0; line < arrayLength; line++) {
                    context.lines[line].toX = context.lines[line].x + (length * Math.cos(context.lines[line].angle));
                    context.lines[line].toY = context.lines[line].y + (length * Math.sin(context.lines[line].angle));
                }
                drawLines(context);
            }, context.timeout, context, i);
        }

        // need to add lines to the members of the class or arcs so we can split this function off?
        context.timeout += 10;
        setTimeout(drawText, context.timeout, context, 45);
    }

    function drawText(context, length) {
        'use strict';
       
        var ctx = context.ctx2d;

        ctx.fillStyle = "#000000";
        ctx.font = "12px Arial";
        var metric;
        var arrayLength = context.lines.length,
            i = 0,
            x = 0,
            y = 0;
        var adjust = 0;
        var text = '';
        var degs = 0;
        //fdh
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
                // canvas Y is inverted, so need to worry about height of tex
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

    return {
        // no init right now
        getVersion: function () {
            return 1;
        },
        makePie: function (data, canvasElementId) {
            // a pie chart constructed for you, pass array of numerics and the canvas element

            var context = {};
            
            // find canvas element and drawing context
            context.canvas = document.getElementById(canvasElementId);
            context.ctx2d = context.canvas.getContext("2d");
            context.timeout = 100; // initial starting time

            // these methods know about a context, which should have an array of arcs
            context.arcs = arcsFromData(data);
            initializeArcsOrigin(context, context.canvas.width/2, context.canvas.height/2);
            
            expandCircle(context);
            context.timeout += 500; // gap
            explodeCircle(context);
            context.timeout += 500; // gap
            rotateArcs(context);
            calloutLines(context);
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


