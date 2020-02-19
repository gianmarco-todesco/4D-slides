"use strict";

const slide = {
    name: "Folding cube",
}


function setup() {
    let canvas = slide.canvas = document.getElementById('foldingCubeCanvas');
    let engine = slide.engine = new BABYLON.Engine(canvas, true);
    let scene = slide.scene = new BABYLON.Scene(engine);
    let camera = slide.camera = new BABYLON.ArcRotateCamera('camera1',
        -1.3, 1.1, 15, new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.upperBetaLimit = Math.PI*0.5;
    camera.lowerRadiusLimit = 10;
    camera.wheelPrecision = 10;
    camera.attachControl(canvas, true);
    

    scene.ambientColor = new BABYLON.Color3(0.3,0.3,0.3);
    let light2 = new BABYLON.PointLight('light1',
       new BABYLON.Vector3(0.0,0.4,0.0), scene);
    light2.intensity = 0.3;
    light2.parent = camera;
    
    let light = new BABYLON.PointLight(
        "light0", 
        new BABYLON.Vector3(0, 5, 0), scene);
    light.intensity = 0.5;


    let shadowGenerator = slide.sg = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.useBlurVarianceShadowMap = true;
    shadowGenerator.blurScale = 4.0;
    // shadowGenerator.setDarkness(0.8);
    
    let foldingCube = slide.foldingCube = new FoldingCube('fc', scene);
    foldingCube.setShadowGenerator(shadowGenerator);
    foldingCube.canvas = canvas;
    
    


    let groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    groundMat.ambientColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    let ground = slide.ground = BABYLON.Mesh.CreateGround(
        'ground1', 24, 24, 2,
        scene);
    ground.position.y = -4;
    ground.receiveShadows = true;
    ground.material = groundMat;
    
    // createFoldingCubeGui(foldingCube);
    
    engine.runRenderLoop(function() { scene.render(); });
    window.addEventListener("resize", function () { engine.resize(); });
}


function cleanup() {
    slide.engine.stopRenderLoop()    
    slide.scene.dispose()
    delete slide.scene
    slide.engine.dispose()
    delete slide.engine
}



//
// class FoldingCube
//
class FoldingCube {

    constructor(name, scene) {
        this.scene = scene;    
        this.name = name;
    
        // create face material
        var mat = this.faceMaterial = new BABYLON.StandardMaterial(name + "_faceMaterial", scene);
        mat.diffuseColor = new BABYLON.Color3(1.0, 0.2, 0.7);
        mat.ambientColor = new BABYLON.Color3(1.0, 0.2, 0.7);

        // create the face mesh (it is also the first face)
        var mainFace = this.mainFace = BABYLON.MeshBuilder.CreateBox(name + '_f1', {size:2}, scene);
        mainFace.bakeTransformIntoVertices(BABYLON.Matrix.Scaling(0.95, 0.01, 0.95));
        mainFace.material = mat;
        mainFace.t0 = -1;
        this.faces = [mainFace];

        // the other faces are instances
        for(var i=1; i<6; i++) {        
            var face = mainFace.createInstance(name + "_f" + (i+1));
            face.theta = 0;
            face.t0 = 0;
            this.faces.push(face);        
        }
        this.tmax = 1;
        this.aperture = 0;
        this.configure(0);        
    }

    setShadowGenerator(shadowGenerator) {
        this.shadowGenerator = shadowGenerator;
        var rl = shadowGenerator.getShadowMap().renderList;
        for(var i=0;i<6;i++) { rl.push(this.faces[i]); }    
    }

    foldFaces() {
        var t = this.aperture * this.tmax;
        for(var i=1; i<6; i++) {
            var face = this.faces[i];
            var theta = Math.PI*0.5*smooth(subrange(t, face.t0, face.t0+1));
            face.rotateMe(theta);
        }    
    }


    attach(face, parentFace, direction) {
        var dd = [[1,0,'z',1],[0,1,'x',-1],[-1,0,'z',-1],[0,-1,'x',1]];
        var x = dd[direction][0];
        var y = dd[direction][1];
        face.parent = parentFace;
        face.setPivotMatrix(new BABYLON.Matrix.Translation(x,0,y));
        face.position.copyFromFloats(2*x,0,2*y);
    
        var sgn = dd[direction][3];
        var me = face;
        face.rotateMe = (dd[direction][2]=='x') 
            ? function(theta) { me.theta = theta; me.rotation.x = theta * sgn; }
            : function(theta) { me.theta = theta; me.rotation.z = theta * sgn; };
        me.rotation.x = me.rotation.z = 0;
        face.t0 = parentFace.t0 + 1;
        var t = face.t0 + 1;
        if(t>this.tmax) this.tmax = t;
    }

    configure(index) {
        var L=2, R=0, U=1, D=3;
        var unfoldings = [
            // 1     2     3     4     5
            [[0,L],[0,R],[0,U],[0,D],[4,D]],
            [[0,L],[0,R],[2,U],[0,D],[4,D]],
            [[0,U],[1,L],[1,R],[0,D],[4,D]],
            [[0,U],[0,R],[0,D],[3,L],[3,D]],
            [[0,U],[1,L],[0,R],[0,D],[4,D]],
            [[0,U],[1,L],[0,D],[3,R],[3,D]],
            [[0,U],[1,L],[0,D],[3,D],[4,R]],
            [[0,U],[1,L],[0,D],[3,R],[4,D]],
            [[0,R],[1,U],[2,U],[0,D],[4,D]],
            [[0,U],[1,R],[1,U],[0,L],[4,D]],
            [[0,R],[1,U],[2,R],[0,D],[4,L]],                        
        ];
    
        if(index<0 || index>=unfoldings.length) return;
        let unfolding = unfoldings[index];

        var faces = this.faces;    
        this.tmax = 1;
        var faces = this.faces;    
        for(var i=0;i<5;i++) { 
            var tup = unfolding[i]; 
            this.attach(faces[1+i], faces[tup[0]], tup[1]); 
        }
        this.foldFaces();    
    }

    setAperture = function(t) {
        this.aperture = t;
        this.foldFaces();    
    }
} // end of FoldingCube class


//
// create the babylon scene, engine etc.
//
function createFoldingCubeAnimation() {
    return scene;
}




function createTickPolygon(name, options, scene) {
    const m = options.m || 5
    const r = options.r || 3
    const h = options.h || 0.05

    const mesh = new BABYLON.Mesh(name, scene)
    const pts = [...Array(m).keys()].map(i=>Math.PI*2*i/m)
        .map(a=>new BABYLON.Vector3(r*Math.cos(a), 0, r*Math.sin(a)))
    const vdb = new VertexDataBuilder()
    for(let i=0; i<m; i++) {
        vdb.addSphere(pts[i], h)
        vdb.addCylinder(pts[i], pts[(i+1)%m], h)
    }
    vdb.addXZPolygon(pts, h)
    vdb.addXZPolygon(pts, -h)
    vdb.vertexData.applyToMesh(mesh)

    const mat = mesh.material = new BABYLON.StandardMaterial(name+'-mat',scene)
    mat.diffuseColor.set(0.3,0.5,0.7)
    mat.specularColor.set(0.3,0.3,0.3)
    mesh.edgeLength = BABYLON.Vector3.Distance(pts[0], pts[1])
    return mesh
}
