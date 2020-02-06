"use strict";

//=============================================================================

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [r,g,b,1.0];
}

//=============================================================================

twgl.setDefaults({attribPrefix: "a_"});
var m4 = twgl.m4;
var v3 = twgl.v3;
var gl;
var shape;



function SurfaceViewer(canvasName) {
    var canvas = document.getElementById(canvasName);
    gl = this.gl = twgl.getWebGLContext(canvas, {preserveDrawingBuffer   : true});
    this.grid = this.makeGrid(gl);

    this.buttonDown = false;
    this.theta0 = 0.2;
    this.theta1 = Math.PI - this.theta0;
    this.theta = 0.7;
    this.phi = 3.71;

    var _this = this;
    gl.canvas.addEventListener('mousedown', 
        function(e) {_this.onMouseDown(e);}, false);
    gl.canvas.addEventListener('mouseup',   
        function(e) {_this.onMouseUp(e);}, false);
    gl.canvas.addEventListener('mousemove', 
        function(e) {_this.onMouseMove(e);}, false);

    gl.canvas.addEventListener('mousewheel', function(e) {
        e.stopPropagation();
        e.preventDefault();
        _this.distance = Math.max(5, _this.distance - e.wheelDelta *0.01);
    }, false);

    this.programManager = new ProgramManager(gl);


    this.camera = m4.identity();
    this.view = m4.identity();
    this.viewProjection = m4.identity();
    this.distance = 6.5;

    this.uniforms = {
        u_lightWorldPos: [1, 8, 10],
        u_lightColor: [1, 1, 1, 1],
        u_diffuseMult: [0.5,0.3,0.8,1],
        u_specular: [1, 1, 1, 1],
        u_shininess: 120,
        u_specularFactor: 1,
        u_viewInverse: this.camera,
        u_world: m4.identity(),
        u_worldInverseTranspose: m4.identity(),
        u_worldViewProjection: m4.identity(),
        u_time: 0,
        u_cc: [0,0,0,0,0,0,0,0,0,0]
    };
    
    var obj = this.makeFoo2();
    
    var quad = this.makeQuad(this.gl);
    var bgProg = new BackgroundShaderProgram(gl);
    this.bg = {
        prog: bgProg,
        type: gl.TRIANGLES,
        shape : quad,
    };
    this.objects = [obj];
}

SurfaceViewer.prototype.onMouseDown = function(e) {
    e.stopPropagation();
    e.preventDefault();
    this.buttonDown = true;
    this.lastPos = this.getMouseEventPos(e);
    if(!running) startSlide();
}
SurfaceViewer.prototype.onMouseUp = function(e) {
    e.stopPropagation();
    e.preventDefault();
    this.buttonDown = false;
}
SurfaceViewer.prototype.onMouseMove = function(e) {
    e.stopPropagation();
    e.preventDefault();
    if(this.buttonDown) {
        var p = this.getMouseEventPos(e);
        var dx = p.x - this.lastPos.x;
        var dy = p.y - this.lastPos.y;
        this.lastPos = p;
        
      
        this.theta = Math.max(this.theta0, 
                     Math.min(this.theta1, this.theta - dy*0.01));
        this.phi += dx*0.01;
       
        
        // ttt += 0.01*dx;
    }
}

var ttt = 0;

SurfaceViewer.prototype.drawScene = function(time) {

    twgl.resizeCanvasToDisplaySize(gl.canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);



    var eye = v3.copy([0, 0, this.distance]);
    var target = v3.copy([0, 0, 0]);
    var up = [0, 1, 0];
    var tex = twgl.createTexture(gl, {
      min: gl.NEAREST,
      mag: gl.NEAREST,
      src: [
        255, 255, 255, 255,
        192, 192, 192, 255,
        192, 192, 192, 255,
        255, 255, 255, 255,
      ],
    });

    // set viewProjection
    var fovy = 30 * Math.PI / 180;
    var projection = m4.perspective(
        fovy,
        gl.canvas.clientWidth / gl.canvas.clientHeight,
        0.5, 200);
    m4.lookAt(eye, target, up, this.camera);
    m4.inverse(this.camera, this.view);
    m4.multiply(projection, this.view, this.viewProjection);


    var uni = this.uniforms;

    var world = uni.u_world;
    m4.identity(world);
    //m4.translate(world, obj.translation, world);
    m4.rotateX(world, -this.theta, world);
    m4.rotateZ(world, this.phi, world);

    m4.transpose(
       m4.inverse(world, uni.u_worldInverseTranspose), uni.u_worldInverseTranspose);
    m4.multiply(this.viewProjection, uni.u_world, uni.u_worldViewProjection);

    
    if(this.objects) {
        var tt = time;
        var me = this;
        for(var k=0; k<this.objects.length; k++) {
            var obj = this.objects[k];
            var pi = obj.prog.pInfo;
            gl.useProgram(pi.program);
            twgl.setBuffersAndAttributes(gl, pi, obj.shape);
            myDraw(me, time, obj);            
        }
    }
    
    /*
    var pi = this.programManager.linesProgram;
    gl.useProgram(pi.program);
    twgl.setBuffersAndAttributes(gl, pi, this.grid);
    this.uniforms.u_time = time;
    twgl.setUniforms(pi, this.uniforms);
    twgl.drawBufferInfo(gl, this.grid, gl.LINES);
    */

    if(this.bg) {
        var bg = this.bg;
        var pi = bg.prog.pInfo;
        gl.useProgram(pi.program);
        var uniforms = {
            u_worldViewProjection: m4.identity(),
        };
        var m = uniforms.u_worldViewProjection;
        m4.translate(m,uff,m);
        twgl.setBuffersAndAttributes(gl, pi, bg.shape);
        twgl.setUniforms(pi, uniforms);
        twgl.drawBufferInfo(gl, bg.shape, bg.type);            
    }

}

var uff = [0,0,.99];


SurfaceViewer.prototype.getMouseEventPos = function (e) {
    return {x:e.offsetX, y:e.offsetY};
}

SurfaceViewer.prototype.makeFoo = function(lines) {
    var gl = this.gl;
    var arrays = { position: [], color: []};
    lines.forEach(function(line) {
        arrays.position.push(...line);
        console.log(arrays.position);
        arrays.color.push(0.5,0.5,0.5,1.0, 0.5,0.5,0.5,1.0);
    });
    var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    var obj = {
        prog: new SimpleShaderProgram(gl),
        shape: bufferInfo,
        type: gl.LINES
    };
    return obj;
}

SurfaceViewer.prototype.makeFoo2 = function() {
    var gl = this.gl;
    var shape = this.makeSurface(gl,300);
    var obj = {
        prog: new SurfaceShaderProgram(gl),
        shape: shape,
        type: gl.TRIANGLES
    };
    return obj;
}

SurfaceViewer.prototype.makeGrid = function(gl) {
    var m = 9;
    var arrays = {
      position: [], // twgl.primitives.createAugmentedTypedArray(3, m*2),
      color: [], // twgl.primitives.createAugmentedTypedArray(3, m*2),
    };

    var addLine = function (x0,y0,z0, x1,y1,z1, r,g,b) {
        arrays.position.push(x0,y0,z0, x1,y1,z1);
        arrays.color.push(r,g,b,1.0,r,g,b,1.0);
    }

    var r = 2.0;

    
    addLine(-r,0,0, r,0,0, 1,0,0);
    addLine(0,-r,0, 0,r,0, 0,1,0);
    addLine(0,0,-r, 0,0,r, 0,0,1);

    var d = 0.1;
    addLine(r,0,0, r-d, d,0, 1,0,0);
    addLine(r,0,0, r-d,-d,0, 1,0,0);

    addLine(0,r,0,  d,r-d,0, 0,1,0);
    addLine(0,r,0, -d,r-d,0, 0,1,0);

    addLine(0,0,r, 0, d,r-d, 0,0,1);
    addLine(0,0,r, 0,-d,r-d, 0,0,1);

    r = 1.8;
    var n = 21;
    for(var i = 0; i<n; i++) {   
        var v = (i%5)==0 ? 0.7 : 0.9;
        var t = i/(n-1);
        var q = r*(-1+2*t);
        addLine(-r,q,0, r,q,0, v,v,v);
        addLine(q,-r,0, q,r,0, v,v,v);        
    }

    var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    return bufferInfo;
}

SurfaceViewer.prototype.makeSurface = function(gl, m) {
    m = m || 100;
    var arrays = {
        position: twgl.primitives.createAugmentedTypedArray(3, m*m),
        texcoord: twgl.primitives.createAugmentedTypedArray(2, m*m),
        indices: new Uint32Array((m-1)*(m-1)*6)
    };
    for(var i=0;i<m;i++) {
        var u = i/(m-1);
        for(var j=0;j<m;j++) {
            var k = i*m+j;
            arrays.position.push(0,0,0);
            var v = j/(m-1);
            arrays.texcoord.push(u,v);
        }
    }
  
    var s = 0;
    for(var i=0;i+1<m;i++) {
        for(var j=0;j+1<m;j++) {
            var k = i*m+j;
            var a = [k,k+1,k+1+m,  k,k+1+m,k+m];
            for(var h=0;h<6;h++) arrays.indices[s+h] = a[h];
            s+=6;
        }
    }
    
    var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    return bufferInfo;
}

SurfaceViewer.prototype.makeQuad = function(gl) {
    var arrays = {
        position: twgl.primitives.createAugmentedTypedArray(3, 4),
        texcoord: twgl.primitives.createAugmentedTypedArray(2, 4),
        indices: []
    };
    var r = 1;
    arrays.position.push(
        -r,-r,0,
         r,-r,0,
        -r, r,0,
         r, r,0        
    );
    arrays.texcoord.push(
        0,0,
        1,0,
        0,1,
        1,1
    );
    arrays.indices.push(0,1,3, 0,3,2);    
    var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    return bufferInfo;
}

//---------------------------------------------------------

function myDraw(viewer, time, obj) {
    var pi = obj.prog.pInfo;
    var u = viewer.uniforms;
    u.u_time = time;
    u.u_color = [0.8,0.1,0.1,1.0]; 

    var ang = 2.0*Math.PI*time; ang = 0.25*Math.PI;
    u.u_cs = Math.cos(ang); u.u_sn = Math.sin(ang);

    var delta = Math.cos(2.0*Math.PI*time)*0.89;
    
    var qs = [0.1,0.3,0.5,0.7,0.9];
    // var qs = [0.1,0.4,0.6,0.9];
    for(var i=0;i<qs.length;i++) {
        var q = qs[i] + delta;
        if(q<=0.0 || q>=1.0) continue;
        // q = Math.atan(Math.tan((q-0.5)*Math.PI)+delta*10.0)/Math.PI + 0.5;
        u.u_color = HSVtoRGB(q-delta,0.5,0.9);
        u.u_parameter = q;
        
        var theta = q * Math.PI * 0.5;
        u.u_ab = Math.cos(theta);
        u.u_cd = Math.sin(theta);
        
    
        
        twgl.setUniforms(pi, u);
        twgl.drawBufferInfo(gl, obj.shape, obj.type);
    }
}

//------------------------------------------------------------------

function SurfaceShaderProgram(gl) {
    ShaderProgram.call(this, gl);
    this.createProgram(
        SurfaceShaderProgram.vSrc, 
        SurfaceShaderProgram.fSrc);
}

SurfaceShaderProgram.prototype = Object.create(ShaderProgram.prototype);
SurfaceShaderProgram.prototype.constructor = SurfaceShaderProgram;


SurfaceShaderProgram.vSrc = `
uniform mat4 u_world;
uniform mat4 u_viewInverse;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
uniform vec3 u_lightWorldPos;
uniform float u_time;
uniform float u_parameter;
attribute vec2 a_texcoord;
varying vec4 v_position;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;
varying vec3 v_worldPos;
varying float v_x4;
uniform float u_ab, u_cd, u_cs, u_sn;

uniform float u_cc[10];

#define PI 3.1415926535897932384626433832795

vec3 fun(float u, float v) {  
    
    /* float theta = u_parameter * PI * 0.5;
    float ab = cos(theta);
    float cd = sin(theta);
    */
    float x1 = u_ab*cos(2.0*u*PI);
    float x3 = u_ab*sin(2.0*u*PI);
    float x2 = u_cd*cos(2.0*v*PI);
    float x4 = u_cd*sin(2.0*v*PI);
    
    /*
    float ang,tm,cs,sn;
    ang = 2.0*PI*u_time; cs = cos(ang); sn = sin(ang);
    */
    float tm;
    tm=x1*u_cs-x4*u_sn;
    x4=x1*u_sn+x4*u_cs;
    x1=tm;
    
    v_x4 = x4;
    float d = 1.0/(1.0-x4);            
    return d*vec3(x1,x2,x3);
}

void main() {
  
  float u = a_texcoord.x;
  float v = a_texcoord.y;
  
  vec4 pos = vec4(fun(u,v),1.0);
  float h = 0.01;
  vec3 dfdu = fun(u+h,v)-fun(u-h,v);
  vec3 dfdv = fun(u,v+h)-fun(u,v-h);
  vec3 norm = normalize(cross(dfdu,dfdv));
  
  
  v_position = (u_worldViewProjection * pos);
  v_normal = (u_worldInverseTranspose * vec4(norm, 0)).xyz;
  v_surfaceToLight = u_lightWorldPos - (u_world * pos).xyz;
  v_surfaceToView = (u_viewInverse[3] - (u_world * pos)).xyz;
  
  v_worldPos = (pos).xyz;
  gl_Position = v_position;
}
`;


SurfaceShaderProgram.fSrc = `  
precision mediump float;
varying vec4 v_position;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;
uniform vec4 u_lightColor;
uniform vec4 u_diffuseMult;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;
uniform vec4 u_color;
varying vec3 v_worldPos;
varying float v_x4;

vec4 lit(float l ,float h, float m) {
  return vec4(1.0,
              abs(l),//max(l, 0.0),
              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
              1.0);
}
void main() {
 
  if(v_x4>0.8 || abs(v_worldPos.y)>1.8 || abs(v_worldPos.z)>1.8)
      discard;
 
  vec4 diffuseColor = u_color;
  vec3 a_normal = normalize(v_normal);
  vec3 surfaceToLight = normalize(v_surfaceToLight);
  vec3 surfaceToView = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLight + surfaceToView);
  
  if(dot(surfaceToView, a_normal)<0.0) {
    a_normal = -a_normal;
  }

  float cs = dot(a_normal, surfaceToLight);
  vec4 litR = lit(cs,dot(a_normal, halfVector), u_shininess);
  vec4 outColor = vec4((
  u_lightColor * (diffuseColor * litR.y +
                0.7 * litR.z * u_specularFactor)).rgb,
      diffuseColor.a);
  gl_FragColor = outColor;
}
`;

//---------------------------------------------------------

var running = false;
var meter, viewer;

function initialize() {
    
    if(false) meter = new FPSMeter(null, {
        interval:100,
        smoothing:10,
        show: 'fps',
        decimals: 1,
        maxFps: 60,
        threshold: 100,

        position: 'absolute',
        zIndex: 10,
        left: '10px',
        top: '10px',
        theme: 'dark',
        heat: 1,
        graph: 1,
        history: 20
    });


    viewer = new SurfaceViewer('viewer');    

    defineSlide('tori',startSlide, stopSlide);
}

var count=0;
function render(time) {
    if(window.meter) meter.tickStart();
    if(gl.NO_ERROR != gl.getError()) throw "uff";
    viewer.drawScene(time);
    if(gl.NO_ERROR != gl.getError()) throw "uff";
    if(window.meter) meter.tick();    
    slideTick();
}

var time = 0.0;
function animate() {
    if(!running) return;
    render(time); { time += 0.001; time -= Math.floor(time); }
    requestAnimationFrame(animate);

}

function startSlide() {
    if(!running) {
        running=true;
        animate();
    }
}

function stopSlide() {
    if(running) {
        running=false;        
    }    
}
