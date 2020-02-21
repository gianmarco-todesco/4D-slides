"use strict";

const slide = {
    name:"4D sections"
}

function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)

    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    
    scene.registerBeforeRender(tick)
    handlePointer()
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", onResize)
}

function cleanup() {
    window.removeEventListener("resize", onResize)
    slide.engine.stopRenderLoop()
    slide.scene.dispose
    delete slide.scene
    slide.engine.dispose
    delete slide.engine    
}

function onResize() {
    slide.engine.resize()
}


function populateScene() {
    const scene = slide.scene
    slide.model = new PolychoronSectionModel('model',PolychoronData.gax, scene)
}

let stop = false

function tick() {
    if(stop==false) {
        // slide.model.w0 = 4*Math.sin(performance.now()*0.0001)
        // slide.model.update()    
    }    
}

function handlePointer() {
    let status = 0
    let oldx, oldy
    slide.scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onpointerdown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                if(status != 0) onpointerup(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(status != 0) onpointerdrag(pointerInfo)
                break
        }
    });
    function onpointerdown(pointerInfo) {
        console.log(pointerInfo)
        if(pointerInfo.pickInfo.pickedMesh) {
            console.log(pointerInfo.pickInfo.pickedMesh.name)
        }
        if(pointerInfo.event.offsetX<100) {
            status = 1
        } else if(pointerInfo.pickInfo.pickedMesh) {
            status = 2
        }
        if(status != 0) {
            oldx = pointerInfo.event.offsetX
            oldy = pointerInfo.event.offsetY
            setTimeout(() => slide.camera.detachControl(slide.canvas))
        }
    }
    function onpointerup(pointerInfo) {
        status = 0
        slide.camera.attachControl(slide.canvas, true); 
    }
    function onpointerdrag(pointerInfo) {
        
        let x = pointerInfo.event.offsetX
        let y = pointerInfo.event.offsetY
        let dx = x-oldx
        let dy = y-oldy
        oldx = x
        oldy = y
        if(status==1) {
            slide.model.w0 = Math.max(-5, Math.min(5, slide.model.w0 + dy*0.03))
            slide.model.update()
        }
        else if(status == 2) {
            rotate(dx,dy)
/*
            const RotX = BABYLON.Matrix.RotationX
            const RotZ = BABYLON.Matrix.RotationZ
           
            slide.model.matrix = 
                slide.model.matrix
                .multiply(RotZ(dx*0.01))
                .multiply(RotX(dy*0.01))                
            slide.model.update()
*/

        }
    }

}

function rotate(dx,dy) {

    let theta = dx*0.01
    let csTheta = Math.cos(theta)
    let snTheta = Math.sin(theta)

    let arr = [
        csTheta,0,0,-snTheta,
        0,1,0,0,
        0,0,1,0,
        snTheta,0,0,csTheta
        ]
    let matrix = BABYLON.Matrix.FromArray(arr)

    theta = dy*0.01
    csTheta = Math.cos(theta)
    snTheta = Math.sin(theta)
    arr = [
        1,0,0,0,
        0,csTheta,0,-snTheta,
        0,0,1,0,
        0,snTheta,0,csTheta
        ]
    matrix = matrix.multiply(BABYLON.Matrix.FromArray(arr)) 


    slide.model.matrix = slide.model.matrix.multiply(matrix)
    slide.model.update()

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

class PolychoronSectionModel extends GeometricModel {
    constructor(name, data, scene) {
        super(name,scene)
        this.data = data
        this.matrix = BABYLON.Matrix.Identity()
        this.w0 = -4.88

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


        this.update()
    }
    update() {
        const me = this
        const mat = this.matrix
        
        const Transform = BABYLON.Vector4.Transform
        const pts4 = this.data.vertices.map(p=>Transform(mat,p).scale(5))
        let w0 = this.adjustw(this.w0, pts4)
        
        // compute edge points : intersections along edges. edgePoints = [(a,b,p),...]
        let edgePoints = this.computeEdgeIntersections(w0, pts4)

        // add vertices 

        me.beginUpdate()

        // pts = new points; tb[edgeId] => point index
        const pts = []
        const tb = {}
        const m = pts4.length
        edgePoints.forEach(([a,b,p])=> { 
            // const j = me.addVertex(p,0.003)
            const j = pts.length
            tb[a*m+b] = tb[b*m+a] = j
            pts.push(p)
        })

        // add edges
        // faceTable[faceIndex] => [a,b]; a,b indices of new points
        const faceTable = {}
        this.data.faces.forEach((f,faceIndex) => {
            let a = f[f.length-1]
            const js = []
            f.forEach(b => {
                if((pts4[a].w-w0)*(pts4[b].w-w0)<0) {
                    js.push(tb[a*m+b])
                }
                a = b
            })
            if(js.length >= 2) {
                // me.addEdge(pts[js[0]], pts[js[1]], 0.003)
                faceTable[faceIndex] = [js[0], js[1]]
            }
        })

        // add faces
        this.data.cells.forEach(cellFaces => {
            const links = {}
            let v
            cellFaces.forEach(faceIndex => {
                let ab = faceTable[faceIndex]
                if(ab !== undefined) {
                    const [a,b] = ab
                    if(links[a]===undefined) links[a]=[b]; else links[a].push(b)
                    if(links[b]===undefined) links[b]=[a]; else links[b].push(a)
                    v = a
                }
            })
            if(v !== undefined) {
                const v0 = v
                const facePts = [pts[v]]
                let v1 = links[v][0]
                while(v1 !=v0) {
                    facePts.push(pts[v1])
                    let v2 = links[v1][0]==v ? links[v1][1] : links[v1][0]
                    v=v1; v1=v2
                }
                if(facePts.length>=3) 
                    me.addFace(facePts)
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
