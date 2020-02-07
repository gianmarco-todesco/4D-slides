// Folding cube 
// by gmt(todesco@toonz.com); feb2017; feb2020 
"use strict";
let foldingCube;
let unfoldingButtonsBar;

function subrange(x,a,b) { return x<=a?0:x>=b?1:(x-a)/(b-a); } 
function smooth(x) { return x*x*(3-2*x); }

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


// === GUI =======================================================================

/*
function UnfoldingButton(index, parent, x, y) {
    var L = 6, SP=1, D = L+SP;
    var width = D * (index==10 ? 4 : 3) + SP;
    var height = D * 5 + SP;
    BABYLON.Rectangle2D.call(this, {
        id: "ub"+index,
        parent: parent, 
        x:x, y:y, width:width, height:height,
        // fill: "#CCCCCC66", 
    });
    this.index = index;
    this.checked = false;
    var pp = [
        [[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]],
        [[0,1],[1,1],[2,1],[2,0],[1,2],[1,3]],
        [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3]],
        [[1,0],[1,1],[2,1],[0,2],[1,2],[1,3]],
        [[0,0],[1,0],[1,1],[2,1],[1,2],[1,3]],
        [[0,0],[1,0],[1,1],[1,2],[2,2],[1,3]],
        [[0,0],[1,0],[1,1],[1,2],[1,3],[2,3]],
        [[0,0],[1,0],[1,1],[1,2],[2,2],[2,3]],
        [[1,0],[1,1],[1,2],[0,2],[0,3],[0,4]],
        [[1,0],[1,1],[2,1],[0,2],[1,2],[0,3]],
        [[2,0],[3,0],[1,1],[2,1],[0,2],[1,2]],        
    ];
    var x1 = 0;
    for(var i=0;i<6;i++) {
        var x = SP+D*pp[index][i][0], y = height - 1 - D * pp[index][i][1] - L - SP;
        new BABYLON.Rectangle2D({
            parent:this,
            fill:UnfoldingButton.UncheckedColor,
            x:x,y:y,width:L,height:L
        });
        x+=L;
        if(x>x1)x1=x;
    }
    this.innerWidth = width;
}
*/
/*

UnfoldingButton.prototype = Object.create(BABYLON.Rectangle2D.prototype); 
UnfoldingButton.prototype.constructor = UnfoldingButton;

UnfoldingButton.L = 6;
UnfoldingButton.SP = 2;
UnfoldingButton.D = UnfoldingButton.L + UnfoldingButton.SP;


UnfoldingButton.prototype.setFill = function(fillColor) {
    this.children.forEach(function(rect) { rect.fill = fillColor; });
}

UnfoldingButton.prototype.setChecked = function(checked) {
    this.checked = checked;
    if(this.checked) this.setFill(UnfoldingButton.CheckedColor);
    else this.setFill(UnfoldingButton.UncheckedColor);
}

UnfoldingButton.CheckedColor = BABYLON.Canvas2D.GetSolidColorBrush(new BABYLON.Color4(0.00,0x30/0x100,1.00,1));
UnfoldingButton.UncheckedColor = BABYLON.Canvas2D.GetSolidColorBrush(new BABYLON.Color4(0.0,0.0,0.0,1));

function UnfoldingButtonsBar(gui) {
    BABYLON.ScreenSpaceCanvas2D.call(this, gui.scene, {
        id:"unfoldingButtonsBar",
        size:new BABYLON.Size(290, 40),
        x : 0, y : 270,
        // backgroundFill: "#40408088"
    });        
    this.currentIndex = 0;
    this.buttons = [];
    var me = this;
    var onButtonClick = function(btn, e) {
        var index = btn.index;
        me.buttons[me.currentIndex].setChecked(false);
        btn.setChecked(true);
        me.currentIndex = index;    
        if(me.onSelected) me.onSelected(index);
    }
        
    var x = 1;
    for(var i=0;i<11;i++) {
        var btn = new UnfoldingButton(i, this, x, 1);
        x += btn.innerWidth + 4;
        gui.enableGuiBehaviour(btn);        
        btn.onClick = onButtonClick;
        this.buttons.push(btn);
    } 
    this.buttons[0].setChecked(true);
    gui.add(this);
}

UnfoldingButtonsBar.prototype = Object.create(BABYLON.ScreenSpaceCanvas2D.prototype); 
UnfoldingButtonsBar.prototype.constructor = UnfoldingButtonsBar;
 
UnfoldingButtonsBar.prototype.onResize = function(w,h) {
    this.x = 13;
    this.y = h - 50;
    
}
 
function createFoldingCubeGui(canvas, scene) {
    
    var gui = foldingCube.gui = new Gui(canvas, scene);
    
    unfoldingButtonsBar = new UnfoldingButtonsBar(gui);
    unfoldingButtonsBar.onSelected = function(index) { foldingCube.configure(index); };
    
    new ControlSlider(gui, 1.0, {callback: function(v) { foldingCube.setAperture(1.0-v); } });
    
    gui.resize();
}
  */

//
// create the babylon scene, engine etc.
//
function createFoldingCubeAnimation() {

    let canvas = document.getElementById('foldingCubeCanvas');
    let engine = new BABYLON.Engine(canvas, true);
    let scene = new BABYLON.Scene(engine);
    let camera = new BABYLON.ArcRotateCamera('camera1',
        -1.3, 1.1, 15, new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.upperBetaLimit = Math.PI*0.5;
    camera.lowerRadiusLimit = 10;
    camera.wheelPrecision = 10;
    camera.attachControl(canvas, true);

    scene.ambientColor = new BABYLON.Color3(0.3,0.3,0.3);

    let light = new BABYLON.PointLight(
        "light0", 
        new BABYLON.Vector3(0, 5, 0), scene);
    light.intensity = 0.5;
    let shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.useBlurVarianceShadowMap = true;
    shadowGenerator.blurScale = 4.0;
    // shadowGenerator.setDarkness(0.8);

    foldingCube = new FoldingCube('fc', scene);
    foldingCube.setShadowGenerator(shadowGenerator);
    foldingCube.canvas = canvas;

    let light2 = new BABYLON.PointLight('light1',
       new BABYLON.Vector3(0.0,0.4,0.0), scene);
    light2.intensity = 0.3;
    light2.parent = camera;

    let groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    groundMat.ambientColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    let ground = BABYLON.Mesh.CreateGround(
        'ground1', 24, 24, 2,
        scene);
    ground.position.y = -4;
    ground.receiveShadows = true;
    ground.material = groundMat;
    
    createFoldingCubeGui(foldingCube);

    engine.runRenderLoop(function() {
        // foldingCube.gui.tick();
        scene.render();
    });
    
    window.addEventListener("resize", function () {
        engine.resize();
        // foldingCube.gui.resize();
    });

    return scene;
}

function createFoldingCubeGui(foldingCube) {

    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, foldingCube.scene);    
    var slider = new BABYLON.GUI.Slider();    
    slider.minimum = 0.0;
    slider.maximum = 1.0;
    slider.value = 0.0;
    slider.height = "20px";
    slider.width = "150px";
    slider.color = "#003399";
    slider.background = "grey";
    slider.top = "-50px";
    // slider.left = "120px";
    slider.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    slider.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;

    slider.onValueChangedObservable.add(function (value) {
        // console.log(value)
        foldingCube.setAperture(value)
    });


    advancedTexture.addControl(slider);
}
