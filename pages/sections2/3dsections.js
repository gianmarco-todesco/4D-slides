"use strict";

const slide = {
    name:"3D Sections"    
}


// console.log(PolyhedronData.p6)

function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true, {deterministicLockstep: true})
    const scene = slide.scene = new BABYLON.Scene(engine)
    scene.ambientColor.set(1,1,1)
    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        1.03, 1.45, 15, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera


    populateScene()
    // slide.axes = showWorldAxis(4, scene);
    scene.registerBeforeRender(tick)
    scene.onKeyboardObservable.add(onKeyEvent);
    handlePointer()
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", onResize)
}


function cleanup() {
    window.removeEventListener("resize", onResize)
    slide.engine.stopRenderLoop()    
    slide.scene.dispose()
    delete slide.scene
    slide.engine.dispose()
    delete slide.engine
}

function onResize() {
    slide.engine.resize()
}


function handlePointer() {
    let status = 0
    let oldx, oldy
    slide.scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onpointerdown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                if(status != 0) onpointerup(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(status != 0) onpointerdrag(pointerInfo)
                break
        }
    });
    function onpointerdown(pointerInfo) {
        console.log(pointerInfo)
        if(pointerInfo.pickInfo.pickedMesh) {
            console.log(pointerInfo.pickInfo.pickedMesh.name)
        }
        if(pointerInfo.event.offsetX<100) {
            status = 1
        } else if(pointerInfo.pickInfo.pickedMesh) {
            status = 2
        }
        if(status != 0) {
            oldx = pointerInfo.event.offsetX
            oldy = pointerInfo.event.offsetY
            setTimeout(() => slide.camera.detachControl(slide.canvas))
        }
    }
    function onpointerup(pointerInfo) {
        status = 0
        slide.camera.attachControl(slide.canvas, true); 
    }
    function onpointerdrag(pointerInfo) {
        
        let x = pointerInfo.event.offsetX
        let y = pointerInfo.event.offsetY
        let dx = x-oldx
        let dy = y-oldy
        oldx = x
        oldy = y
        if(status==1) {
            slide.model.pivot.position.y -= dy*0.03
            // slide.model.update()
        }
        else if(status == 2) {
            const RotX = BABYLON.Matrix.RotationX
            const RotZ = BABYLON.Matrix.RotationZ
           
            
            if(!slide.model.pivot.rotationQuaternion) slide.model.pivot.rotationQuaternion = new BABYLON.Quaternion();
            slide.model.pivot.rotationQuaternion = 
                BABYLON.Quaternion.FromEulerAngles(dx*0.01,0,dy*0.01).multiply(slide.model.pivot.rotationQuaternion  );
        }
        // if(slide.section) slide.section.doUpdate();
    }

}

function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(49<=key && key<=49+9) {
                slide.model.pivot.dispose()
                let data 
                if(key == 49) data = PolyhedronData.p4
                else if(key == 50) data = PolyhedronData.p6
                else if(key == 51) data = PolyhedronData.p8
                else if(key == 52) data = PolyhedronData.p12
                else if(key == 53) data = PolyhedronData.p20
                else if(key == 56) data = PolyhedronData.pg20
                else break;
                setModel(data);
            } 
            else if(kbInfo.event.key == "f") 
                orientModel(slide.model.data.getFaceOrientation(0,0));
            else if(kbInfo.event.key == "v") 
                orientModel(slide.model.data.getVertexOrientation(0,1));
            else if(kbInfo.event.key == "e") 
                orientModel(slide.model.data.getEdgeOrientation(0));
            
            else if(kbInfo.event.key == "h") {
                if(slide.model.facesMesh.isVisible) hideModel();
                else showModel();
            }

            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}


       

function populateScene() {

    const paper = createPaper()
    test();
    

}


function tick() {
   
}


function createPaper() {
    const scene = slide.scene
    const w = 10, h = 8
    const t = 0.1

    const pivot = new BABYLON.Mesh('paper-pivot', scene)

    const plane = BABYLON.MeshBuilder.CreateGround("paper-ground", {
        width: w, height: h}, scene)
    const planeMat = plane.material = new BABYLON.StandardMaterial('paper-ground-mat', scene)
    planeMat.ambientColor.set(0.5,0.7,0.9)
    planeMat.diffuseColor.set(0.5*0.1,0.7*0.1,0.9*0.1)
    planeMat.specularColor.set(0.0,0.0,0.0)
    planeMat.backFaceCulling = false
    planeMat.alpha = 0.5
    plane.parent = pivot
    plane.isPickable = false

    const borderMat = new BABYLON.StandardMaterial('paper-border-mat', scene)
    borderMat.diffuseColor.set(0.2,0.4,0.6)
    const box = BABYLON.MeshBuilder.CreateBox('paper-box', {size:t}, scene)
    box.parent = pivot
    box.material = borderMat
    const boxes = [box]
    for(let i = 1; i<8; i++) 
    {
        const inst = box.createInstance('paper-box-'+i)
        inst.parent = pivot
        boxes.push(inst)
    }
    const x = w/2, z = h/2
    
    boxes[0].position.set(-x,0,-z)
    boxes[1].position.set( x,0,-z)
    boxes[2].position.set(-x,0, z)
    boxes[3].position.set( x,0, z)
    

    boxes[4].position.set( 0,0,-z)
    boxes[5].position.set( 0,0, z)
    boxes[4].scaling.set(w/t-1,1,1)
    boxes[5].scaling.set(w/t-1,1,1)
    boxes[6].position.set(-x,0, 0)
    boxes[7].position.set( x,0, 0)
    boxes[6].scaling.set(1,1,h/t-1)
    boxes[7].scaling.set(1,1,h/t-1)
    

    return pivot
}


function test() {
    slide.clipPlane = new BABYLON.Plane(0,1,0,0);
    if(slide.startWithGike) setModel(PolyhedronData.pg20);
    else setModel(PolyhedronData.p6);

    let section = slide.section = new PolyhedronSection('section',slide.scene);
    section.edge.material.diffuseColor.set(1,0,0);
    section.edge.material.specularColor.set(0,0,0);
    

    slide.scene.onAfterStepObservable.add(function (theScene) { 
        if(slide.model && slide.section) slide.section.update(slide.model, slide.clipPlane);
    });
}

function setModel(data) {
    let ph = slide.model = new Polyhedron('a',data,slide.scene);
    ph.facesMesh.material.clipPlane = slide.clipPlane;
    let r = ph.data.vertices[0].length() * ph.scaleFactor;
    ph.pivot.position.y = -r;
}

function orientModel(q) {
    let obj = slide.model.pivot;
    let q0 = obj.rotationQuaternion ? obj.rotationQuaternion.clone() : new BABYLON.Quaternion();
    BABYLON.Animation.CreateAndStartAnimation('a', obj, "rotationQuaternion", 60, 60, q0,q, 
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
}

function hideModel() {
    slide.model.pivot.getChildren().forEach(itm => itm.isVisible = false);
}
function showModel() {
    slide.model.pivot.getChildren().forEach(itm => itm.isVisible = true);
}