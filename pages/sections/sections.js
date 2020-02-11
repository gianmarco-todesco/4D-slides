let canvas,engine,scene
let camera
let light1, light2
let sphere, model
let model2

document.addEventListener("DOMContentLoaded", () => {
    setup()
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", () => engine.resize())
})

function setup() {
    canvas = document.getElementById("renderCanvas")
    engine = new BABYLON.Engine(canvas, true)
    scene = new BABYLON.Scene(engine)
    camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 20, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    
    scene.onKeyboardObservable.add(onKeyEvent);
    handlePointer()
}


function handlePointer() {
    let clicked = false
    let oldy
    scene.onPointerObservable.add(pointerInfo => {
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
            setTimeout(() => camera.detachControl(canvas))
        }
    }
    function onpointerup(pointerInfo) {
        clicked = false
        camera.attachControl(canvas, true); 
    }
    function onpointerdrag(pointerInfo) {
        let y = pointerInfo.event.offsetY
        let dy = y-oldy
        oldy = y
        model2.pivot.position.y -= dy*0.01
    }

}

/*
                console.log(pointerInfo)
                const radius = 3
                const obj = model2.pivot
                const bv = obj.getHierarchyBoundingVectors()
                const c = BABYLON.Vector3.Lerp(bv.min,bv.max,0.5)
                sphere.position.copyFrom(c)
                const rradius = (bv.max.x-bv.min.x) /2
                sphere.scaling.set(rradius, rradius, rradius)
                sphere.material.diffuseColor.set(100,100,100)

                const bsphere = new BABYLON.BoundingSphere(bv.min, bv.max)
                if(pointerInfo.pickInfo.ray.intersectsSphere(bsphere, 0))
                {
                    sphere.material.diffuseColor.set(200,0,0)
                    setTimeout(() => camera.detachControl(canvas))
                    console.log("CLICK")
                    clicked = true
                    oldy = pointerInfo.event.offsetY
                }
                

                / *
				if(pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh != ground) {
                    pointerDown(pointerInfo.pickInfo.pickedMesh)
                }
                * /
				break;
			case BABYLON.PointerEventTypes.POINTERUP:
                if(clicked) { camera.attachControl(canvas, true); clicked = false }
                // pointerUp();
				break;
            case BABYLON.PointerEventTypes.POINTERMOVE:          
                if(clicked) { 
                    console.log("drag") 
                    let dy = pointerInfo.event.offsetY - oldy
                    oldy = pointerInfo.event.offsetY
                    model2.pivot.position.y -= dy*0.1
                }
                // pointerMove();
				break;
        }
    });
    }
}


function onPointerEvent(pointerInfo) {

}    
    scene.onPointerObservable.add((pointerInfo) => {      		
        switch (pointerInfo.type) {
			case BABYLON.PointerEventTypes.POINTERDOWN:
                
})

var pointerDown = function (mesh) {
    currentMesh = mesh;
    startingPoint = getGroundPosition();
    if (startingPoint) { // we need to disconnect camera from canvas
        setTimeout(function () {
            camera.detachControl(canvas);
        }, 0);
    }
}

var pointerUp = function () {
if (startingPoint) {
    camera.attachControl(canvas, true);
    startingPoint = null;
    return;
}
}

var pointerMove = function () {
if (!startingPoint) {
    return;
}
var current = getGroundPosition();
if (!current) {
    return;
}

var diff = current.subtract(startingPoint);
currentMesh.position.addInPlace(diff);

startingPoint = current;

}
*/


function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(49<=key && key<=49+4) {
                model2.pivot.dispose()
                let data 
                if(key == 49) data = PolyhedronData.p4
                else if(key == 50) data = PolyhedronData.p6
                else if(key == 51) data = PolyhedronData.p8
                else if(key == 52) data = PolyhedronData.p12
                else if(key == 53) data = PolyhedronData.p20
                model2 = new PolyhedronModel(data)
                model2.update()
            }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}


class PolyhedronModel extends GeometricModel {
    constructor(data, name = 'poly') {
        super(name)
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
    model2 = new PolyhedronModel(PolyhedronData.p6)
    model2.update()

    /*
    sphere = BABYLON.MeshBuilder.CreateSphere('ss', {diameter:2}, scene)
    sphere.material = new BABYLON.StandardMaterial('ssmat',scene)
    sphere.material.alpha = 0.2
    */

    const paper = createPaper()

    showWorldAxis(3)

}


function tick() {
    const psi = performance.now()*0.0001
    if(model2 != null) {
        model2.matrix = 
        BABYLON.Matrix.RotationX(0.3).multiply(
            BABYLON.Matrix.RotationZ(psi))
        model2.update()
    }

    // sphere.position.x = Math.cos(performance.now()*0.001) * 2
}


function createPaper() {
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