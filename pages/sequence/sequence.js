let canvas,engine,scene
let camera
let light1, light2

function initialize() {
    canvas = document.getElementById("renderCanvas")
    engine = new BABYLON.Engine(canvas, true)
    scene = new BABYLON.Scene(engine)
    camera = new BABYLON.ArcRotateCamera("Camera", 
    Math.PI / 2, Math.PI / 2, 10, 
    new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)

    light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), scene)    

    let model = new Model(scene)

    let oldTime = performance.now()
    let currentDim = 0
    let currentDimSpeed = 0.001
    let currentDimDir = 1
    
    scene.registerBeforeRender(function () {
        let time = performance.now()
        let deltaTime = time - oldTime
        oldTime = time
    
        currentDim += currentDimSpeed * currentDimDir * deltaTime
        if(currentDimDir>0 && currentDim >= 5) { currentDim = 4.9999; currentDimDir = -1 }
        else if(currentDimDir<0 && currentDim <= 0.0) { currentDim = 0; currentDimDir = 1 } 
        model.updatePositions(currentDim)
    })
    
    window.addEventListener("resize", () => engine.resize())
    
}

function start() {
    engine.runRenderLoop(() => scene.render())    
}

function stop() {
    engine.stopRenderLoop()    
}




class Model {
    constructor(scene) {
        this.scene = scene
        this.vertices = []
        let edgeCount = 0
        for(let i=0; i<32; i++) {
            let sphere = BABYLON.MeshBuilder.CreateSphere("sphere-"+i, {diameter:0.1}, scene)
            let mat = sphere.material = new BABYLON.StandardMaterial('mat-'+i, scene)
            mat.diffuseColor.set(0.8,0.2,0.2)
            this.vertices.push(sphere)
            sphere.edges = {}
            for(let j=0; j<5; j++) {
                if((i>>j)&1) {
                    let edge = BABYLON.MeshBuilder.CreateCylinder("cyl-"+edgeCount, {diameter:0.05, height:1}, scene)
                    edge.mat = new BABYLON.StandardMaterial('mat2-'+edgeCount, scene)
                    edge.mat.diffuseColor.set(0.5,0.5,0.5)
                    sphere.edges[j] = edge
                    edgeCount++
                }
            }
        }
        
        this.updatePositions(4.99)
    }
    updatePositions(v) {
        const d = Math.floor(v)
        const t = v-d

        const ee = [
            new BABYLON.Vector3(1,0,0),
            new BABYLON.Vector3(0,1,0),
            new BABYLON.Vector3(0,0,1),
            new BABYLON.Vector3(0.5,0.5,0.5),
            new BABYLON.Vector3(-0.4,0.25,0.25)            
        ]
        for(let i=0; i<32; i++) {
            let visible = true
            for(let j=d+1;j<5;j++) {
                if((i>>j)&1) visible = false
            }
            if(visible) this.vertices[i].visibility = 1
            else { 
                this.vertices[i].visibility = 0; 
                for(let j in this.vertices[i].edges) this.vertices[i].edges[j].visibility = 0
                continue 
            }
            let p = this.vertices[i].position 
            p.set(0,0,0)
            for(let j=0;j<=d;j++) {

                let s = ((i>>j)&1)==0 ? -1 : 1
                if(j==d) s *= t
                const e = ee[j]
                p.addInPlaceFromFloats(e.x*s, e.y*s, e.z*s)
            }
            for(let j in this.vertices[i].edges) {
                let edge = this.vertices[i].edges[j]
                edge.visibility = 1
                let p1 = this.vertices[i].position
                let p0 = this.vertices[i-(1<<j)].position
                this.place(edge, p0, p1)
            }


        }
    }

    place(edge, vstart, vend) {
        const distance = BABYLON.Vector3.Distance(vstart,vend );
        
        
        edge.position.set(
            (vstart.x+vend.x)*0.5,
            (vstart.y+vend.y)*0.5,
            (vstart.z+vend.z)*0.5)
            
           
        edge.scaling.set(1,distance*0.9,1)
        const delta = vend.subtract(vstart).normalize()
        const up = new BABYLON.Vector3(0, 1, 0)
        var angle = Math.acos(BABYLON.Vector3.Dot(delta, up));
        if(Math.abs(angle) > 0.00001) {
            const axis = BABYLON.Vector3.Cross( up, delta).normalize()
            edge.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, angle);    
        }    
        else edge.rotationQuaternion = BABYLON.Quaternion.RotationAxis(up,0)

        // First of all we have to set the pivot not in the center of the cylinder:    
        // cylinder.setPivotMatrix(BABYLON.Matrix.Translation(0, -distance / 2, 0));     
        // Then move the cylinder to red sphere    
        // cylinder.position = redSphere.position;   
        // Then find the vector between spheres   
        // var v1 = vend.subtract(vstart);    v1.normalize();    
        // var v2 = new BABYLON.Vector3(0, 1, 0);       
        // Using cross we will have a vector perpendicular to both vectors    
        // var axis = BABYLON.Vector3.Cross(v1, v2);    axis.normalize();   
        // console.log(axis);       
        // Angle between vectors    var angle = BABYLON.Vector3.Dot(v1, v2);    
        // console.log(angle);        
        // Then using axis rotation the result is obvious    
        // cylinder.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, -Math.PI / 2 + angle);
    }

}
