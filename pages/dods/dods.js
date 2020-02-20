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
    if(slide.model) slide.model.tick()
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
    // showWorldAxis(5,scene)
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
            console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.key
            if(key == 'a') slide.model.prev()
            else if(key == 's') slide.model.next()
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            // console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}
 
    
class Model {
    constructor(scene) {
        const pentagon = createTickPolygon('pentagon', {m:5, r:1}, slide.scene)
        this.pentagon = pentagon
        pentagon.isVisible = false

        let dods = this.dods = []
        
        const ph = PolyhedronData.p12

        const phEdgeLength = BABYLON.Vector3.Distance(
            ph.vertices[ph.edges[0][0]],
            ph.vertices[ph.edges[0][1]])
        const scaleFactor = pentagon.edgeLength / phEdgeLength
        const faceMatrices = this.faceMatrices = []
        for(let i=0; i<ph.faces.length; i++) {
            const mat = ph.getFaceMatrix(i, scaleFactor)
            faceMatrices.push(mat)
        }

    
        const baseMat = faceMatrices[0].clone().invert()
        const scs = [0.98]
        for(let i=0; i<12; i++) scs.push(0.98)

        for(let i=0; i<13; i++) {
            let dod = new BABYLON.Mesh('dod-'+i, slide.scene)
            dods.push(dod)
            const sc = scs[i]
            if(i==0) {
                dod.scaling.set(sc,sc,sc)
            }
            else {
                let mat = baseMat
                    .multiply(BABYLON.Matrix.RotationX(Math.PI))
                    .multiply(faceMatrices[i-1])
                const p = mat.getRow(3)
                dod.scaling.set(sc,sc,sc)
                dod.position.set(p.x,p.y,p.z)
                dod.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(mat)                
            }

            faceMatrices.forEach((mat,j) => {
                let face = pentagon.createInstance('face-'+i+'-'+j)
                face.parent = dod
                const p = mat.getRow(3)
                face.mat = mat
                face.position.set(p.x,p.y,p.z)
                face.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(mat)    
            })
    
        }
   
        this.maxScale = 0.97
        this.scaleDod(0,this.maxScale)
        for(let i=1; i<=12; i++) {
            this.scaleDod(i,0.1)
            this.setDodVisible(i,false)
            this.dods[i].targetScaleParam = 0
            this.dods[i].scaleParam = 0            
        }

        this.step = 0
    }

    setDodVisible(i, visible) {
        let dod = this.dods[i]
        dod.getChildren().forEach(c=>c.isVisible = visible)
    }
    scaleDod(i,sc) {
        this.dods[i].scaling.set(sc,sc,sc)
    }

    tick() {
        for(let i=1;i<=12;i++) {
            let dod = this.dods[i]
            if(dod.targetScaleParam == dod.scaleParam) continue
            const oldScaleParam = dod.scaleParam
            if(dod.targetScaleParam > dod.scaleParam) {
                dod.scaleParam = Math.min(1.0, dod.scaleParam + 0.05)
            } else if(dod.targetScaleParam < dod.scaleParam) {
                dod.scaleParam = Math.max(0.0, dod.scaleParam - 0.05)
            }
            if(dod.scaleParam > 0 && oldScaleParam == 0.0) 
                this.setDodVisible(i,true)
            else if(dod.scaleParam == 0.0 && oldScaleParam > 0.0) 
                this.setDodVisible(i,false)
            let sc = dod.scaleParam * this.maxScale //  * Math.exp(dod.scaleParam)/Math.exp(1.0)
            this.scaleDod(i,sc)
        }
    }


    next() { this.setStep(this.step + 1) }
    prev() { this.setStep(this.step - 1) }

    setStep(step) {
        step = Math.max(0, Math.min(12, step))
        if(step == this.step) return
        this.step = step
        for(let i=1;i<=12;i++) {
            if(i<=step) {
                this.dods[i].targetScaleParam = 1.0
            } else {
                this.dods[i].targetScaleParam = 0.0
            }
        }
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


    
