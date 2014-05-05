AnimPie.js
==========

An animated pie chart using canvas only.

Given a canvas like this:
<div style="position:absolute;top:20px;left:0px;width:500px;height:500px">
    <canvas id="c" width="500" height="500">blah</canvas>
</div>

You can then create a pie chart that looks really cool just by calling it with your data and the id of the canvas element.

AnimPie.makePie([30, 50, 40, 20, 10, 32], "c");

See this example http://jsfiddle.net/8qh9X/57/embedded/result/

See Anim.js for licence and more details (MIT)

