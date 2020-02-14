"use strict";

const slide = {
    name:"Sphere"
}


function setup() {
    let canvas = slide.canvas = document.getElementById("renderCanvas")
    let engine = slide.engine = new BABYLON.Engine(canvas, true)
    let scene = slide.scene = new BABYLON.Scene(engine)

    let camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        -1.5 , 1.0, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    camera.upperBetaLimit = 1.5
    camera.lowerBetaLimit = 0.1
    
    let light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    let light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", onResize)
}

function cleanup() {
    window.removeEventListener("resize", onResize)
    if(slide.engine) {
        slide.engine.stopRenderLoop()
        slide.scene.dispose
        slide.engine.dispose
        delete slide.scene
        delete slide.engine
    }
}

function onResize() {
    slide.engine.resize()
}

function tick() {
    slide.sphere.rotation.x = performance.now() * 0.0003
}


function populateScene() {
    const scene = slide.scene

    showWorldAxis(5,scene)

    const paper = BABYLON.MeshBuilder.CreateGround('paper', {
        width: 20,
        height: 20,
    }, scene)
    paper.position.y = -2.5

    let mat = paper.material = new BABYLON.StandardMaterial('paper-mat', scene)
    mat.backFaceCulling = false
    mat.diffuseColor.set(0.3,0.3,0.3)
    mat.specularColor.set(0,0,0)
    

    const sphere = slide.sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {
            diameter:5,
            // sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene)
    sphere.material = mat = new BABYLON.StandardMaterial('sphere-mat', scene)


    
    mat.alpha = 0.2;
    mat.opacityFresnelParameters = new BABYLON.FresnelParameters();
    mat.opacityFresnelParameters.leftColor = new BABYLON.Color3(0.2,0.2,0.2);
    mat.opacityFresnelParameters.rightColor = BABYLON.Color3.Black();

    mat.useSpecularOverAlpha = true;
    
    /*
    mat.backFaceCulling = false
    // mat.needDepthPrePass = true;
    mat.specularColor.set(0.7,0.7,0.7)
    // mat.alpha = 0.5

    let texture = mat.opacityTexture = new BABYLON.DynamicTexture('sphere-texture', {width:1024, height:1024}, scene)
    texture.hasAlpha = true
    var ctx = texture.getContext();
    ctx.clearRect(0,0,1024,1024)
    ctx.fillStyle = 'rgb(255,255,255,0.3)'
    ctx.fillRect(0,0,1024,1024)
    ctx.fillStyle = 'cyan'
    for(let i=64; i<1024; i+=64)
        ctx.fillRect(0,i-3,1024,7)
    texture.update()
    */

    let positions = []
    let indices = []

    let m = 10
    let n = 100
    let radius = 2.51
    let vCount = 0
    for(let k = 1; k<m; k++) {
        for(let i=0; i<n; i++) {
            let phi = Math.PI*2*i/(n-1)
            let theta = Math.PI*k/m - 0.01
            let r = Math.sin(theta) * radius
            positions.push(Math.cos(phi)*r, Math.cos(theta)*radius, Math.sin(phi)*r)
            theta += 0.02
            r = Math.sin(theta) * radius
            positions.push(Math.cos(phi)*r, Math.cos(theta)*radius, Math.sin(phi)*r)
            let v = vCount
            vCount += 2
            if(i+1<n) { indices.push(v,v+1,v+3, v, v+3, v+2) }
        }
    }
    let vertexData = new BABYLON.VertexData();
    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = []
    BABYLON.VertexData.ComputeNormals(positions, indices, vertexData.normals);
    let mesh = new BABYLON.Mesh('prova', scene)
    vertexData.applyToMesh(mesh);
    // showWorldAxis(10)
    mesh.parent = sphere
    
    let pMat = mesh.material = new BABYLON.StandardMaterial('pmat', scene)
    pMat.backFaceCulling = false
    pMat.diffuseColor.set(0.2,0.6,0.7)


    let rtt = slide.rtt = createRenderTarget()
    rtt.renderList.push(mesh)


    paper.material.diffuseTexture = rtt
}



function createRenderTarget() {
    const scene = slide.scene
    let rtt = new BABYLON.RenderTargetTexture("rt", 2048, scene)
    scene.customRenderTargets.push(rtt);


    let rttCamera = new BABYLON.FreeCamera('rttCamera', new BABYLON.Vector3(0,2.5,0), scene)
    // rttCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
    rttCamera.rotation.x = Math.PI/2
    rttCamera.fov = Math.atan(10/5)*2
    rttCamera.minZ = 0.5
    rtt.activeCamera = rttCamera

    let rttMaterial = new BABYLON.StandardMaterial('rtt-mat', scene)
    rttMaterial.diffuseColor.set(1,0,0)
    rttMaterial.specularColor.set(0,0,0)
    rttMaterial.emissiveColor.set(0,0,0)
    rttMaterial.ambientColor.set(0,0,0)
    
    /*
    let bgColor = new BABYLON.Color3()

    
    rtt.onBeforeRender = (e) => {
        rtt.renderList.forEach(mesh => {
            mesh._saved = mesh.material
            mesh.material =  rttMaterial
        })
        bgColor.copyFrom(scene.clearColor)
        scene.clearColor.set(.9,.9,.9)
    };
    rtt.onAfterRender = () => {
        rtt.renderList.forEach(mesh => {
            mesh.material =  mesh._saved
        })
        scene.clearColor.copyFrom(bgColor)
    };
    */

    return rtt
}
