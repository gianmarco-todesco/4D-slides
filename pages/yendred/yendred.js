const slide = {
    name:"Yendred"
}


function setup() {
    let canvas = slide.canvas = document.getElementById("renderCanvas")
    let engine = slide.engine = new BABYLON.Engine(canvas, true)
    let scene = slide.scene = new BABYLON.Scene(engine)
    scene.clearColor.set(1,1,1)

    let camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        -Math.PI / 2, 0, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerBetaLimit=0
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
    delete slide.engine
}

function tick() {
    if(slide.ph) {
        slide.ph.pivot.rotation.z = performance.now() * 0.001
    }

}


function populateScene() {
    const scene = slide.scene
    paper = slide.paper = BABYLON.MeshBuilder.CreateGround('paper', {
        width: 10,
        height: 10,
    }, scene)
    paper.position.z = -6
    // paper.isVisible = false
    let mat = paper.material = new BABYLON.StandardMaterial('paper-mat', scene)
    mat.backFaceCulling = false
    mat.diffuseTexture = new BABYLON.Texture('images/yendred3.png')
    mat.specularColor.set(0,0,0)
    mat.diffuseColor.set(0.6,0.6,0.6)

    // showWorldAxis(10)
    
    slide.ph = new Polyhedron(PolyhedronData.p12, scene)
    slide.ph.pivot.position.set(0,2,0)


    /*

    

*/

    slide.shadowGenerator = new MyShadowGenerator(scene)        
    let rtt = slide.shadowGenerator.rtt

    slide.ph.vertices.forEach(v => rtt.renderList.push(v))
    slide.ph.edges.forEach(e => rtt.renderList.push(e))
    rtt.renderList.push(slide.ph.facesMesh)

}

class Polyhedron extends GeometricModel {
    constructor(data, scene) {
        super('polyhedron', scene)
        this.beginUpdate()
        data.vertices.forEach(p=> this.addVertex(p, 0.05))
        data.edges.forEach(([a,b])=> this.addEdge(data.vertices[a], data.vertices[b],0.02))
        let facePts = data.faces[0].map(i=>data.vertices[i])
        this.addFace(facePts)
        this.endUpdate()
    }
}

class MyShadowGenerator {
    constructor(scene) {
        this.rtt = this.createRtt(scene)
        const paper = this.paper = BABYLON.MeshBuilder.CreateGround('paper', {
            width: 10,
            height: 10,
        }, scene)
        paper.position.y = 0.01
        // paper.position.x = 4

        let mat = paper.material = new BABYLON.StandardMaterial('paper-mat', scene)
        mat.backFaceCulling = false
        mat.diffuseColor.set(0.6,0.6,0.6)
        mat.specularColor.set(0,0,0)    
        paper.material.diffuseTexture = this.rtt


    }

    createRtt(scene) {
        let rtt = new BABYLON.RenderTargetTexture("rt", 1024, scene, false, false)
        // note: last argument is required: we don't want the same A/R of the main camera
        scene.customRenderTargets.push(rtt);
    
        let rttCamera = new BABYLON.FreeCamera('rttCamera', new BABYLON.Vector3(0,10,0), scene)
        // rttCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
        rttCamera.rotation.x = Math.PI/2
        rttCamera.fov = Math.atan(5/10)*2
        rttCamera.minZ = 0.5
        rtt.activeCamera = rttCamera
    
    
        let rttMaterial = new BABYLON.StandardMaterial('rtt-mat', scene)
        rttMaterial.diffuseColor.set(0,0,0)
        rttMaterial.specularColor.set(0,0,0)
        rttMaterial.emissiveColor.set(0.7,0.7,0.7)
        rttMaterial.ambientColor.set(0,0,0)
        rttMaterial.backFaceCulling = false

        let rttMaterial2 = new BABYLON.StandardMaterial('rtt-mat2', scene)
        rttMaterial2.diffuseColor.set(0,0,0)
        rttMaterial2.specularColor.set(0,0,0)
        rttMaterial2.emissiveColor.set(0.7,0.7,0.3)
        rttMaterial2.ambientColor.set(0,0,0)
        rttMaterial2.backFaceCulling = false

        let bgColor = new BABYLON.Color3()
    

    
        rtt.onBeforeRender = (e) => {
            rtt.renderList.forEach(mesh => {
                if(mesh.getClassName() == "Mesh") {
                    mesh._saved = mesh.material
                    mesh.material = mesh.name == 'polyhedron-faces' ? rttMaterial2 : rttMaterial    
                }
            })
            bgColor.copyFrom(scene.clearColor)
            scene.clearColor.set(1,1,1)
        }
        rtt.onAfterRender = () => {
            rtt.renderList.forEach(mesh => {
                if(mesh.getClassName() == "Mesh" ) {
                    mesh.material =  mesh._saved
                }
            })
            scene.clearColor.copyFrom(bgColor)
        } 

        return rtt
    }
}