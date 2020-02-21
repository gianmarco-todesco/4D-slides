"use strict";

const slide = {
    name: "Folding cube",
}

function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)

    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        -Math.PI / 2, 0.3, 50, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    
    // const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    // slide.light = light1

    populateScene()
    handlePointer()
    scene.registerBeforeRender(tick)
    scene.onKeyboardObservable.add(onKeyEvent);
    
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", onResize)
}

function cleanup() {
    window.removeEventListener("resize", onResize)
    slide.engine.stopRenderLoop()
    slide.scene.dispose
    delete slide.scene
    slide.engine.dispose
    delete slide.engine    
}

function onResize() {
    slide.engine.resize()
}

function tick() {

}

function populateScene()
{
    const scene = slide.scene
    // slide.model = new FoldingCube(slide.scene)

    let ground = slide.ground = BABYLON.MeshBuilder.CreateGround('ground', {width:40, height:40}, scene)
    ground.position.y = -3
    ground.receiveShadows = true;

    let groundMat = ground.material = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    groundMat.ambientColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    groundMat.specularColor.set(0.01,0.01,0.01)

    let light = new BABYLON.PointLight(
        "light0", 
        new BABYLON.Vector3(0, 20, 0), scene);
    light.intensity = 0.5;

    let shadowGenerator = slide.sg = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.useBlurVarianceShadowMap = true;
    shadowGenerator.blurScale = 2.0;
    // shadowGenerator.setDarkness(0.8);
    

    let a = slide.model = new FoldingPolygon('a', {}, scene) 
    // showWorldAxis(5, scene)

}


function handlePointer() {
    let clicked = false
    let oldy
    slide.scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onpointerdown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                if(clicked) onpointerup(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(clicked) onpointerdrag(pointerInfo)
                break
        }
    });
    function onpointerdown(pointerInfo) {
        if(pointerInfo.event.offsetX<100) {
            clicked = true
            oldy = pointerInfo.event.offsetY
            setTimeout(() => slide.camera.detachControl(slide.canvas))
        }
    }
    function onpointerup(pointerInfo) {
        clicked = false
        slide.camera.attachControl(slide.canvas, true); 
    }
    function onpointerdrag(pointerInfo) {
        let y = pointerInfo.event.offsetY
        let dy = y-oldy
        oldy = y
        if(slide.model) {
            slide.model.fold(slide.model.foldingAngle + dy*0.01) 
        }
    }
}


function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(slide.model) { slide.model.dispose(); slide.model=null; }
            const options = {}

            if(key==49) {
                options.sideCount = 4
                options.sequence = [[0,0],[1,2],[0,1],[0,2],[0,3]]
            } else if(key==50) {
                options.sideCount = 4
                options.sequence = [[0,0],[0,2],[1,2],[2,3],[1,1]]

            } else if(key==51) {
                options.sideCount = 5
                options.sequence = [
                    [0,0],[0,1],[0,2],[0,3],[0,4],
                    [1,2],[6,0],[7,1],[7,2],[7,3],[7,4]
                    ]
            }
            slide.model = new FoldingPolygon('ph', options, slide.scene)
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}
 

class FoldingPolygon {
    constructor(name, options, scene ) {
        const sideCount = this.sideCount = options.sideCount || 4

        const sequence = options.sequence || [[0,0],[1,2],[0,1],[0,2],[0,3]]

        const mesh = this.mesh = createTickPolygon(name, {m:sideCount}, scene)
        this.faces = [mesh]

        const mat = mesh.material = new BABYLON.StandardMaterial(name+'-mat',scene)
        mat.diffuseColor.set(0.3,0.5,0.7)
        mat.specularColor.set(0.3,0.3,0.3)

        sequence.forEach(([parent, edge]) => {
            this._addFace(parent, edge)
        })
        
        this.foldingAngle = 0

        slide.sg.getShadowMap().renderList = this.faces.map(f=>f)
        



    }

    dispose() {
        for(let i = this.faces.length-1; i>=0; i--) 
            this.faces[i].dispose()
    }

    _addFace(parentIndex, edgeIndex) {
        const pts = this.mesh.pts
        const m = pts.length

        const inst = this.mesh.createInstance(name + '-inst')
        this.faces.push(inst)
        inst.parent = this.faces[parentIndex]

        const p = BABYLON.Vector3.Lerp(pts[edgeIndex], pts[(edgeIndex+1)%m],0.5).scale(1.02)
        inst.setPivotPoint(p)

        inst.phi = Math.PI/m + edgeIndex * 2 * Math.PI/m

        const roty = (angle) => BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0,1,0), angle)
        

        inst.rot1 = roty(inst.phi)
        inst.rot2 = roty(-inst.phi + Math.PI)
        
        /*
        let q = roty(Math.PI/5)
        q = rotz(-0.7).multiply(q)
        q = roty(-Math.PI/5+Math.PI).multiply(q)        
        */
        inst.rotationQuaternion = roty(Math.PI)

    }

    fold(angle) {
        const maxAngle = this.sideCount == 4 ? Math.PI/2 : 1.1070623445400032
        angle = Math.max(0, Math.min(maxAngle, angle))
        this.foldingAngle = angle
        const rotz = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0,0,1), -angle)

        for(let i=1; i<this.faces.length;i++) {
            let face = this.faces[i]
            const phi = face.phi
            let q = face.rot1
            q = rotz.multiply(q)
            q = face.rot2.multiply(q)            
            face.rotationQuaternion = q
        }
    }

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
    mesh.edgeLength = BABYLON.Vector3.Distance(pts[0], pts[1])
    mesh.pts = pts
    return mesh
}
