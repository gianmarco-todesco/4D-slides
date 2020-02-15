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
    
    let light1 = new BABYLON.HemisphericLight("light1", 
        new BABYLON.Vector3(1, 10, 1), scene)
    // let light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    // light2.parent = camera

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
    slide.model.sphere.rotation.x = performance.now() * 0.0003
}


function populateScene() {
    const scene = slide.scene

    showWorldAxis(5,scene)

    
    slide.model = new SphereModel(scene)

    
    
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

    /*
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
    vertexData.applyToMesh(mesh);
    // showWorldAxis(10)
    mesh.parent = sphere
    
    

    let rtt = slide.rtt = createRenderTarget()
    rtt.renderList.push(mesh)


    paper.material.diffuseTexture = rtt
    */

}






class SphereModel {
    constructor(scene) {
        this.scene = scene
        this.paper = this.createPaper(scene)
        this.sphere = this.createSphere(scene)
        this.rtt = this.createRenderTarget(scene)
        this.sphereShell = this.createSphereShell(scene)
        this.paper.material.diffuseTexture = this.rtt

        this.rtt.renderList.push(this.sphereShell)
        /*
        this.addParallel(0.3,0.02, new BABYLON.Color3(0,1,0))
        this.updateSphereShell()
        */
    }

    createPaper(scene) {
        const paper = BABYLON.MeshBuilder.CreateGround('paper', {
            width: 20,
            height: 20,
        }, scene)
        paper.position.y = -2.511
    
        let mat = paper.material = new BABYLON.StandardMaterial('paper-mat', scene)
        mat.backFaceCulling = false
        mat.diffuseColor.set(0.3,0.3,0.3)
        mat.specularColor.set(0,0,0)     
        return paper   
    }

    createSphere(scene) {
        const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {
            diameter:5,
            // sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene)
        const mat = sphere.material = new BABYLON.StandardMaterial('sphere-mat', scene)

        mat.alpha = 0.2
        mat.opacityFresnelParameters = new BABYLON.FresnelParameters();
        mat.opacityFresnelParameters.leftColor = new BABYLON.Color3(0.2,0.2,0.2);
        mat.opacityFresnelParameters.rightColor = BABYLON.Color3.Black();

        mat.useSpecularOverAlpha = true
        return sphere
    }


    createRenderTarget(scene) {
        let rtt = new BABYLON.RenderTargetTexture("rt", 2048, scene)
        scene.customRenderTargets.push(rtt);
    
        let rttCamera = new BABYLON.FreeCamera('rttCamera', new BABYLON.Vector3(0,2.5,0), scene)
        // rttCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
        rttCamera.rotation.x = Math.PI/2
        rttCamera.fov = Math.atan(10/5)*2
        rttCamera.minZ = 0.5
        rtt.activeCamera = rttCamera
    
        let rttMaterial = new BABYLON.StandardMaterial('rtt-mat', scene)
        rttMaterial.diffuseColor.set(0,0,0)
        rttMaterial.specularColor.set(0,0,0)
        rttMaterial.emissiveColor.set(0.1,0.7,0.85)
        rttMaterial.ambientColor.set(0,0,0)
        rttMaterial.backFaceCulling = false

        let bgColor = new BABYLON.Color3()
    
        
        rtt.onBeforeRender = (e) => {
            rtt.renderList.forEach(mesh => {
                mesh._saved = mesh.material
                mesh.material =  rttMaterial
            })
            bgColor.copyFrom(scene.clearColor)
            scene.clearColor.set(.1,.8,.95)
        };
        rtt.onAfterRender = () => {
            rtt.renderList.forEach(mesh => {
                mesh.material =  mesh._saved
            })
            scene.clearColor.copyFrom(bgColor)
        };
        
    
        return rtt
    }

    createSphereShell(scene) {
        let mesh = new BABYLON.Mesh('prova', scene)
        mesh.parent = this.sphere
        mesh.radius = 2.51
    
        let pMat = mesh.material = new BABYLON.StandardMaterial('pmat', scene)
        pMat.backFaceCulling = false
        pMat.diffuseColor.set(0.2,0.6,0.7)
        pMat.twoSidedLighting = true

        mesh.vertexData = new BABYLON.VertexData()
        mesh.positions = []
        mesh.indices = []
        mesh.colors = []
        return mesh
    }

    addPointsPair(i,x1,y1,z1, x2,y2,z2) {
        if(i>0) {
            const v = this.sphereShell.positions.length/3 - 2
            this.sphereShell.indices.push(v,v+1,v+3, v, v+3, v+2) 
        }
        this.sphereShell.positions.push(x1,y1,z1, x2,y2,z2)
    }

    addParallel(theta, dtheta, color, n = 100) {
        const radius = this.sphereShell.radius
        const theta1 = theta - dtheta
        const theta2 = theta + dtheta
        const y1 = Math.cos(theta1)*radius
        const y2 = Math.cos(theta2)*radius
        const r1 = Math.sin(theta1)*radius
        const r2 = Math.sin(theta2)*radius
        for(let i=0; i<n; i++) {
            const phi = Math.PI*2*i/(n-1)
            const cs = Math.cos(phi), sn = Math.sin(phi)
            this.addPointsPair(i, cs*r1, y1, sn*r1, cs*r2, y2, sn*r2)            
        }
    }

    addSegment(p0, p1, w) {
        const radius = this.sphereShell.radius
        const e0 = p0.clone().normalize()
        let e1 = p1.clone().normalize()
        const dot = BABYLON.Vector3.Dot(e0,e1)
        const theta = Math.acos(dot)
        e1 = e1.subtract(e0.scale(dot)).normalize()        
        const e2 = BABYLON.Vector3.Cross(e0,e1).normalize()
        const delta = e2.scale(w*0.5)
        const m = Math.ceil(10 * theta)+2
        console.log(m)
        for(let i = 0; i<m; i++) {
            const phi = theta *i/(m-1)
            const p = e0.scale(Math.cos(phi))
                .add(e1.scale(Math.sin(phi)))
                .scale(radius)
            const p2 = p.add(delta)
            const p1 = p.subtract(delta)
            this.addPointsPair(i, p1.x,p1.y,p1.z, p2.x,p2.y,p2.z)
        }
    }

    updateSphereShell() {
        const mesh = this.sphereShell
        const vertexData = mesh.vertexData
        const positions = vertexData.positions = mesh.positions
        const indices = vertexData.indices = mesh.indices
        const normalFactor = 1.0/mesh.radius
        const normals = vertexData.normals = positions.map(v=>v*normalFactor)        
        vertexData.applyToMesh(mesh);
        mesh.positions = []
        mesh.indices = []
        mesh.colors = []
    }

    foo(n) {
        const dtheta = 0.01
        for(let i=1; i<=n; i++) {
            const theta = Math.PI*i/(n+1);
            this.addParallel(theta, dtheta, new BABYLON.Color3(1,0,0),100)
        }
        this.updateSphereShell()
    }

    bar() {
        this.addSegment(new BABYLON.Vector3(1,1,1), new BABYLON.Vector3(-1,1,1),0.1)
        this.addSegment(new BABYLON.Vector3(1,1,1), new BABYLON.Vector3(1,-1,1),0.1)
        this.updateSphereShell()
    }

    addPolyhedron(data) {
        data.edges.forEach(([a,b]) => {
            this.addSegment(data.vertices[a], data.vertices[b], 0.1)            
        })
        this.updateSphereShell()
    }


}