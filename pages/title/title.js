const slide = {
    name: "Title",
    xwRotation : {
        enabled: false,
        angle: 0,
        speed: 0
    }
}

function setup() {

    let canvas = slide.canvas = document.getElementById("renderCanvas")
    let engine = slide.engine = new BABYLON.Engine(canvas, true)
    let scene = slide.scene = new BABYLON.Scene(engine)
    scene.clearColor.set(1,1,1,1);

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

function placeCylinder(cylinder, vStart, vEnd) {
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
        let mat = dot.material = new BABYLON.StandardMaterial(name+'dot-mat', scene)
        mat.diffuseColor.set(0.6,0.1,0.7)
        this.vertices = [dot]
        for(let i = 1; i<data.vertices.length; i++) { 
            let inst = dot.createInstance(name+'-dot-inst-'+i)
            this.vertices.push(inst);
            inst.parent = pivot;
        }
        
        let edge = BABYLON.MeshBuilder.CreateCylinder(name+'-edge', {diameter:0.1, height:1}, scene)
        edge.parent = pivot
        mat = edge.material = new BABYLON.StandardMaterial(name+'edge-mat', scene)
        mat.diffuseColor.set(0.6,0.1,0.7)
        this.edges = [edge]
        for(let i = 1; i<data.edges.length; i++) { 
            let inst = edge.createInstance(name+'-edge-inst-'+i)
            this.edges.push(inst);
            inst.parent = pivot;
        }

    }

    update() {
        let phi = slide.xwRotation.angle; // performance.now() * 0.001
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
            placeCylinder(this.edges[i], pa,pb)
        })

        const dt = slide.engine.getDeltaTime() * 0.001;

        if(slide.xwRotation.enabled) {
            slide.xwRotation.speed = Math.min(1,slide.xwRotation.speed + 1*dt);
        } else {
            slide.xwRotation.speed = Math.max(0,slide.xwRotation.speed - 1*dt);
        }
        slide.xwRotation.angle += slide.xwRotation.speed * dt;
        this.pivot.rotation.y += 0.1* dt * (1-slide.xwRotation.speed);
    }
}




function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            const key = kbInfo.event.keyCode
            console.log(kbInfo.event);
            if(49<=key && key<=49+6) {
                slide.model.pivot.dispose()
                let data
                switch(key)
                {
                    case 49: data = PolychoronData.p5; break
                    case 50: data = PolychoronData.p8; break
                    case 51: data = PolychoronData.p16; break
                    case 52: data = PolychoronData.p24; break
                    case 53: data = PolychoronData.p120; break
                    case 54: data = PolychoronData.p600; break
                    default: data = PolychoronData.p5; break
                }
                slide.model = new PolychoronModel('pc', data, slide.scene)
                slide.model.update()                
            }
            else slide.xwRotation.enabled = !slide.xwRotation.enabled;
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            break;
    }
}
