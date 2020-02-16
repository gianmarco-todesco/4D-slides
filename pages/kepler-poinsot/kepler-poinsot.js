"use strict";

const slide = {
    name:"Kepler-Poinsot"
}



function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)

    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

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

function populateScene()
{
    const scene = slide.scene
    slide.model = new Model(slide.scene)
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
        slide.model.param = slide.model.param + dy*0.01
    }
}


function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            // console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(48<=key && key<=48+9) {
                const num = key-48
                slide.model.setShape(num)
            }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}
 
    
class Model {
    constructor(scene) {
        this.setShape(1)
        
    }

    setShape(shapeId) {
        this.clear()
        switch(shapeId) {
            case 1: this.setDod(); break;
            case 2: this.setIco(); break;
        }

    }

    clear() {
        const faces = this.faces 
        if(faces) {
            for(let i = faces.length-1; i>=0; i--) faces[i].dispose()
            this.faces = []    
        }
    }
    placeFaces(ph) {
        const faces = this.faces
        const phEdgeLength = BABYLON.Vector3.Distance(
            ph.vertices[ph.edges[0][0]],
            ph.vertices[ph.edges[0][1]])
        const scaleFactor = faces[0].edgeLength / phEdgeLength
        for(let i=0; i<ph.faces.length; i++) {
            const mat = ph.getFaceMatrix(i, scaleFactor)
            const p = mat.getRow(3)
            faces[i].mat = mat
            faces[i].position.set(p.x,p.y,p.z)
            faces[i].rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(mat)
        }
    }
    setDod() {
        const pentagon = createTickPolygon('pentagon', {m:5, r:1}, slide.scene)
        const faces = this.faces = [pentagon]
        for(let i=1; i<12; i++) faces.push(pentagon.createInstance('f-'+i))
        this.placeFaces(PolyhedronData.p12)
        this._param = 0    
    }
    setIco() {
        const triangle = createTickPolygon('triangle', {m:3, r:1}, slide.scene)
        const faces = this.faces = [triangle]
        for(let i=1; i<20; i++) faces.push(triangle.createInstance('f-'+i))
        this.placeFaces(PolyhedronData.p20)
        this._param = 0    
    }

    get param() { return this._param; }
    set param(v) {
        this._param = v
        const translateMatrix = BABYLON.Matrix.Translation(0,v,0)
        if(this.faces) {
            this.faces.forEach(face => {
                const mat = translateMatrix.multiply(face.mat)
                const p = mat.getRow(3)
                face.position.set(p.x,p.y,p.z)
                face.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(mat)
            })
        }
    }
}


    
