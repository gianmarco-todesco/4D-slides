"use strict";

const slide = {
    name:"3D Sections"    
}


console.log(PolyhedronData.p6)

function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)
    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 20, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera


    populateScene()
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
        console.log(pointerInfo)
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
        slide.model.pivot.position.y -= dy*0.01
    }

}



function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(49<=key && key<=49+4) {
                slide.model.pivot.dispose()
                let data 
                if(key == 49) data = PolyhedronData.p4
                else if(key == 50) data = PolyhedronData.p6
                else if(key == 51) data = PolyhedronData.p8
                else if(key == 52) data = PolyhedronData.p12
                else if(key == 53) data = PolyhedronData.p20
                slide.model = new PolyhedronModel('model',data, slide.scene)
                slide.model.update()
            }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}


class PolyhedronModel extends GeometricModel {
    constructor(name, data, scene) {
        super(name, scene)
        this.data = data
        this.matrix = BABYLON.Matrix.Identity()
        this.y0 = 0.0
    }

    update() {

        const y0 = -this.pivot.position.y

        const V3 = BABYLON.Vector3
        const Transform = V3.TransformCoordinates
        const basePts = this.data.vertices.map(v => Transform(v.scale(2), this.matrix))
        const ins = basePts.map(p=>p.y > y0)
        this.beginUpdate()
        basePts.forEach(p => { this.addVertex(p, 0.1) })

        let tb = {}
        this.data.edges.forEach(([a,b],i) => {
            const pa = basePts[a]
            const pb = basePts[b]
            if(ins[a] != ins[b]) {
                let p = V3.Lerp(pa,pb,(y0-pa.y)/(pb.y-pa.y))
                // this.addVertex(p, 0.15) 
                tb[a+","+b] = tb[b+","+a] = p
            }
            this.addEdge(pa,pb,0.05)            
        })
        this.data.faces.forEach((f,i)=> {
            let segment = []
            let facePts = []
            let a = f[f.length-1]
            f.forEach(b=>{
                if(tb[a+','+b]) {
                    if(ins[a] == ins[b]) throw "Uffa"
                    const p = tb[a+','+b]
                    segment.push(p)
                    facePts.push(p)
                    if(ins[b]) { facePts.push(basePts[b]) }

                } else {
                    if(ins[b]) facePts.push(basePts[b])
                }
                a = b
            })
            if(segment.length==2) {
                this.addEdge(segment[0], segment[1], 0.02)
            }
            if(facePts.length>=3) this.addFace(facePts)
        }) 
        /*
        this.data.faces.forEach((f,i)=> {
            let facePts = f.map(j => basePts[j])
            this.addFace(facePts)
        })
        */
        this.endUpdate()
    }
}


function populateScene() {
    let model = slide.model = new PolyhedronModel('model', PolyhedronData.p6, slide.scene)
    model.update()

    const paper = createPaper()

    showWorldAxis(3, slide.scene)

}


function tick() {
    const psi = performance.now()*0.0001
    if(slide.model != null) {
        slide.model.matrix = 
            BABYLON.Matrix.RotationX(0.3).multiply(
                BABYLON.Matrix.RotationZ(psi))
        slide.model.update()
    }

    // sphere.position.x = Math.cos(performance.now()*0.001) * 2
}


function createPaper() {
    const scene = slide.scene
    const w = 10, h = 8
    const t = 0.1

    const pivot = new BABYLON.Mesh('paper-pivot', scene)

    const plane = BABYLON.MeshBuilder.CreateGround("paper-ground", {
        width: w, height: h}, scene)
    const planeMat = plane.material = new BABYLON.StandardMaterial('paper-ground-mat', scene)
    planeMat.diffuseColor.set(0.5,0.7,0.9)
    planeMat.backFaceCulling = false
    planeMat.alpha = 0.5
    plane.parent = pivot

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