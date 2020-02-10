let canvas,engine,scene
let camera
let light1, light2

let sphere

let ph 


class PolyhedronData {
    constructor() {}
}

PolyhedronData.p4 = (() => {
    let ph = new PolyhedronData()
    ph.vertices = [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>new BABYLON.Vector3(...v))
    ph.edges = [[0,1],[0,2],[0,3],[1,2],[2,3],[3,1]]
    return ph
})()

PolyhedronData.p6 = (() => {
    let ph = new PolyhedronData()
    ph.vertices = [
        [-1,-1,-1],[ 1,-1,-1],[-1, 1,-1],[ 1, 1,-1],
        [-1,-1, 1],[ 1,-1, 1],[-1, 1, 1],[ 1, 1, 1]]
        .map(v=>new BABYLON.Vector3(...v))
    ph.edges = [[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]]
    return ph
})()

PolyhedronData.p8 = (() => {
    let ph = new PolyhedronData()
    ph.vertices = [
        [0,1,0],[-1,0,0],[0,0,-1],[1,0,0],[0,0,1],[0,-1,0]]
        .map(v=>new BABYLON.Vector3(...v))
    ph.edges = [[0,1],[0,2],[0,3],[0,4],[1,2],[2,3],[3,4],[4,1],[5,1],[5,2],[5,3],[5,4]]
    return ph
})()

PolyhedronData.p20 = (() => {
    let ph = new PolyhedronData()
    const f = (-1+Math.sqrt(5))/2
    ph.vertices = [
        [0,1,f],[1,f,0],[f,0,1],
        [0,-1,f],[-1,f,0],[f,0,-1],
        [0,1,-f],[1,-f,0],[-f,0,1],
        [0,-1,-f],[-1,-f,0],[-f,0,-1]]
        .map(v=>new BABYLON.Vector3(...v))
    ph.edges = [[0,6],[6,4],[4,0],[0,1],[1,6],[6,0],[0,8],[8,2],[2,0]]
    return ph
})()


function populateScene() {
    createModel(PolyhedronData.p20)
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

function createModel(data) {
    data.vertices.forEach(p=>addDot(p))
    data.edges.forEach(([a,b])=>addEdge(data.vertices[a], data.vertices[b]))
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



