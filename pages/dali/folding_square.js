// Folding square 
// by gmt(todesco@toonz.com); feb2017 

function drawFoldingSquare(dtheta) {
    var a_canvas = document.getElementById("square");
    var context = a_canvas.getContext("2d");
    context.clearRect(0, 0, a_canvas.width, a_canvas.height);
    var x = 50.0, y = a_canvas.height - 30.0;
    var r = 50;
    context.beginPath();
    context.moveTo(10,y);
    context.lineTo(a_canvas.width-10,y);
    context.lineWidth = 0.5;
    context.stroke();
    
    context.beginPath();
    context.moveTo(x,y);
    var theta = 0;
    var dtheta = -Math.PI*dtheta/180.0;
    var pts = [x,y];
    for(var i=0;i<4;i++) {
        x += r*Math.cos(theta);
        y += r*Math.sin(theta);
        context.lineTo(x,y);
        pts.push(x,y);
        theta += dtheta;
    }
    context.lineWidth = 4;
    context.stroke();
    
    context.beginPath();
    for(var i=0;i<5;i++) {
        context.moveTo(pts[i*2]+4,pts[i*2+1]);
        context.arc(pts[i*2],pts[i*2+1], 4, 0, 2*Math.PI, false);
    }
    context.fillStyle = 'green';
    context.fill();
    context.lineWidth = 1;
    context.stroke();
}
 