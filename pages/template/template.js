let canvas,engine,scene
let camera
let light1, light2

let sphere

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
    light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 10, -10), scene)
    
    populateScene()
    
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", () => engine.resize())
})


function populateScene() {
    sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {diameter:2}, scene)
    sphere.material = new BABYLON.StandardMaterial('sphere-mat', scene)
    sphere.material.diffuseColor.set(0.8,0.3,0.6)
}

function tick() {
    sphere.position.x = Math.cos(performance.now()*0.001) * 2
}



