let canvas,engine,scene
let camera
let light1, light2

let sphere

let ph 


function populateScene() {
    createModel(PolyhedronData.p6)
}


function placeCylinder(edge, vstart, vend) {
    const distance = BABYLON.Vector3.Distance(vstart,vend );
    edge.position.set(
        (vstart.x+vend.x)*0.5,
        (vstart.y+vend.y)*0.5,
        (vstart.z+vend.z)*0.5)           
    edge.scaling.set(1,distance*0.9,1)
    const delta = vend.subtract(vstart).normalize()
    const up = new BABYLON.Vector3(0, 1, 0)
    var angle = Math.acos(BABYLON.Vector3.Dot(delta, up));
    if(Math.abs(angle) > 0.00001) {
        const axis = BABYLON.Vector3.Cross( up, delta).normalize()
        edge.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, angle);    
    }    
    else edge.rotationQuaternion = BABYLON.Quaternion.RotationAxis(up,0)
}

function addDot(p) {
    let sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {diameter:.2}, scene)
    sphere.material = new BABYLON.StandardMaterial('sphere-mat', scene)
    sphere.material.diffuseColor.set(0.8,0.3,0.6)
    sphere.position.copyFrom(p)
}

function addEdge(p0,p1) {
    let edge = BABYLON.MeshBuilder.CreateCylinder('cyl', {diameter:.1, height: 1}, scene)
    edge.material = new BABYLON.StandardMaterial('cyl-mat', scene)
    edge.material.diffuseColor.set(0.4,0.1,0.3)
    placeCylinder(edge, p0,p1)    
}

function tick() {
    // sphere.position.x = Math.cos(performance.now()*0.001) * 2
}

let V,H,U,K,D2,D1

function createModel(data) {
    data.vertices.forEach(p=>p.copyFrom(p.scale(15/2)))
    U = BABYLON.Vector3.Distance(data.vertices[0],data.vertices[1])

    const d = data.vertices[0].clone().normalize()
    console.log(d)
    K = 40 / (U*Math.sqrt(3))

    V = U*U*U


    data.vertices.forEach(p=>{
        const z = BABYLON.Vector3.Dot(d, p)
        const p1 = p.add(d.scale((z*K-z)))
        p.copyFrom(p1)
    })


    console.log("K=",K)
    console.log("U=",U)
    D1 = BABYLON.Vector3.Distance(data.vertices[1],data.vertices[4])
    D2 = BABYLON.Vector3.Distance(data.vertices[0],data.vertices[5])
    
    console.log("D1=",D1)
    console.log("D2=",D2)

    H = BABYLON.Vector3.Distance(data.vertices[0],data.vertices[7])
    console.log("H=",H)

    data.vertices.forEach(p=>addDot(p))
    data.edges.forEach(([a,b])=>addEdge(data.vertices[a], data.vertices[b]))
    const lineArray = []
    data.faces.forEach(f => {
        let pts = f.map(i=>data.vertices[i])
        const m = pts.length
        const fc = pts.reduce((a,b)=>a.add(b), new BABYLON.Vector3(0,0,0)).scale(1.0/m)
        pts = pts.map(p => BABYLON.Vector3.Lerp(p, fc, 0.2))
        pts.push(BABYLON.Vector3.Lerp(pts[m-1], pts[0], 0.9))
        pts.push(BABYLON.Vector3.Lerp(pts[pts.length-1], fc, 0.1))
        lineArray.push(pts)
    })
    let ls = BABYLON.MeshBuilder.CreateLineSystem("lineSystem", {lines: lineArray}, scene);
}


document.addEventListener("DOMContentLoaded", e=> {
    canvas = document.getElementById("renderCanvas")
    engine = new BABYLON.Engine(canvas, true)
    scene = new BABYLON.Scene(engine)


    camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", () => engine.resize())
})



