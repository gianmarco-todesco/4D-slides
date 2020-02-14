const slide = {
    name:"Yendred"
}


function setup() {
    let canvas = slide.canvas = document.getElementById("renderCanvas")
    let engine = slide.engine = new BABYLON.Engine(canvas, true)
    let scene = slide.scene = new BABYLON.Scene(engine)

    let camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    
    let light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    let light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", () => engine.resize())
}

function cleanup() {
    slide.engine.stopRenderLoop()
    slide.scene.dispose
    delete slide.scene
    slide.engine.dispose
    delete engine.scene
}

function tick() {

}


function populateScene() {
    const scene = slide.scene
    paper = BABYLON.MeshBuilder.CreatePlane('paper', {
        width: 10,
        height: 10,
    }, scene)
    let mat = paper.material = new BABYLON.StandardMaterial('paper-mat', scene)
    mat.backFaceCulling = false
    mat.diffuseTexture = new BABYLON.Texture('images/yendred3.png')

    // showWorldAxis(10)
    
}
