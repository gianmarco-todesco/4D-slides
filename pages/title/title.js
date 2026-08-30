const slide = {
    name: "Title",
    
}

function setup() {

    let canvas = slide.canvas = document.getElementById("renderCanvas")
    let engine = slide.engine = new BABYLON.Engine(canvas, true)
    let scene = slide.scene = new BABYLON.Scene(engine)
    applySlideBackground(scene)

    let camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    let light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    let light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene(scene)
    
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", () => engine.resize())
    scene.onKeyboardObservable.add(onKeyEvent);
}

function cleanup() {
    slide.engine.stopRenderLoop()    
    slide.scene.dispose()
    delete slide.scene
    slide.engine.dispose()
    delete slide.engine
}


function populateScene(scene) {
    /*
    sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {diameter:2}, scene)
    sphere.material = new BABYLON.StandardMaterial('sphere-mat', scene)
    sphere.material.diffuseColor.set(0.8,0.7,0.8)
    */

    slide.model = new PolychoronModel('tesseract', PolychoronData.p8, scene)
    slide.model.update()



}

function tick() {
    // sphere.position.x = Math.cos(performance.now()*0.001) * 2
    slide.model.update()
}

// Same as placeCylinder() in libs/gutil.js but without the radius
// argument, so it must not share its name: this file is loaded after
// gutil.js and would otherwise shadow it with a different signature.
function placeUnitCylinder(cylinder, vStart, vEnd) {
    const distance = BABYLON.Vector3.Distance(vStart,vEnd )
    BABYLON.Vector3.LerpToRef(vStart,vEnd,0.5,cylinder.position)       
    cylinder.scaling.set(1,distance,1)

    const delta = vEnd.subtract(vStart).scale(1.0/distance)
    const up = new BABYLON.Vector3(0, 1, 0)
    let angle = Math.acos(BABYLON.Vector3.Dot(delta, up));
    let quaternion
    if(Math.abs(angle) > 0.00001 && Math.abs(angle) < Math.PI - 0.00001) {
        const axis = BABYLON.Vector3.Cross( up, delta).normalize()
        quaternion = BABYLON.Quaternion.RotationAxis(axis, angle);    
    } else quaternion = BABYLON.Quaternion.Identity()
    cylinder.rotationQuaternion = quaternion
}

class PolychoronModel {
    constructor(name, data, scene) {
        this.data = data
        const pivot = this.pivot = new BABYLON.Mesh(name, scene)

        let dot = BABYLON.MeshBuilder.CreateSphere(name+'-dot', {diameter:0.1}, scene)
        dot.parent = pivot
        // Against the dark background this magenta was bright; against white it
        // shouts, and it has to sit under the title text.
        const inkColour = themed([0.35, 0.10, 0.45], [0.6, 0.1, 0.7])
        let mat = dot.material = new BABYLON.StandardMaterial(name+'dot-mat', scene)
        mat.diffuseColor.set(...inkColour)
        this.vertices = [dot]
        for(let i = 1; i<data.vertices.length; i++) { 
            let inst = dot.createInstance(name+'-dot-inst-'+i)
            this.vertices.push(inst);
            inst.parent = pivot;
        }
        
        let edge = BABYLON.MeshBuilder.CreateCylinder(name+'-edge', {diameter:0.1, height:1}, scene)
        edge.parent = pivot
        mat = edge.material = new BABYLON.StandardMaterial(name+'edge-mat', scene)
        mat.diffuseColor.set(...inkColour)
        this.edges = [edge]
        for(let i = 1; i<data.edges.length; i++) { 
            let inst = edge.createInstance(name+'-edge-inst-'+i)
            this.edges.push(inst);
            inst.parent = pivot;
        }

        // Translucent faces.
        //
        // One mesh per face, not one mesh holding all 24. These are transparent,
        // and Babylon sorts transparent *meshes* back to front before drawing
        // them; a single mesh would go out as one unsorted batch and the
        // overlaps would pop as the tesseract turns. 24 draw calls is nothing.
        //
        // The 4D to 3D projection is a central projection, so it takes plane to
        // plane: each square face stays planar and two triangles are exact.
        const faceMat = this.faceMaterial = new BABYLON.StandardMaterial(name+'-face-mat', scene)
        faceMat.diffuseColor.set(...themed([0.55, 0.35, 0.65], [0.7, 0.6, 0.9]))
        faceMat.specularColor.set(0.1, 0.1, 0.1)
        faceMat.alpha = themed(0.13, 0.2)
        faceMat.backFaceCulling = false      // a face can be seen from either side
        this.faces = data.faces.map((f, i) => {
            const m = new BABYLON.Mesh(name+'-face-'+i, scene)
            m.material = faceMat
            m.parent = pivot
            return m
        })
        this.faceBuffers = data.faces.map(f => ({
            positions: new Float32Array(f.length * 3),
            normals: new Float32Array(f.length * 3),
            indices: (() => { const ix = []; for(let k=2; k<f.length; k++) ix.push(0, k-1, k); return ix })(),
            built: false
        }))

        this.xwRotation = {
            status: 0,
            angle: 0,
            speed: 0,
            angle0: 0,
            t0: 0,
            duration:10000.0,
            percent: 0
        }
    }

    startXwRotation() {
        const xw = this.xwRotation;
        xw.status = 1;
    }
    stopXwRotation() {
        const xw = this.xwRotation;
        if(xw.status == 1)
            xw.status = 2;
    }

    stepXw(dt) {
        const maxSpeed = 1.0;
        const xw = this.xwRotation;
        if(xw.status == 1) {
            xw.speed = Math.min(maxSpeed, xw.speed + dt);
            xw.percent = xw.speed/maxSpeed;
            xw.angle += xw.speed * dt;
        } else if(xw.status == 2) {
            xw.speed = Math.max(0.0, xw.speed - dt);
            xw.angle += xw.speed * dt;
            xw.percent = xw.speed/maxSpeed;
            if(xw.speed == 0.0) {
                xw.status == 3;
                let a = xw.angle / (2*Math.PI);
                xw.angle = 2*Math.PI*(a-Math.floor(a));
                xw.t0 = performance.now();
                xw.angle0 = xw.angle;
                xw.duration = 1000.0;
                xw.status = 3;
            }
        } else if(xw.status == 3) {
            let t = (performance.now() - xw.t0)/xw.duration;
            if(t>1) {
                xw.angle = 0;
                xw.status = 0;
            } else {
                xw.angle = xw.angle0 * (1+Math.cos(Math.PI*t))/2;
            }
        }
    }

    updateFaces() {
        this.data.faces.forEach((f, i) => {
            const buf = this.faceBuffers[i]
            f.forEach((j, k) => {
                const p = this.vertices[j].position
                buf.positions[k*3]   = p.x
                buf.positions[k*3+1] = p.y
                buf.positions[k*3+2] = p.z
            })
            BABYLON.VertexData.ComputeNormals(buf.positions, buf.indices, buf.normals)
            if(!buf.built) {
                const vd = new BABYLON.VertexData()
                vd.positions = buf.positions
                vd.indices = buf.indices
                vd.normals = buf.normals
                vd.applyToMesh(this.faces[i], true)   // updatable
                buf.built = true
            } else {
                this.faces[i].updateVerticesData(BABYLON.VertexBuffer.PositionKind, buf.positions)
                this.faces[i].updateVerticesData(BABYLON.VertexBuffer.NormalKind, buf.normals)
            }
        })
    }

    update() {
        let phi = this.xwRotation.angle; // performance.now() * 0.001
        let cs = Math.cos(phi), sn = Math.sin(phi)

        const dist = 2;
        const scaleFactor = 3;
        let vs = []
        this.data.vertices.forEach((p,i)=>{
            let x1 = p.x * cs - p.w * sn, 
                x2 = p.y, 
                x3 = p.z, 
                x4 = p.x * sn + p.w * cs


            let pos = this.vertices[i].position
            let k = scaleFactor*dist/(x4+dist)
            pos.x = x1 * k
            pos.y = x2 * k
            pos.z = x3 * k

        })

        this.data.edges.forEach(([a,b],i)=>{
            let pa = this.vertices[a].position
            let pb = this.vertices[b].position
            placeUnitCylinder(this.edges[i], pa,pb)
        })

        this.updateFaces()

        const dt = slide.engine.getDeltaTime() * 0.001;
        this.stepXw(dt);
        this.pivot.rotation.y += 0.1* dt * (1-this.xwRotation.percent);
        
    }
}




function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            // event.key, not event.keyCode: the cases below are characters, and
            // comparing them against a numeric keyCode is what kept keys 1-6
            // from ever selecting a polychoron here. polychora.js does the same
            // job with keyCode, and matches against numbers.
            const key = kbInfo.event.key
            if(key.length == 1 && "123456".indexOf(key)>=0) {
                slide.model.pivot.dispose()
                let data
                switch(key)
                {
                    case '1': data = PolychoronData.p5; break
                    case '2': data = PolychoronData.p8; break
                    case '3': data = PolychoronData.p16; break
                    case '4': data = PolychoronData.p24; break
                    case '5': data = PolychoronData.p120; break
                    case '6': data = PolychoronData.p600; break
                }
                // slide.model, not a local: tick() renders whatever slide.model
                // points at, and the local was declared const anyway.
                slide.model = new PolychoronModel('pc', data, slide.scene)
                slide.model.update()
            }
            else if(key == 'r') {
                const model = slide.model
                if(model.xwRotation.status == 0)
                    model.startXwRotation();
                else if(model.xwRotation.status == 1)
                    model.stopXwRotation();

            } else console.log(key);
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            break;
    }
}
