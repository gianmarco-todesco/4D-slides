let canvas,engine,scene
let camera
let light1, light2
let model
let sphere
let paper
let sg

function setup() {
    canvas = document.getElementById("renderCanvas")
    engine = new BABYLON.Engine(canvas, true)
    scene = new BABYLON.Scene(engine)

    var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 90, BABYLON.Vector3.Zero(), scene);
	camera.lowerBetaLimit = 0.1;
	camera.upperBetaLimit = (Math.PI / 2) * 0.9;
	camera.lowerRadiusLimit = 30;
    camera.upperRadiusLimit = 150;
    
	camera.attachControl(canvas, true);
    
    light1 = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(-1, -2, -1), scene);
	light1.position = new BABYLON.Vector3(20, 40, 20);
	light1.intensity = 0.5;


    populateScene()
    
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", () => engine.resize())
}

function cleanup() {
    engine.stopRenderLoop()
    scene.dispose
    scene = undefined
    engine.dispose
    engine = undefined
    camera = undefined

}

function tick() {

}

document.addEventListener("DOMContentLoaded", setup)


function populateScene() {




    sphere = BABYLON.MeshBuilder.CreateSphere('s',{diameter:10},scene)
    sphere.position.y = 20
    ground = BABYLON.MeshBuilder.CreateGround('g',{
        width: 100, height: 100, subdivisions: 4
    },scene)
    let groundMat = ground.material = new BABYLON.StandardMaterial('ground-mat', scene)
    groundMat.specularColor = new BABYLON.Color3(0,0,0)
    groundMat.diffuseColor = new BABYLON.Color3(0.3,0.4,0.5)


    var shadowGenerator = sg = new BABYLON.ShadowGenerator(1024, light1);
	shadowGenerator.addShadowCaster(sphere);
    // shadowGenerator.useExponentialShadowMap = true;
    shadowGenerator.usePoissonSampling = true;

    ground.receiveShadows = true;

}

