
class PolyhedronData {
    constructor() {}
    computeEdges() {
        const n = this.vertices.length
        const tb={}
        this.edges = []
        this.faces.forEach(f=>{
            let b = f[f.length-1]
            f.forEach(a=>{
                const id = a*n+b
                if(tb[id]===undefined) {
                    tb[id] = 1
                    tb[b*n+a] = -1
                    this.edges.push([a,b])
                } else {
                    if(tb[id] != -1) throw "Bad face orientation"
                }
                b=a
            })
        })        
    }

    getFaceMatrix(faceIndex, scaleFactor) {
        scaleFactor = scaleFactor || 1.0
        const vertices = this.vertices
        const pts = this.faces[faceIndex].map(i=>vertices[i])
        const fc = pts.reduce((a,b)=>a.add(b)).scale(1.0/pts.length)
        const e0 = pts[0].subtract(fc).normalize()
        let e1 = fc.subtract(e0.scale(BABYLON.Vector3.Dot(e0,fc))).normalize()
        let e2 = BABYLON.Vector3.Cross(e0,e1)
        return BABYLON.Matrix.FromValues(
            e0.x,e0.y,e0.z,0,
            e1.x,e1.y,e1.z,0,
            e2.x,e2.y,e2.z,0,
            fc.x*scaleFactor,fc.y*scaleFactor,fc.z*scaleFactor,1)
    }
}

PolyhedronData.p4 = (() => {
    let ph = new PolyhedronData()
    ph.vertices = [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>new BABYLON.Vector3(...v))
    ph.faces = [[0,1,2],[0,2,3],[0,3,1],[3,2,1]]
    ph.computeEdges()
    return ph
})()

PolyhedronData.p6 = (() => {
    let ph = new PolyhedronData()
    ph.vertices = [
        [-1,-1,-1],[ 1,-1,-1],[-1, 1,-1],[ 1, 1,-1],
        [-1,-1, 1],[ 1,-1, 1],[-1, 1, 1],[ 1, 1, 1]]
        .map(v=>new BABYLON.Vector3(...v))
    ph.faces = [[0,1,3,2],[1,0,4,5],[3,1,5,7],[2,3,7,6],[0,2,6,4],[4,6,7,5]]
    ph.computeEdges()
    return ph
})()

PolyhedronData.p8 = (() => {
    let ph = new PolyhedronData()
    ph.vertices = [
        [0,1,0],[-1,0,0],[0,0,-1],[1,0,0],[0,0,1],[0,-1,0]]
        .map(v=>new BABYLON.Vector3(...v))
    ph.faces = [[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]]
    ph.computeEdges()
    return ph
})()

PolyhedronData.p12 = (() => {
    let ph = new PolyhedronData()
    const f = (-1+Math.sqrt(5))/2
    const g = 1/f
    ph.vertices = [
        [-1,1,-1],[1,1,-1],[-1,1,1],[1,1,1],
        [-1,-1,-1],[1,-1,-1],[-1,-1,1],[1,-1,1],
        [0,g,-f],[0,g,f],[-g,f,0],[-g,-f,0],[g,f,0],[g,-f,0],
        [-f,0,-g],[f,0,-g],[-f,0,g],[f,0,g],
        [0,-g,-f],[0,-g,f]]
        .map(v=>new BABYLON.Vector3(...v))
    ph.faces = [
        [0,8,9,2,10],[1,12,3,9,8],[9,3,17,16,2],[8,0,14,15,1],
        [0,10,11,4,14], [11,10,2,16,6],[3,12,13,7,17],[12,1,15,5,13],
        [16,17,7,19,6], [4,18,5,15,14], [4,11,6,19,18],[5,18,19,7,13]
    ]
    ph.computeEdges()    
    return ph
})()

PolyhedronData.p20 = (() => {
    let ph = new PolyhedronData()
    const f = (-1+Math.sqrt(5))/2
    ph.vertices = [
        [0,1,f],[0,1,-f],[0,-1,f],[0,-1,-f],
        [-1,f,0],[-1,-f,0],[1,f,0],[1,-f,0],
        [-f,0,1],[f,0,1],[-f,0,-1],[f,0,-1]]
        .map(v=>new BABYLON.Vector3(...v))
    ph.faces = [
        [0,9,8],[0,6,9],[0,1,6],[0,4,1],[0,8,4],
        [1,11,6],[1,10,11],[1,4,10], [4,5,10],[4,8,5],
        [6,7,9],[6,11,7],[5,2,3],[2,7,3],[2,8,9],
        [2,5,8],[2,9,7],[3,11,10],[3,10,5],[3,7,11]
    ]
    ph.computeEdges()    
    return ph
})()

PolyhedronData.pg20 = (() => {
    let ph = new PolyhedronData()
    const f = (-1+Math.sqrt(5))/2
    ph.vertices = [
        [0,1,f],[0,1,-f],[0,-1,f],[0,-1,-f],
        [-1,f,0],[-1,-f,0],[1,f,0],[1,-f,0],
        [-f,0,1],[f,0,1],[-f,0,-1],[f,0,-1]]
        .map(v=>new BABYLON.Vector3(...v))
    
    ph.faces = [[0,10,2],[0,2,11],[0,5,7],[0,11,5],[0,7,10],[1,3,8],[1,9,3],[1,7,5],[1,5,9],[1,8,7],[2,6,4],[2,4,11],[2,10,6],[3,4,6],[3,9,4],[3,6,8],[4,9,11],[5,11,9],[6,10,8],[7,8,10]]
    ph.computeEdges()    
    return ph
})()

function foobar() {
    let ico = PolyhedronData.p20 
    let pts = ico.vertices
    const Dist = BABYLON.Vector3.Distance
    const check = (pa,pb) => Math.abs(Dist(pa,pb)-2)<1.e-8
    const faces = []
    for(let i1=0;i1<12;i1++) {
        for(let i2=i1+1;i2<12;i2++) {
            if(!check(pts[i1],pts[i2])) continue
            for(let i3=i2+1;i3<12;i3++) {
                if(!check(pts[i1],pts[i3])) continue
                if(!check(pts[i2],pts[i3])) continue
                let p1 = pts[i1]
                let p2 = pts[i2]
                let p3 = pts[i3]
                let q = BABYLON.Vector3.Cross(
                    p2.subtract(p1),p3.subtract(p1))
                let center = p1.add(p2).add(p3).scale(1/3)
                if(BABYLON.Vector3.Dot(center, q)<0) {
                    faces.push([i1,i3,i2])
                } else {
                    faces.push([i1,i2,i3])
                }            
            }
        }
    }

    return faces
}