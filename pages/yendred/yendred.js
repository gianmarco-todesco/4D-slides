const slide = {
    name:"Yendred"
}


function setup() {
    let canvas = slide.canvas = document.getElementById("renderCanvas")
    let engine = slide.engine = new BABYLON.Engine(canvas, true)
    let scene = slide.scene = new BABYLON.Scene(engine)
    // scene.clearColor.set(1,1,1)
    scene.ambientColor.set(10,10,10);
    
    let camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        -Math.PI / 2, 0.0, 8, 
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
    scene.onKeyboardObservable.add(onKeyEvent);
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
    slide.model.tick()

}

function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            slide.model.onKeyDown(kbInfo.event)
    }
}
 
function populateScene() {
    const scene = slide.scene
    slide.model = new YendredModel(scene)
    // showWorldAxis(5,scene)
}

class YendredModel {
    constructor(scene) {
        this.scene = scene
        const phPosition = new BABYLON.Vector3(2.2,3,2)
        this.rayOrigin = new BABYLON.Vector3(2.2,11,2) // 15
        this.floorColor = new BABYLON.Color3(0.6,0.6,0.6)

        let ph = this.ph = new Polyhedron(PolyhedronData.p12, scene)
        ph.pivot.position.copyFrom(phPosition)


        this.createRays()

        this.rtt = this.createRtt()
        this.addPolyhedronToRtt()
        
        this.createFloor()
        this.showPolyhedron(false)
        this.lineSystem.isVisible = false

        this.step = 0
        this.showFace = false
        this.rotating = true;
    }

    onKeyDown(e) {
        const key = e.key
        if(key=='b') {
            if(this.planiverse.isVisible) this.hideBook();
            else this.showBook();
        }
        else if(key=='r') {
            this.rotating = !this.rotating;
        }
        else if(key=='1') {
            if(this.planiverse.isVisible) this.hideBook();
            this.ph.change(PolyhedronData.p6)
            this.lineSystem.dispose()
            this.createRays()
            this.addPolyhedronToRtt()
            this.showPolyhedron(true, false)
        } else if(key=='2') {
            if(this.planiverse.isVisible) this.hideBook();
            this.ph.change(PolyhedronData.p12)
            this.lineSystem.dispose()
            this.createRays()
            this.addPolyhedronToRtt()
            this.showPolyhedron(true, false)
        } else if(key=='0') { 
            this.showPolyhedron(false)
            this.lineSystem.isVisible = false
        } else if(key=='h') {
            this.lineSystem.isVisible = !this.lineSystem.isVisible
        } else if(key=='f') {
            this.showFace = !this.showFace
            this.showPolyhedron(true, this.showFace)
        }
     
    }

    hideBook() {
        let i = 0
        const m = 20
        const me = this
        const book = this.planiverse;
        let timerId = setInterval(() => {
            if(i++>m) {
                clearInterval(timerId)
                book.isVisible=false
            } else {
                let t = i/m
                book.position.x = 3 + 10*t    
            }
        }, 10)
    }
    showBook() {
        const book = this.planiverse;
        book.position.x = 3;
        book.isVisible=true;
    }
    showPolyhedron(visible, faceVisible = true) {
        const ph = this.ph
        ph.vertices.forEach(v=>v.isVisible = visible)
        ph.edges.forEach(v=>v.isVisible = visible)
        ph.facesMesh.isVisible = visible && faceVisible
    }

    createFloor() {
        const scene = this.scene
        const yendred = this.yendred = BABYLON.MeshBuilder.CreateGround('yendred', { width:6, height:6 }, scene)
        let mat = yendred.material = new BABYLON.StandardMaterial('yendred-mat', scene)
        mat.backFaceCulling = false
        mat.ambientTexture = new BABYLON.Texture('images/yendred4.png')
        mat.specularColor.set(0,0,0)
        mat.ambientColor.copyFrom(this.floorColor)
        mat.diffuseColor.set(0,0,0);
        //mat.diffuseColor.copyFrom(this.floorColor)

        yendred.position.set(-3,0,-0.2)

        const floor = this.floor = BABYLON.MeshBuilder.CreateGround('floor', { width:12*3, height:12 }, scene)
        mat = floor.material = new BABYLON.StandardMaterial('floor-mat', scene)
        mat.backFaceCulling = false
        mat.specularColor.set(0,0,0)
        mat.diffuseColor.set(0,0,0);
        mat.ambientColor.copyFrom(this.floorColor)
        floor.position.set(0,-0.01,0)

        let ar = 243/369
        const planiverse = this.planiverse = BABYLON.MeshBuilder.CreateGround('planiverse', { 
            width:6*ar, height:6 }, scene)
        mat = planiverse.material = new BABYLON.StandardMaterial('planiverse-mat', scene)
        mat.diffuseTexture = new BABYLON.Texture('images/planiverse.png')
        mat.backFaceCulling = false
        mat.specularColor.set(0,0,0)
        mat.diffuseColor.copyFrom(this.floorColor)
        planiverse.position.set(3,0.01,0)

    }

    createRays() {
        const scene = this.scene
        let rays = this.computeRays()
        var lineSystem = this.lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
            "lineSystem", {lines: rays, updatable: true}, scene);
        lineSystem.color.set(0.4,0.4,0.4)
        lineSystem.alpha = 0.7
    }

    computeRays() {        
        let rays = []
        const p0 = this.rayOrigin
        this.ph.vertices.forEach(v=> {
            let p = v.getAbsolutePosition()
            let p1 = p0.add(p.subtract(p0).scale(p0.y/(p0.y-p.y)))
            rays.push([p0,p1])
        })
        return rays
    }
    updateRays() {
        this.lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
            "lineSystem", {lines: this.computeRays(), instance: this.lineSystem});
    }

    tick() {
        if(this.rotating) slide.model.ph.pivot.rotation.z += slide.engine.getDeltaTime() * 0.001; // performance.now() * 0.001
        this.updateRays()

    }


    createRtt() {
        const size = 5

        const scene = this.scene
        let rtt = new BABYLON.RenderTargetTexture("rt", 1024, scene, false, false)
        // note: last argument is required: we don't want the same A/R of the main camera
        scene.customRenderTargets.push(rtt);
    
        let rttCamera = new BABYLON.FreeCamera('rttCamera', this.rayOrigin, scene)
        // rttCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
        rttCamera.rotation.x = Math.PI/2
        rttCamera.fov = Math.atan(0.5*size/this.rayOrigin.y)*2
        rttCamera.minZ = 0.1
        rtt.activeCamera = rttCamera
        
/*
        var orthoCamera = new BABYLON.TargetCamera("rttOrthoCamera", 
            new BABYLON.Vector3(0,5,0), 
            scene);
        orthoCamera.minZ = 0.001
        orthoCamera.maxZ = 50
        orthoCamera.rotation.x = Math.PI/2
        orthoCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        orthoCamera.orthoTop = -5;
        orthoCamera.orthoBottom = 5;
        orthoCamera.orthoLeft = -5;
        orthoCamera.orthoRight = 5;
        rtt.activeCamera = orthoCamera
*/


        let rttMaterial = new BABYLON.StandardMaterial('rtt-mat', scene)
        rttMaterial.diffuseColor.set(0,0,0)
        rttMaterial.specularColor.set(0,0,0)
        rttMaterial.emissiveColor.set(0.7,0.7,0.7)
        rttMaterial.ambientColor.set(0,0,0)
        rttMaterial.backFaceCulling = false

        let rttMaterial2 = new BABYLON.StandardMaterial('rtt-mat2', scene)
        rttMaterial2.diffuseColor.set(0,0,0)
        rttMaterial2.specularColor.set(0,0,0)
        rttMaterial2.emissiveColor.set(0.6,0.8,0.2)
        rttMaterial2.ambientColor.set(0,0,0)
        rttMaterial2.backFaceCulling = false
        rttMaterial2.alpha = 0.5;

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


        // create rtt paper size
        const rttPaper = this.rttPaper = BABYLON.MeshBuilder.CreateGround('paper', {
            width: size,
            height: size,
        }, scene)
        rttPaper.position.set(this.rayOrigin.x,0.001,this.rayOrigin.z)
        let mat = rttPaper.material = new BABYLON.StandardMaterial('paper-mat', scene)
        mat.backFaceCulling = false
        mat.diffuseColor.set(0,0,0);
        mat.ambientColor.copyFrom(this.floorColor)
        mat.specularColor.set(0,0,0)    
        mat.diffuseTexture = rtt

        return rtt
    }

    addPolyhedronToRtt() {
        
        const rtt = this.rtt
        if(!rtt) return
        const rl = rtt.renderList
        if(rl.length>0) 
            rl.splice(0,rl.length)
        const ph = this.ph
        ph.vertices.forEach(v => rl.push(v))
        ph.edges.forEach(e => rl.push(e))
        rl.push(ph.facesMesh)
    }
}

class Polyhedron extends GeometricModel {
    constructor(data, scene) {
        super('polyhedron', scene)
        this.change(data)
        /*
        this.beginUpdate()
        data.vertices.forEach(p=> this.addVertex(p, 0.05))
        data.edges.forEach(([a,b])=> this.addEdge(data.vertices[a], data.vertices[b],0.02))
        let faceIndex = 0
        if(data.faces.length==6) faceIndex=3
        let facePts = data.faces[faceIndex].map(i=>data.vertices[i])
        this.addFace(facePts)
        this.endUpdate()
        */
    }
    change(data) {
        this.beginUpdate()
        data.vertices.forEach(p=> this.addVertex(p, 0.05))
        data.edges.forEach(([a,b])=> this.addEdge(data.vertices[a], data.vertices[b],0.02))
        let faceIndex = 0
        if(data.faces.length==6) faceIndex=3
        let facePts = data.faces[faceIndex].map(i=>data.vertices[i])
        this.addFace(facePts)
        this.endUpdate()
    }
}
