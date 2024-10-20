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
    light1.intensity = 0.5
    let light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera
    light2.intensity = 0.5

    populateScene()
    
    handlePointer()
    scene.onKeyboardObservable.add(onKeyEvent);
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
    // slide.model.sphere.rotation.x = performance.now() * 0.0003
}



function handlePointer() {
    let status = 0
    let oldy, oldx
    let dragging = false
    slide.scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onPointerDown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                if(dragging) onPointerUp(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(dragging) onPointerDrag(pointerInfo)
                break
        }
    });
    function onPointerDown(pointerInfo) {
        dragging = false
        if(slide.step && slide.step.onPointerDown) {
            dragging = slide.step.onPointerDown(pointerInfo)
        }
        if(dragging) {
            oldx = pointerInfo.event.offsetX
            oldy = pointerInfo.event.offsetY
            setTimeout(() => slide.camera.detachControl(slide.canvas))
        }
    }
    function onPointerUp(pointerInfo) {
        dragging = 0
        if(slide.step && slide.step.onPointerUp) {
            slide.step.onPointerUp(pointerInfo)
        }
        slide.camera.attachControl(slide.canvas, true); 
    }
    function onPointerDrag(pointerInfo) {
        let x = pointerInfo.event.offsetX
        let y = pointerInfo.event.offsetY
        let dx = x - oldx
        let dy = -(y - oldy)
        oldx = x
        oldy = y
        if(slide.step && slide.step.onPointerDrag) {
            slide.step.onPointerDrag(pointerInfo, dx, dy)
        }
    }
}



function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            // console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(kbInfo.event.key == "z") slide.prev()
            else if(kbInfo.event.key == "x") slide.next()
            else if(slide.step && slide.step.onKeyDown) {
                slide.step.onKeyDown(kbInfo.event)
            }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            // console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}

/*
let currentTheta = 0.1
function changeParameter(d) {
    currentTheta += d
    slide.model.foo(currentTheta)
}
*/

// ============================================================================


function populateScene() {
    const scene = slide.scene
    // showWorldAxis(5,scene)    
    slide.model = new SphereModel(scene)
    slide.step.init()
}

// ============================================================================
// Steps
// ----------------------------------------------------------------------------

class EmptyStep {
    // just the sphere
    init() { 
        const md = slide.model
        md.sphereShell.hide()
        md.floor.hide()
        md.polygonsManager.showNothing(); 
        md.lightPoint.isVisible = false;
    }
    cleanup() {
        const md = slide.model
        md.sphereShell.hide()        
    }
}

// ----------------------------------------------------------------------------


class ParallelsStep {
    // sphere & parallels
    init() {
        const md = slide.model
        md.sphereShell.addParallels(10,0.02)
        md.sphereShell.show()        
        md.lightPoint.isVisible = false;
    } 
    cleanup() {
        const md = slide.model
        md.sphereShell.hide()        
    }
}

// ----------------------------------------------------------------------------

class ParallelsWithShadowStep {
    init() {
        const md = slide.model
        md.sphereShell.addParallels(10,0.02)
        md.sphereShell.show()        
        md.floor.show()
        md.lightPoint.isVisible = true;
    }
    cleanup() {
        const md = slide.model
        md.sphereShell.hide()        
        md.floor.hide()
        md.lightPoint.isVisible = false
    }
    onPointerDown(pointerInfo) { 
        let pickedMesh = pointerInfo.pickInfo.pickedMesh
        return pickedMesh == slide.model.sphere || pickedMesh == slide.model.sphereShell.mesh

    }
    onPointerDrag(pointerInfo, dx, dy) {
        slide.model.sphere.rotation.z += dx*0.01

    }
}

// ----------------------------------------------------------------------------

class PolygonsStep {
    constructor(n) {
        this.polygonCount = n
    }
    init() {
        const md = slide.model
        md.polygonsManager.showPolygons(this.polygonCount)
    }
    cleanup() {
        const md = slide.model
        md.polygonsManager.showNothing()
    }
    onPointerDown(pointerInfo) { 
        return pointerInfo.event.offsetX<100 
    }
    onPointerDrag(pointerInfo, dx, dy) {
        const pm = slide.model.polygonsManager
        let size = Math.max(0.1, Math.min(0.9554, pm.polygonSize - dy*0.005))
        pm.setSize(size)
    }
}

// ----------------------------------------------------------------------------


class PolyhedronStep {
    init() {
        const md = slide.model
        md.polygonsManager.showPolyhedron(PolyhedronData.p6)
    }
    cleanup() {
        const md = slide.model
        md.polygonsManager.showNothing()
    }
    onKeyDown(e) {
        const md = slide.model
        switch(e.keyCode) {
            case 49: md.polygonsManager.showPolyhedron(PolyhedronData.p4); break;
            case 50: md.polygonsManager.showPolyhedron(PolyhedronData.p6); break;
            case 51: md.polygonsManager.showPolyhedron(PolyhedronData.p8); break;
            case 52: md.polygonsManager.showPolyhedron(PolyhedronData.p12); break;
            case 53: md.polygonsManager.showPolyhedron(PolyhedronData.p20); break;
        }
    }
}

// ----------------------------------------------------------------------------

class PolyhedronWithShadowStep {
    init() {
        const md = slide.model
        md.sphereShell.addPolyhedron(PolyhedronData.p6)
        md.sphereShell.show()        
        md.floor.show()
        md.lightPoint.isVisible = true;

    }
    cleanup() {
        const md = slide.model
        md.sphereShell.hide()        
        md.floor.hide()
        md.lightPoint.isVisible = false;
    }
    onKeyDown(e) {
        const md = slide.model
        switch(e.keyCode) {
            case 49: md.sphereShell.addPolyhedron(PolyhedronData.p4); break;
            case 50: md.sphereShell.addPolyhedron(PolyhedronData.p6); break;
            case 51: md.sphereShell.addPolyhedron(PolyhedronData.p8); break;
            case 52: md.sphereShell.addPolyhedron(PolyhedronData.p12); break;
            case 53: md.sphereShell.addPolyhedron(PolyhedronData.p20); break;
        }
    }

    onPointerDown(pointerInfo) { 
        let pickedMesh = pointerInfo.pickInfo.pickedMesh
        return pickedMesh == slide.model.sphere || pickedMesh == slide.model.sphereShell.mesh

    }
    onPointerDrag(pointerInfo, dx, dy) {
        slide.model.sphere.rotation.z += dx*0.01

    }


}

// ----------------------------------------------------------------------------


slide.steps = [
    new EmptyStep(), 
    new ParallelsStep(),
    new ParallelsWithShadowStep(),
    new PolygonsStep(1),
    new PolygonsStep(2),
    new PolygonsStep(3),
    new PolygonsStep(4),
    new PolygonsStep(3),
    new PolyhedronStep(),
    new PolyhedronWithShadowStep(),
]

slide.stepIndex = 0
slide.step = slide.steps[0]

slide.setStep = function(i) {
    i = Math.max(0, Math.min(slide.steps.length-1, i))
    if(i == slide.stepIndex) return
    if(slide.step.cleanup) slide.step.cleanup()
    slide.stepIndex = i
    slide.step = slide.steps[i]
    if(slide.step.init) slide.step.init()
}

slide.next = function() { slide.setStep(slide.stepIndex+1) }
slide.prev = function() { slide.setStep(slide.stepIndex-1) }


// ============================================================================

class SphereModel {
    constructor(scene) {
        this.scene = scene
        // this.paper = this.createPaper(scene)
        this.sphere = this.createSphere(scene)

        this.floor = new FloorWithShadow(scene)
        
        this.sphereShell = new SphereShell(2.51, scene)
        this.sphereShell.mesh.parent = this.sphere

        this.floor.rtt.renderList.push(this.sphereShell.mesh)
        this.floor.hide()

        this.polygonsManager = new PolygonsManager();
        
        const gl = new BABYLON.GlowLayer("glow", scene, {
            mainTextureFixedSize: 1024,
            blurKernelSize: 128,
          });
        gl.intensity = 5.0;

        this.lightPoint = BABYLON.MeshBuilder.CreateSphere('a', { diameter:0.1}, scene);
        this.lightPoint.position.y = 2.5;
        this.lightPoint.material = new BABYLON.StandardMaterial('amat', scene);
        this.lightPoint.material.emissiveColor.set(1,1,0,1);
        gl.addIncludedOnlyMesh(this.lightPoint);
        this.lightPoint.isVisible = false;
    }

    /*
    foo(theta) {
        this.polygon.setParameters(
            new BABYLON.Vector3(0,2.5,0), 
            new BABYLON.Vector3(Math.sin(theta)*2.5,Math.cos(theta)*2.5,0))
    }


    createPaper(scene) {
        
    }
    */

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
}

//-----------------------------------------------------------------------------

class FloorWithShadow {
    constructor(scene) {
        this.paper = this._createPaper(scene)
        this.rtt = this._createRenderTarget(scene)
        this.paper.material.diffuseTexture = this.rtt
        
        this.sphereShell = new SphereShell(2.51, scene)

    }

    show() {
        this.paper.isVisible = true
    }
    hide() {
        this.paper.isVisible = false

    }
    _createPaper(scene) {

        const paper = this.paper = BABYLON.MeshBuilder.CreateGround('paper', {
            width: 20,
            height: 20,
        }, scene)
        paper.position.y = -2.511
    
        let mat = paper.material = new BABYLON.StandardMaterial('paper-mat', scene)
        mat.backFaceCulling = false
        mat.diffuseColor.set(0.7,0.7,0.7)
        mat.specularColor.set(0,0,0)     
        return paper   
    }

    _createRenderTarget(scene) {
        let rtt = new BABYLON.RenderTargetTexture("rt", 2048, scene, false, false)
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
        rttMaterial.emissiveColor.set(0.1,0.4,0.7)
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
}

//-----------------------------------------------------------------------------

class SphereShell {
    constructor(radius, scene) {
        this.radius = radius

        let mesh = this.mesh = new BABYLON.Mesh('sphere-shell', scene)
        mesh.radius = radius
    
        let pMat = mesh.material = new BABYLON.StandardMaterial('sphere-shell-mat', scene)
        pMat.backFaceCulling = false
        pMat.diffuseColor.set(0.2,0.6,0.7)
        pMat.twoSidedLighting = true

        this.positions = []
        this.indices = []
        this.colors = []
    }

    show() {
        this.mesh.isVisible = true
    }
    hide() {
        this.mesh.isVisible = false
    }

    addPointsPair(i,x1,y1,z1, x2,y2,z2) {
        if(i>0) {
            const v = this.positions.length/3 - 2
            this.indices.push(v,v+1,v+3, v, v+3, v+2) 
        }
        this.positions.push(x1,y1,z1, x2,y2,z2)
    }

    addParallel(theta, dtheta, color, n = 100) {
        const radius = this.radius
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
        const radius = this.radius
        const e0 = p0.clone().normalize()
        let e1 = p1.clone().normalize()
        const dot = BABYLON.Vector3.Dot(e0,e1)
        const theta = Math.acos(dot)
        e1 = e1.subtract(e0.scale(dot)).normalize()        
        const e2 = BABYLON.Vector3.Cross(e0,e1).normalize()
        const delta = e2.scale(w*0.5)
        const m = Math.ceil(10 * theta)+2
        // console.log(m)
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

    addParallels(n, dtheta = 0.01) {
        for(let i=1; i<=n; i++) {
            const theta = Math.PI*i/(n+1);
            this.addParallel(theta, dtheta, new BABYLON.Color3(1,0,0),100)
        }
        this.update()
    }

    addPolyhedron(data, thickness = 0.1) {
        data.edges.forEach(([a,b]) => {
            this.addSegment(data.vertices[a], data.vertices[b], thickness)            
        })
        this.update()
    }

    update() {
        const mesh = this.mesh
        const vertexData = new BABYLON.VertexData()
        const positions = vertexData.positions = this.positions
        const indices = vertexData.indices = this.indices
        const normalFactor = 1.0/this.radius
        const normals = vertexData.normals = positions.map(v=>v*normalFactor)        
        vertexData.applyToMesh(mesh);
        this.positions = []
        this.indices = []
        this.colors = []
    }
}

//-----------------------------------------------------------------------------

class SphericalPolygon {

    constructor(center, p0, m) {
        this.m = m
        this.n = 20
        const scene = slide.scene
        this.center = center
        this.radius = center.length()
        this._setPoints(center, p0)
        
        const mesh = this.mesh = this._buildFaceMesh("prova", m, scene)

        /*
        const material = mesh.material = new BABYLON.StandardMaterial('prova-mat', scene)
        material.diffuseColor.set(0.9,0.45,0.1)
        material.specularColor.set(0,0,0)
        */

    }

    setParameters(center, p0) {
        this.center = center
        this._setPoints(center, p0)
        this._updateFaceMesh()
    }

    getVertexAngle() {
        const v1 = BABYLON.Vector3.Cross(this.pts[0], this.pts[1]).normalize()
        const v2 = BABYLON.Vector3.Cross(this.pts[2], this.pts[1]).normalize()
        return Math.acos(BABYLON.Vector3.Dot(v1,v2))        
    }

    _setPoints(center, p0) {
        const m = this.m
        this.pts = [p0]
        for(let i=1; i<m; i++) {
            const rot = BABYLON.Matrix.RotationAxis(center, Math.PI*2*i/m)
            let p = BABYLON.Vector3.TransformCoordinates(p0,rot)
            this.pts.push(p)
        }
    }

    _computePositionsAndNormals(positions, normals) {
        const n = this.n
        const m = this.m
        const center = this.center
        const pts = this.pts
        let s = 0
        this.vInfos.forEach(ptInfo => {
            const [i,j,k] = ptInfo
            let point
            if(j==0) {
                point = center
            } else {
                const t = j/n
                const p1 = BABYLON.Vector3.Lerp(center, pts[i], t)
                if(k==0) {
                    point = p1
                } else {
                    const p2 = BABYLON.Vector3.Lerp(center, pts[(i+1)%m], t)
                    point = BABYLON.Vector3.Lerp(p1,p2,k/j)
                }
            }
            point.normalize()
            normals[s] = point.x
            normals[s+1] = point.y
            normals[s+2] = point.z
            point.scaleInPlace(this.radius)
            positions[s] = point.x
            positions[s+1] = point.y
            positions[s+2] = point.z            
            s+=3
        })
    }

    _updateFaceMesh() {
        const positions = this.mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = this.mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        this._computePositionsAndNormals(positions, normals) 
        this.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        this.mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    }

    _buildFaceMesh(name, m, scene) {
        const n = this.n
        let mesh = new BABYLON.Mesh(name, scene);
        
        // la mesh è costituita da m triangoli
        // il lato di ogni triangolo contiene n punti (compresi gli estremi)
        // ogni punto della mesh ha tre coordinate: 
        // - il triangolo 'i' : 0..m-1
        // - il parallelo 'j' : 0..n
        // - il meridiano 'k' : 0..j-1
        // il punto(i=0,j=0,k=0) è il centro

        const vInfos = this.vInfos = []
        const tb = {'0,0,0':0}
        vInfos.push([0,0,0])

        const get_pt = function(i,j,k) {
            const id = i+','+j+','+k
            let index = tb[id]
            if(index === undefined) {
                index = vInfos.length
                vInfos.push([i,j,k])                
                tb[id] = index
            }
            return index
        }

        const indices = []
        // creo i punti e aggiungo le facce
        for(let i=0; i<m; i++) {
            // facce con punta verso il centro:
            let i1 = (i+1)%m
            for(let j=1; j<=n; j++) {
                for(let k=0; k+1<j; k++) {
                    indices.push(get_pt(i,j-1,k),  get_pt(i,j,k+1), get_pt(i,j,k))
                }
                indices.push(get_pt(i1,j-1,0),  get_pt(i1,j,0), get_pt(i,j,j-1))
            }
            // facce con la punta lontano dal centro
            for(let j=1; j<n; j++) {
                for(let k=0; k+1<j; k++) {
                    indices.push(get_pt(i,j,k),  get_pt(i,j,k+1), get_pt(i,j+1,k+1))
                }
                indices.push(get_pt(i,j,j-1),  get_pt(i1,j,0), get_pt(i,j+1,j))
            }
        }

        // calcolo punti e normali
        const pts = this.pts
        const center = this.center
        
        let vCount = vInfos.length
        let positions = new Float32Array(3*vCount)
        let normals = new Float32Array(3*vCount)
        this._computePositionsAndNormals(positions, normals) 
        
        let vertexData = new BABYLON.VertexData();
        vertexData.positions = positions
        vertexData.normals = normals
        vertexData.indices = indices

        vertexData.applyToMesh(mesh, true)
        return mesh
    }
}

//-----------------------------------------------------------------------------

class SphericalSegment {
    constructor(p0,p1,thickness) {
        const scene = slide.scene
        
        this.p0 = p0
        this.p1 = p1
        this.thickness = thickness
        this.radius = (p0.length() + p1.length())*0.5
        this.mesh = this._createMesh(scene)
        const mat = this.mesh.material = new BABYLON.StandardMaterial('segment-mat', scene)
        mat.diffuseColor.set(0.2,0.5,0.7)
        mat.backFaceCulling = false
    }

    setParameters(p0,p1) {
        this.p0 = p0
        this.p1 = p1
        this._updateMesh()
    }

    _createMesh(scene) {
        let n = this.n = 20, m = this.m = 7 
        const r1 = this.radius
        const r2 = this.thickness     
        let mesh = new BABYLON.Mesh(name, scene);
        let vd = new BABYLON.VertexData()
        vd.positions = new Float32Array(n*m*3)
        vd.normals = new Float32Array(n*m*3)
        vd.indices = new Int16Array((n-1)*(m-1)*6)

        // set faces
        let s = 0
        for(let j=0; j+1<m; j++) {
            for(let i=0; i+1<n; i++) {
                let ii = vd.indices
                let k = j*n+i
                let ks = [k,k+1,k+1+n,k,k+1+n,k+n]                
                ks.forEach(h => {vd.indices[s++] = h})
            }
        }

        // compute positions and normals
        this._computePositionsAndNormals(vd.positions, vd.normals)        
        vd.applyToMesh(mesh, true)
        return mesh
    }

    _computePositionsAndNormals(positions, normals) {
        const n = this.n, m = this.m
        const r1 = this.radius
        const r2 = this.thickness     
        
        const e0 = this.p0.clone().normalize()
        let e1 = this.p1.clone().normalize()
        const dot = BABYLON.Vector3.Dot(e0, e1)
        const thetaMax = Math.acos(dot)
        e1 = e1.subtract(e0.scale(dot)).normalize()
        const e2 = BABYLON.Vector3.Cross(e0,e1).normalize()

        let s = 0
        for(let j=0; j<m; j++) {
            let phi = -Math.PI*2*j/(m-1)
            let csPhi = Math.cos(phi)
            let snPhi = Math.sin(phi)
            for(let i=0;i<n;i++) {
                let theta = thetaMax*i/(n-1)
                let csTheta = Math.cos(theta)
                let snTheta = Math.sin(theta)

                let ea = e0.scale(csTheta).add(e1.scale(snTheta))

                let norm = ea.scale(csPhi).add(e2.scale(snPhi))
                normals[s] = norm.x
                normals[s+1] = norm.y
                normals[s+2] = norm.z
                let pos = ea.scale(r1).add(norm.scale(r2))
                positions[s] = pos.x
                positions[s+1] = pos.y
                positions[s+2] = pos.z
                s += 3
            }                
        }
    }

    _updateMesh() {
        const positions = this.mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = this.mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        this._computePositionsAndNormals(positions, normals) 
        this.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        this.mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    }

}

//-----------------------------------------------------------------------------

class ReusableEntitySet {
    constructor() {
        this.usedCount = 0
        this.array = []
    }
    beginUpdate() {
        this.usedCount = 0
    }
    endUpdate() {
        if(this.usedCount < this.array.length) {
            for(let i=this.usedCount; i<this.array.length; i++) {
                this._disposeEntity(this.array[i])
            }
            this.array.splice(this.usedCount, this.array.length-this.usedCount)
        }
    }
    addEntity(...params) {
        let index = this.usedCount++
        let entity
        if(index<this.array.length) {
            entity = this.array[index]
            this._setEntityParameters(entity, ...params)
        } else {
            entity = this._createEntity(...params)
            this.array.push(entity)
        }
        return entity
    }    
}

class ReusableSphericalPolygonSet extends ReusableEntitySet {
    constructor() { 
        super()
        this.sideCount = 4 
        const material = this.material = new BABYLON.StandardMaterial('mat', slide.scene)
        material.diffuseColor.set(0.7,0.1,0.7) // 0.9,0.45,0.1)
        material.specularColor.set(0,0,0)
        material.backFaceCulling = false

    }
    _disposeEntity(polygon) { polygon.mesh.dispose() }
    _createEntity(p0,p1) { 
        const polygon = new SphericalPolygon(p0,p1,this.sideCount)
        polygon.mesh.material = this.material
        return polygon
    }
    _setEntityParameters(polygon, p0,p1) { polygon.setParameters(p0,p1) }
    setSideCount(sideCount) {
        if(sideCount == this.sideCount) return
        this.sideCount = sideCount
        this.beginUpdate()
        this.endUpdate()        
    }
}

class ReusableSphericalSegmentSet extends ReusableEntitySet {
    constructor() { super(); this.radius = 0.05 }
    _disposeEntity(segment) { segment.mesh.dispose() }
    _createEntity(p0,p1) { return new SphericalSegment(p0,p1,this.radius)}
    _setEntityParameters(segment, p0,p1) { segment.setParameters(p0,p1) }
}


//-----------------------------------------------------------------------------


class PolygonsManager {
    constructor() {
        this.polygons = new ReusableSphericalPolygonSet()
        this.segments = new ReusableSphericalSegmentSet() 
        this.polygonSize = 0.5   
        this.radius = 2.51    
    }

    _beginUpdate() {
        this.polygons.beginUpdate()
        this.segments.beginUpdate()
    }

    _endUpdate() {
        this.polygons.endUpdate()
        this.segments.endUpdate()
    }

    _addPolygon(p0,p1) {
        let polygon = this.polygons.addEntity(p0,p1)
        const pts = polygon.pts
        for(let i=0; i<pts.length; i++) {
            this.segments.addEntity(pts[i], pts[(i+1)%pts.length])
        }
        return polygon
    }

    showNothing() { 
        this._beginUpdate()
        this._endUpdate()
    }

    /*
    showOnePolygon() {

        const theta = this.polygonSize
        const radius = this.radius
        const v1 = new BABYLON.Vector3(0,radius,0)
        const v2 = new BABYLON.Vector3(Math.sin(theta)*radius,Math.cos(theta)*radius,0)

        this._beginUpdate()
        this._addPolygon(v1,v2)
        this._endUpdate()
        

       
    }
    */

    showPolygons(n) {
        this.polygons.setSideCount(4)
        const theta = this.polygonSize
        const radius = this.radius
        const v1 = new BABYLON.Vector3(0,radius,0)
        const v2a = new BABYLON.Vector3(Math.sin(theta)*radius,Math.cos(theta)*radius,0)        
        const roty = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0,1,0), Math.PI/4)    
        const v2 = new BABYLON.Vector3()
        v2a.rotateByQuaternionToRef(roty, v2)

        this._beginUpdate()
        let polygon = this._addPolygon(v1,v2)
        const angle = polygon.getVertexAngle()
        const rotation = BABYLON.Quaternion.RotationAxis(v2, angle)

        const centers = [v1]
        for(let i=1; i<n; i++) {
            centers.push(new BABYLON.Vector3())
            centers[i-1].rotateByQuaternionToRef(rotation, centers[i])
            v2.normalize().scaleInPlace(radius)
            this._addPolygon(centers[i],v2)
        }
        this._endUpdate()
    }

    showPolyhedron(data) {
        this.polygons.setSideCount( data.faces[0].length )
        this._beginUpdate()
        data.faces.forEach(face => {
            const facePts = face.map(i => data.vertices[i])
            const faceCenter = facePts.reduce((a,b)=>a.add(b)).scaleInPlace(1.0/facePts.length)
            faceCenter.normalize().scaleInPlace(this.radius)
            const p1 = BABYLON.Vector3.Lerp(facePts[0], faceCenter, 0.03)
                .normalize().scaleInPlace(this.radius)
            this._addPolygon(faceCenter, p1)
        })
        this._endUpdate()
    }

    setSize(size) {
        this.polygonSize = size
        this.showPolygons(this.polygons.usedCount)
    }

}


//-----------------------------------------------------------------------------
