let canvas,engine,scene
let camera
let light1, light2
let model
let sphere

function setup() {
    canvas = document.getElementById("renderCanvas")
    engine = new BABYLON.Engine(canvas, true)
    scene = new BABYLON.Scene(engine)

    camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    
    light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    
    scene.registerBeforeRender(tick)
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", () => engine.resize())
}

function cleanup() {
    engine.stopRenderLoop()
    scene.dispose
    scene = undefined
    engine.dispose
    engine = undefined
    camera = undefined

}


document.addEventListener("DOMContentLoaded", setup)



function populateScene() {
    sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {diameter:0.1}, scene)
    sphere.material = new BABYLON.StandardMaterial('sphere-mat', scene)
    sphere.material.diffuseColor.set(0.8,0.3,0.6)

    // model = new PolychoronSimpleModel(PolychoronData.p8)

    model = new PolychoronSectionModel(PolychoronData.p8)
}

let stop = false

function tick() {
    sphere.position.x = Math.cos(performance.now()*0.001) * 2
    if(stop==false) {
        model.w0 = Math.sin(performance.now()*0.0001)
        model.update()
    
    }    
}

// ============================================================================

class PolychoronSimpleModel extends GeometricModel {
    constructor(data) {
        super()
        this.data = data
        this.update()
    }
    project(p4) {
        const k = 10.0/(4.0 + p4.w)
        return new BABYLON.Vector3(p4.x*k,p4.y*k,p4.z*k)
    }
    update() {
        const me = this
        const pts = this.data.vertices.map(p=>me.project(p))
        this.beginUpdate()
        pts.forEach(p=>me.addVertex(p,0.1))
        this.data.edges.forEach(([a,b]) => {me.addEdge(pts[a],pts[b],0.06)})
        this.endUpdate()
    }
}

BABYLON.Vector4.Transform = function(mat, v4) {
    const m = mat.m
    return new BABYLON.Vector4(
        m[ 0]*v4.x + m[ 1]*v4.y + m[ 2]*v4.z + m[ 3]*v4.w,
        m[ 4]*v4.x + m[ 5]*v4.y + m[ 6]*v4.z + m[ 7]*v4.w,
        m[ 8]*v4.x + m[ 9]*v4.y + m[10]*v4.z + m[11]*v4.w,
        m[12]*v4.x + m[13]*v4.y + m[14]*v4.z + m[15]*v4.w)
}

const uffa = {}

class PolychoronSectionModel extends GeometricModel {
    constructor(data) {
        super()
        this.data = data
        this.matrix = BABYLON.Matrix.Identity()
        this.w0 = 0.

        let theta = Math.PI*0.25
        let csTheta = Math.cos(theta)
        let snTheta = Math.sin(theta)
    
        let arr = [
            csTheta,0,0,-snTheta,
            0,1,0,0,
            0,0,1,0,
            snTheta,0,0,csTheta
            ]
        this.matrix = BABYLON.Matrix.FromArray(arr)

        theta = Math.PI*0.33
        csTheta = Math.cos(theta)
        snTheta = Math.sin(theta)
        arr = [
            1,0,0,0,
            0,csTheta,0,-snTheta,
            0,0,1,0,
            0,snTheta,0,csTheta
            ]
        this.matrix = this.matrix.multiply(BABYLON.Matrix.FromArray(arr)) 

        arr = [
            1,0,0,0,
            0,1,0,0,
            0,0,csTheta,-snTheta,
            0,0,snTheta,csTheta
            ]
        this.matrix = this.matrix.multiply(BABYLON.Matrix.FromArray(arr)) 

        this.w0 = 0.5

        this.update()
    }
    update() {
        const me = this
        const mat = this.matrix
        
        const Transform = BABYLON.Vector4.Transform
        const pts4 = this.data.vertices.map(p=>Transform(mat,p))
        let w0 = this.adjustw(this.w0, pts4)
        
        let edgePoints = this.computeEdgeIntersections(w0, pts4)

        uffa.pts4 = pts4
        uffa.edgePoints = edgePoints

        this.beginUpdate()
        const tb = {}
        const m = pts4.length
        const pts = []
        edgePoints.forEach(([a,b,p])=> { 
            const j = me.addVertex(p,0.1)
            tb[a*m+b] = tb[b*m+a] = j
            pts.push(p)
        })

        this.data.faces.forEach(f => {
            let a = f[f.length-1]
            const js = []
            f.forEach(b => {
                if((pts4[a].w-w0)*(pts4[b].w-w0)<0) {
                    js.push(tb[a*m+b])
                }
                a = b
            })
            if(js.length >= 2) {
                me.addEdge(pts[js[0]], pts[js[1]], 0.05)
            }
        })
        
        this.endUpdate()
    }

    adjustw(w0,pts) {
        if(pts.filter(p=>p.w==w0).length==0) {
            // w0 not present in pts[]: no problem
            return w0
        } else {
            const epsilon = 0.00001
            let lst = pts.filter(p=>p.w>w0)
            if(lst.length == 0) {
                // no w>w0
                return w0 + epsilon
            } else {
                let w = lst.reduce((a,b)=>a.w<b.w?a:b).w
                return Math.min(w0 + epsilon, (w0 + w)*0.5)
            }
        }
    }

    computeEdgeIntersections(w0, pts4) {
        // return [(a,b,p),...]        
        return this.data.edges.map(([a,b]) => {
            let wa = pts4[a].w
            let wb = pts4[b].w
            if((wa-w0)*(wb-w0)<0) {
                let p = BABYLON.Vector3.Lerp(
                    pts4[a].toVector3(),
                    pts4[b].toVector3(),
                    (w0-wa)/(wb-wa))
                return [a,b,p]
            } else {
                return undefined
            }
        }).filter(p=>p!==undefined)
    } 
}
