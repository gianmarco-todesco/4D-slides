let canvas,engine,scene
let camera
let light1, light2

let sphere, model

document.addEventListener("DOMContentLoaded", e=> {
    canvas = document.getElementById("renderCanvas")
    engine = new BABYLON.Engine(canvas, true)
    scene = new BABYLON.Scene(engine)


    camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", () => engine.resize())

    scene.onKeyboardObservable.add(onKeyEvent);
})


function populateScene() {
    /*
    sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {diameter:2}, scene)
    sphere.material = new BABYLON.StandardMaterial('sphere-mat', scene)
    sphere.material.diffuseColor.set(0.8,0.7,0.8)
    */

    model = new PolychoronModel('tesseract', PolychoronData2.p5)
    model.update()



}

function tick() {
    // sphere.position.x = Math.cos(performance.now()*0.001) * 2
    model.update()
}

function placeCylinder(cylinder, vStart, vEnd) {
    const distance = BABYLON.Vector3.Distance(vStart,vEnd )
    BABYLON.Vector3.LerpToRef(vStart,vEnd,0.5,cylinder.position)       
    cylinder.scaling.set(1,distance,1)

    const delta = vEnd.subtract(vStart).scale(1.0/distance)
    const up = new BABYLON.Vector3(0, 1, 0)
    let angle = Math.acos(BABYLON.Vector3.Dot(delta, up));
    let quaternion
    if(Math.abs(angle) > 0.00001) {
        const axis = BABYLON.Vector3.Cross( up, delta).normalize()
        quaternion = BABYLON.Quaternion.RotationAxis(axis, angle);    
    } else quaternion = BABYLON.Quaternion.Identity()
    cylinder.rotationQuaternion = quaternion
}

class PolychoronModel {
    constructor(name, data) {
        this.data = data
        const pivot = this.pivot = new BABYLON.Mesh(name, scene)

        let dot = BABYLON.MeshBuilder.CreateSphere(name+'-dot', {diameter:0.2}, scene)
        dot.parent = pivot
        let mat = dot.material = new BABYLON.StandardMaterial(name+'dot-mat', scene)
        mat.diffuseColor.set(0.6,0.1,0.7)
        this.vertices = [dot]
        for(let i = 1; i<data.vertices.length; i++) { 
            let inst = dot.createInstance(name+'-dot-inst-'+i)
            this.vertices.push(inst)
        }
        
        let edge = BABYLON.MeshBuilder.CreateCylinder(name+'-edge', {diameter:0.1, height:1}, scene)
        edge.parent = pivot
        mat = edge.material = new BABYLON.StandardMaterial(name+'edge-mat', scene)
        mat.diffuseColor.set(0.6,0.6,0.6)
        this.edges = [edge]
        for(let i = 1; i<data.edges.length; i++) { 
            let inst = edge.createInstance(name+'-edge-inst-'+i)
            this.edges.push(inst)
        }

    }

    update() {
        let phi = performance.now() * 0.001
        let cs = Math.cos(phi), sn = Math.sin(phi)

        let vs = []
        this.data.vertices.forEach((p,i)=>{
            let x1 = p.x * cs - p.w * sn, 
                x2 = p.y, 
                x3 = p.z, 
                x4 = p.x * sn + p.w * cs


            let pos = this.vertices[i].position
            let k = 5/(x4+4)
            pos.x = x1 * k
            pos.y = x2 * k
            pos.z = x3 * k

        })

        this.data.edges.forEach(([a,b],i)=>{
            let pa = this.vertices[a].position
            let pb = this.vertices[b].position
            placeCylinder(this.edges[i], pa,pb)
        })


    }
}




function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            const key = kbInfo.event.keyCode
            if(49<=key && key<=49+6) {
                model.pivot.dispose()
                let data
                switch(key)
                {
                    case 49: data = PolychoronData2.p5; break
                    case 50: data = PolychoronData2.p8; break
                    case 51: data = PolychoronData2.p16; break
                    case 52: data = PolychoronData2.p24; break
                    case 53: data = PolychoronData2.p120; break
                    case 54: data = PolychoronData2.p600; break
                    default: data = PolychoronData2.p5; break
                }
                model = new PolychoronModel('pc', data)
                model.update()                
            }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            break;
    }
}
