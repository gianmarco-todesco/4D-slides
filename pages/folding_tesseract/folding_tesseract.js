"use strict";


const slide = {
    name: "Folding Tesseract"

}


function setup() {
    const maxCameraRadius = 10.5;
    const canvas = slide.canvas = document.getElementById('foldingTesseractCanvas');
    const engine = slide.engine = new BABYLON.Engine(canvas, true);
    const scene = slide.scene = new BABYLON.Scene(engine);
    const camera = slide.camera = new BABYLON.ArcRotateCamera('camera1',
        -1.0, 1.8, maxCameraRadius, new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.wheelPrecision = 30;    
    camera.attachControl(canvas, false);
    
    const light = new BABYLON.PointLight('light1',
        new BABYLON.Vector3(0.0,0.0,0.0), scene);
    light.parent = camera;
    
    const foldingTesseract = slide.model = new FoldingTesseract("ft", scene);
    
    // createFoldingTesseractGui(canvas, scene);
    
    scene.onKeyboardObservable.add(onKeyEvent);    
    handlePointer()
    scene.registerBeforeRender(() => {foldingTesseract.tick()})
    engine.runRenderLoop(() => { scene.render(); })
    window.addEventListener("resize", onResize);
    
}

function onResize() {
    slide.engine.resize()
}

function cleanup() {
    window.removeEventListener("resize", onResize);
    slide.engine.stopRenderLoop()    
    slide.scene.dispose()
    delete slide.scene
    slide.engine.dispose()
    delete slide.engine
}


function handlePointer() {
    let status = 0
    let oldy, oldx
    let dragging = false
    slide.scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onPointerDown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                if(dragging) onPointerUp(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(dragging) onPointerDrag(pointerInfo)
                break
        }
    });
    function onPointerDown(pointerInfo) {
        dragging = false
        if(pointerInfo.event.offsetX<100 ) {
            dragging = true
        }
        if(dragging) {
            oldx = pointerInfo.event.offsetX
            oldy = pointerInfo.event.offsetY
            setTimeout(() => slide.camera.detachControl(slide.canvas))
        }
    }
    function onPointerUp(pointerInfo) {
        dragging = 0
        if(slide.step && slide.step.onPointerUp) {
            slide.step.onPointerUp(pointerInfo)
        }
        slide.camera.attachControl(slide.canvas, true); 
    }
    function onPointerDrag(pointerInfo) {
        let x = pointerInfo.event.offsetX
        let y = pointerInfo.event.offsetY
        let dx = x - oldx
        let dy = -(y - oldy)
        oldx = x
        oldy = y
        const ft = slide.model
        const aperture = Math.max(0, Math.min(1, ft.aperture - dy*0.01))
        ft.setAperture(aperture)
    }
}



function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:        
            if(kbInfo.event.key == "h") {
                const ft = slide.model
                ft.setHoleStatus(ft.hole == 0 ? 1 : 0)
            } else if(kbInfo.event.key == "r") {
                slide.model.zwRotationEnabled = !slide.model.zwRotationEnabled
            } else if(kbInfo.event.key == "c") {
                slide.model.setColorParam(slide.model.colorParam == 0 ? 1 : 0)
            }
        break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            break;
    }
}


//
// class FoldingTesseract
//
class FoldingTesseract {
    constructor(name, scene) {
        this.scene = scene;
        
        var mat1 = new BABYLON.StandardMaterial("mat2", scene);
        
        // mat1.diffuseTexture = new BABYLON.Texture("images/hc_face.png", scene);
        mat1.diffuseTexture = this.faceTexture = new BABYLON.DynamicTexture('faceTexture', 900, scene, true);
        this.updateFaceTexture()

        let me = this

        let baseTexture = new Image()
        baseTexture.src = "images/ground.jpg"
        baseTexture.onload = () => { 
            me.baseTexture = baseTexture
            me.updateFaceTexture() 
        }
        
        mat1.backFaceCulling = true;
        mat1.specularColor.r = mat1.specularColor.g = mat1.specularColor.b = 0.1;
        
        this.mat = mat1;
        
        var mesh = new BABYLON.Mesh(name + "_mesh", scene);
        mesh.material = mat1;
        
        this.mesh = mesh;
        mesh.position.y = 1;
        var vertexData = this.vertexData = new BABYLON.VertexData();    

        this.hole = 0.0;
        this.aperture = 0.0;
        this.theta = 0.0;
        
        this.zwRotationSpeed = 0.0;
        this.zwRotationEnabled = false;
        
        
        this.makeGeometry();
        this.updateVertices();
        this.vertexData.applyToMesh(this.mesh);   

        this.colorParam = 0
        this.colorTargetParam = 0

    }

    makeGeometry() {
        var pts = this.vertexData.positions = [];
        var indices = this.vertexData.indices = [];
        var uvs = this.vertexData.uvs = [];
        var ptsData = this.ptsData = []; // [cubeIndex, faceIndex, j, s]
        var k = 0;
            
        if(this.hole > 0.0) {
            this.holed = true;
            var ff = [];
            for(var j=0; j<4; j++) {
                var j1 = (j+1)%4;
                ff.push(j,j1,j1+4, j,j1+4,j+4);
                ff.push(j+4,j1+4,j1+8, j+4,j1+8,j+8);
                ff.push(j+8,j1+8,j1+12, j+8,j1+12,j+12);
            }
            for(var cubeIndex = 0; cubeIndex<8; cubeIndex++) {
                for(var faceIndex = 0; faceIndex<6; faceIndex++) {            
                    for(var i=0; i<16; i++) {
                    pts.push(0,0,0,  0,0,0);
                    uvs.push(0,0,  0,0);
                    ptsData.push([cubeIndex, faceIndex, i%4, Math.floor(i/4)])
                    }
                    for(var i=0; i<4;i++) {
                        var i1 = (i+1)%4;
                        for(var j=0; j<3; j+=2) {
                            var j1=j+1;
                            var a = k+(j*4+i)*2, b=k+(j*4+i1)*2, c = k+(j1*4+i1)*2, d = k+(j1*4+i)*2;
                            indices.push(a,b,c, a,c,d);
                            indices.push(a+1,c+1,b+1, a+1,d+1,c+1);
                        }
                    }
                    k += 16*2;
                }
            } 
        }
        else
        {
            this.holed = false;
            for(var cubeIndex = 0; cubeIndex<8; cubeIndex++) {
                for(var faceIndex = 0; faceIndex<6; faceIndex++) {            
                    for(var i=0; i<4; i++) {
                    pts.push(0,0,0,  0,0,0);
                    uvs.push(0,0,  0,0);
                    ptsData.push([cubeIndex, faceIndex, i, 0])
                    }
                    var a = k+(j*4+i)*2, b=k+(j*4+i1)*2, c = k+(j1*4+i1)*2, d = k+(j1*4+i)*2;
                    indices.push(k  ,k+2,k+4,  k  , k+4, k+6);
                    indices.push(k+1,k+5,k+3,  k+1, k+7, k+5);
                    k += 4*2;
                }
            }        
        }    
    }

    updateVertices() {
        var qs = [
            [[-1,-1,-1], [0,0,2], [2,0,0]],
            [[1,1,1], [-2,0,0], [0,0,-2]],

            [[1,-1,-1], [0,0,2], [0,2,0]],
            [[-1,-1,1], [0,0,-2], [0,2,0]],

            [[1,-1,1], [-2,0,0], [0,2,0]],
            [[-1,-1,-1], [2,0,0], [0,2,0]],
                    
        ];
        var theta1 = Math.PI/2 * smooth(subrange(this.aperture,0.0,0.75));
        var theta2 = Math.PI/2 * smooth(subrange(this.aperture,0.75,1.0));

        var f1 = this.makerot(1,-1,theta1);
        var f2 = this.makerot(1,-1,theta2);
            
        var ff = [
            function(p) { return p; },
            this.makerot(0,1,theta1),
            this.makerot(0,-1,theta1),
            this.makerot(1,1,theta1),
            this.makerot(1,-1,theta1),
            this.makerot(2,1,theta1),
            this.makerot(2,-1,theta1),
            function(p) { return f1(f2(p)); },
    1    ];
        var project = function(p) { var k = 5.0/(5.0+p[3]); return [k*p[0], k*p[1], k*p[2]]; }
        
        var csTheta = Math.cos(this.theta);
        var snTheta = Math.sin(this.theta);
        var zwRotate = function(p) { 
            var z=p[2], w=p[3];
            return [p[0], p[1], csTheta*z-snTheta*w, snTheta*z+csTheta*w];        
        }
        var pts = this.vertexData.positions;
        var uvs = this.vertexData.uvs;
        var uv0 = [[0,0], [1,0], [1,1], [0,1]];
        var hole = this.hole;
        var hole_t = 0.2 + 0.8*(1-hole);
        var ss = [0, hole_t, hole_t, hole_t + 0.05];
        var ss2 = [0, hole_t, 0.005, 0.0];

        var colors = [
            [6,6,2,2,4,4], // center
            [1,1,2,2,3,3], // left
            [1,1,2,2,3,3], // right
            [6,6,1,1,5,5], // top 
            [6,6,1,1,5,5], // middle (between center and bottom)
            [5,5,3,3,4,4], // front
            [5,5,3,3,4,4], // back
            [6,6,2,2,4,4], // bottom
        ]
        for(var i=0; i<this.ptsData.length; i++) {
            var d = this.ptsData[i];
            var cubeIndex = d[0], faceIndex = d[1], h = d[2], s = d[3];
            
            var u0 = uv0[h][0], v0 = uv0[h][1];
            var colorIndex = colors[cubeIndex][faceIndex]

            var d3 = 1.0/3.0;
            var du = d3 * (colorIndex%3);
            var dv = d3 * Math.floor(colorIndex/3);
            
            var st = ss2[s];        
            var u = u0 * (1-st) + 0.5*st;
            var v = v0 * (1-st) + 0.5*st;                
            uvs[i*4  ] = uvs[i*4+2] = u * d3 + du;
            uvs[i*4+1] = uvs[i*4+3] = v * d3 + dv;

            st = ss[s];        
            u = u0 * (1-st) + 0.5*st;
            v = v0 * (1-st) + 0.5*st;
                        
            var p0 = qs[faceIndex][0], qu = qs[faceIndex][1], qv = qs[faceIndex][2];
            var p = [
                p0[0] + u * qu[0] + v * qv[0], 
                p0[1] + u * qu[1] + v * qv[1], 
                p0[2] + u * qu[2] + v * qv[2], 
                0];
            
            // p[3] += this.aperture;
            
            p = ff[cubeIndex](p);
            // p[1] -= this.aperture;
            // p[3] -= this.aperture;
            p[3] += this.aperture;
            p = zwRotate(p);
            p = project(p);
            pts[i*6  ] = pts[i*6+3] = p[0];
            pts[i*6+1] = pts[i*6+4] = p[1];
            pts[i*6+2] = pts[i*6+5] = p[2];
        }
        var normals = [];
        BABYLON.VertexData.ComputeNormals(
                this.vertexData.positions, 
                this.vertexData.indices, 
                normals);
        this.vertexData.normals = normals;
    }



    makerot(i,sgn,theta) {
        var cs = Math.cos(sgn*theta);
        var sn = Math.sin(sgn*theta);
        return function(p) {
            var factor = 0.99;
            var q = [p[0]*factor,p[1]*factor,p[2]*factor,p[3]*factor];
            var c0 = q[i] + sgn;
            var c1 = q[3];
            q[i] = sgn + c0 * cs + c1 * sn;
            q[3] = -c0 * sn + c1 * cs;
            return q;
        };
    }

    setAperture(t) {
        // t=0 => aperto; t=1 => chiuso
        this.aperture = t;
        this.updateVertices();
        this.vertexData.applyToMesh(this.mesh);   
        this.mesh.position.y = 1-t;   
        this.scene.activeCamera.radius = maxCameraRadius * (1-t) + minCameraRadius * t;
    }

    setTheta(t) {
        this.theta = Math.PI*2*t;
        this.updateVertices();
        this.vertexData.applyToMesh(this.mesh);    
    }

    setHole(t) {
        if(t<0) t=0; else if(t>1) t=1;
        this.hole = t;
        if((this.hole > 0.0) != this.holed) {
            this.makeGeometry();
        }
        this.updateVertices();
        this.vertexData.applyToMesh(this.mesh);    
    }

    setHoleStatus(status) {
        this.holeStatus = status;        
    }

    holeTick(dt) {
        var v = 0.003;
        if(this.holeStatus) {
            if(this.hole == 1.0) return;
            this.hole += v*dt;
            if(this.hole>=1.0) { this.hole = 1.0;}
        } else {
            if(this.hole == 0.0) return;
            this.hole -= v*dt;
            if(this.hole<=0.0) { this.hole = 0.0;}        
        }        
        if((this.hole > 0.0) != this.holed) this.makeGeometry();
        this.updateVertices();
        this.vertexData.applyToMesh(this.mesh);    
    }

    zwRotate(angle) {
        this.theta += angle;
        while(this.theta>=Math.PI*2) this.theta -= Math.PI*2;
        this.updateVertices();
        this.vertexData.applyToMesh(this.mesh);    
    }

    zwRotationTick(dt) {
        var acc = 0.000001;
        if(this.zwRebound) {
        var t = this.zwRebound.t += dt;
        var dt = 500;
        var s = (t>dt) ? 1.0 : t/dt;
        s = 0.5*(1 - Math.cos(s*Math.PI));
        this.theta = (1-s) * this.zwRebound.s0 + s * this.zwRebound.s1;
        this.updateVertices();
        this.vertexData.applyToMesh(this.mesh);
        if(s>=1.0) this.zwRebound = null;
        return;       
        }
        if(this.zwRotationEnabled) {
            this.zwRotationSpeed = Math.min(0.001, this.zwRotationSpeed + acc*dt);
            this.zwRotate(this.zwRotationSpeed * dt);
            this.zwBraking = null;
        } else {
            if(this.zwRotationSpeed==0.0 && this.theta==0.0) {
                return;
            }
            this.zwRotationSpeed = Math.max(0.0, this.zwRotationSpeed - 3*acc*dt);
            this.zwRotate(this.zwRotationSpeed * dt);
            if(this.zwRotationSpeed == 0.0) {
                this.zwRebound = {
                    t:0,
                    s0:this.theta,
                    s1:0
                };
            }
        }
    }


    tick() {
        var t = (new Date()).getTime()
        if(!this.oldt) { this.oldt = t; return; }
        var dt = t-this.oldt; this.oldt = t;
        if(this.holeStatus == true && this.hole != 1.0 || 
        this.holeStatus == false && this.hole != 0.0) this.holeTick(dt);
        this.zwRotationTick(dt);
        if(this.colorTargetParam > this.colorParam) {
            this.colorParam = Math.min(this.colorTargetParam, this.colorParam + dt*0.003)
            this.updateFaceTexture()
        } else if(this.colorTargetParam < this.colorParam) {
            this.colorParam = Math.max(this.colorTargetParam, this.colorParam - dt*0.003)
            this.updateFaceTexture()
        }
    }

    setColorParam(c) {
        this.colorTargetParam = c
    }

    updateFaceTexture() {
        let t = this.colorParam
        const ctx = this.faceTexture.getContext()
        let colors = []
        for(let i=0; i<7; i++) {
            const [r1,g1,b1,a] = HSVtoRGB(i/7,1,1)
            const [r0,g0,b0] = [0.9,0.8,0.1]
            const r = Math.floor(255*((1-t)*r0 + t*r1))
            const g = Math.floor(255*((1-t)*g0 + t*g1))
            const b = Math.floor(255*((1-t)*b0 + t*b1))
            colors.push('rgb('+r+','+g+','+b+')')
        }
        
        let dx = 300, dy = 300
        for(let i=0; i<colors.length; i++) {
            let ix = i%3, iy = (i-ix)/3
            let x0 = dx*ix, y0 = 599-dy*iy, x1 = x0+dx-1, y1= y0+dy-1 

            ctx.fillStyle = colors[i]
            ctx.fillRect(x0,y0, dx,dy)

            if(this.baseTexture) {
                let img = this.baseTexture
                ctx.globalAlpha = 0.2
                ctx.drawImage(img, 0,0, img.width, img.height, x0,y0,dx,dy)
                ctx.globalAlpha = 1
            }

            ctx.fillStyle = 'black'
            let d = 8
            ctx.fillRect(x0,y0,dx,d)
            ctx.fillRect(x0,y1-d+1,dx,d)
            ctx.fillRect(x0,y0,d,dy)
            ctx.fillRect(x1-d+1,y0,d,dy)
            
        }
        this.faceTexture.update()

    }

}
//
// end of class FoldingTesseract
//

