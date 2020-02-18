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
    let clicked = false
    let oldy
    slide.scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onpointerdown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                if(clicked) onpointerup(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(clicked) onpointerdrag(pointerInfo)
                break
        }
    });
    function onpointerdown(pointerInfo) {
        console.log(pointerInfo)
        if(pointerInfo.event.offsetX<100) {
            clicked = true
            oldy = pointerInfo.event.offsetY
            setTimeout(() => slide.camera.detachControl(slide.canvas))
        }
    }
    function onpointerup(pointerInfo) {
        clicked = false
        slide.camera.attachControl(slide.canvas, true); 
    }
    function onpointerdrag(pointerInfo) {
        let y = pointerInfo.event.offsetY
        let dy = y-oldy
        oldy = y
        changeParameter(dy * 0.01)
    }

}



function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(49<=key && key<=49+4) {
            }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}

let currentTheta = 0.1
function changeParameter(d) {
    currentTheta += d
    slide.model.foo(currentTheta)
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
        this.paper.material.diffuseTexture = this.rtt
        
        this.sphereShell = new SphereShell(2.51, scene)
        this.sphereShell.mesh.parent = this.sphere

        this.rtt.renderList.push(this.sphereShell.mesh)
        /*
        this.addParallel(0.3,0.02, new BABYLON.Color3(0,1,0))
        this.updateSphereShell()
        */

        const theta = 0.7

        const radius = 2.5
        const v1 = new BABYLON.Vector3(0,radius,0)
        const v2 = new BABYLON.Vector3(Math.sin(theta)*radius,Math.cos(theta)*radius,0)

        this.polygon = new SphericalPolygon(v1,v2,4)

        
        const angle = this.polygon.getVertexAngle()

        const v3 = new BABYLON.Vector3()
        v1.rotateByQuaternionToRef( BABYLON.Quaternion.RotationAxis(v2, angle), v3 )
        v3.normalize().scaleInPlace(radius)
        this.secondPolygon = new SphericalPolygon(v3,v2,4)

        const v4 = new BABYLON.Vector3()
        v3.rotateByQuaternionToRef( BABYLON.Quaternion.RotationAxis(v2, angle), v4 )
        v4.normalize().scaleInPlace(radius)
        this.secondPolygon = new SphericalPolygon(v4,v2,4)

        /*
    
        const theta = 1.2
        let polygon = new SpherePolygon(
            new BABYLON.Vector3(0,2.5,0), 
            new BABYLON.Vector3(Math.sin(theta)*2.5,Math.cos(theta)*2.5,0),
            3)

        new SphereSegment(polygon.pts[0], polygon.pts[1], 0.1)
        */
    }

    foo(theta) {
        this.polygon.setParameters(
            new BABYLON.Vector3(0,2.5,0), 
            new BABYLON.Vector3(Math.sin(theta)*2.5,Math.cos(theta)*2.5,0))
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
        this.radius = center.length() * 1.01
        this._setPoints(center, p0)
        
        const mesh = this.mesh = this._buildFaceMesh("prova", m, scene)
        const material = mesh.material = new BABYLON.StandardMaterial('prova-mat', scene)
        material.diffuseColor.set(0.9,0.45,0.1)
        material.specularColor.set(0,0,0)
    }

    setParameters(center, p0) {
        console.log(center, p0)
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
        /*
        this.pts.forEach((p,i)=> {
            let dot = BABYLON.MeshBuilder.CreateSphere('p-'+i, {diameter:0.1}, scene)
            dot.position.copyFrom(p)
        })
        */
    }


    _computePointsAndNormals(positions, normals) {
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
        this._computePointsAndNormals(positions, normals) 
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
        this._computePointsAndNormals(positions, normals) 
        
        let vertexData = new BABYLON.VertexData();
        vertexData.positions = positions
        vertexData.normals = normals
        vertexData.indices = indices

        vertexData.applyToMesh(mesh, true)
        console.log(mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind));
        return mesh
    }
}

//-----------------------------------------------------------------------------

class SphereSegment {
    constructor(p0,p1,thickness) {
        const scene = slide.scene
        
        this.p0 = p0
        this.p1 = p1
        this.thickness = thickness
        this.radius = (p0.length() + p1.length())*0.5
        this.mesh = this.createMesh(scene)
        const mat = this.mesh.material = new BABYLON.StandardMaterial('segment-mat', scene)
        mat.diffuseColor.set(0.2,0.5,0.7)
        mat.backFaceCulling = false
    }

    createMesh(scene) {
        let n = 20, m = 7 
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
        
        const e0 = this.p0.clone().normalize()

        let e1 = this.p1.clone().normalize()
        const dot = BABYLON.Vector3.Dot(e0, e1)
        const thetaMax = Math.acos(dot)
        e1 = e1.subtract(e0.scale(dot)).normalize()
        const e2 = BABYLON.Vector3.Cross(e0,e1).normalize()

        s = 0
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
                vd.normals[s] = norm.x
                vd.normals[s+1] = norm.y
                vd.normals[s+2] = norm.z
                let pos = ea.scale(r1).add(norm.scale(r2))
                vd.positions[s] = pos.x
                vd.positions[s+1] = pos.y
                vd.positions[s+2] = pos.z
                s += 3
            }                
        }
        vd.applyToMesh(mesh)
        return mesh
    }

}

//-----------------------------------------------------------------------------
