"use strict";

const slide = {
    name:"120 Cells",
    shaderName : '4D',
    theta : 0.0
}

function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)

    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 3, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 1
    
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    slide.model = new PolychoronBubbleModel(PolychoronData.p8)
    // showWorldAxis(5, slide.scene)

    slide.stepManager = new StepManager()
    slide.stepManager.setStep(0)
    
    scene.registerBeforeRender(tick)
    handlePointer()
    scene.onKeyboardObservable.add(onKeyEvent);
    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", onResize)
}

function cleanup() {
    window.removeEventListener("resize", onResize)
    if(slide.engine) {
        slide.engine.stopRenderLoop()
        slide.scene.dispose()
        slide.engine.dispose()
        delete slide.scene
        delete slide.engine
    }
}

function onResize() {
    slide.engine.resize()
}



let stop = true

function tick() {
    return
    const theta = performance.now() * 0.0001;
    const cs = Math.cos(theta);
    const sn = Math.sin(theta);
    slide.model.mesh.material.setMatrix('rot4', BABYLON.Matrix.FromArray([
    /*
        cs,0,0,-sn,
        0,1,0,0,
        0,0,1,0,
        sn,0,0,cs
        */
       /*
        1,0,0,0,
        0,1,0,0,
        0,0,cs,-sn,
        0,0,sn,cs
        */
       cs,0,0,-sn,
       0,1,0,0,
       0,0,1,0,
       sn,0,0,cs
   ]))
    
   slide.model.mesh.material.setVector3("cameraPosition", slide.camera.position);
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
            let theta = slide.theta = slide.theta + dy*0.01
            if(Math.abs(theta) < 0.1) theta = 0;
            let csTheta = Math.cos(theta)
            let snTheta = Math.sin(theta)
            const arr = [
                1,0,0,0,
                0,csTheta,0,-snTheta,
                0,0,1,0,
                0,snTheta,0,csTheta
                ]
            
            // let matrix = slide.model.matrix.multiply(BABYLON.Matrix.FromArray(arr))
            let matrix = BABYLON.Matrix.FromArray(arr);
            slide.model.set4DRotationMatrix(matrix)
        }
        else if(status == 2) {
        }
    }

}



function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            // console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(kbInfo.event.key == "s") slide.stepManager.next();
            else if(kbInfo.event.key == "a") slide.stepManager.prev();
    }
}
 

// ==================================================================

let uffa = {}

/*
v0 v1 


V 
*/


class PolychoronStructure {
    constructor(data) {
        this.rotateData(data)
        this.data = data
        this.computeCellCenters()
        this.computeFaceCenters()
        this.computeCellLinks()
        this.computeCellInnerLinks()


        let rings = this.rings = []
        rings.push(this.getRing(98,1))
        
        rings.push(this.getRing(101,4))
        rings.push(this.getRing(51,11))
        rings.push(this.getRing(50,4))
        rings.push(this.getRing(100,11))
        rings.push(this.getRing(91,6))

        rings.push(this.getRing(13,5))
    }

    rotateData(data) {
        const phi = Math.PI - Math.atan(2)
        const cs = Math.cos(phi), sn = Math.sin(phi)
        data.vertices.forEach(p=> {
            let x = p.x, z = p.z
            p.x = cs * x - sn * z
            p.z = sn * x + cs * z

        })

    }
    computeCellCenters() {
        const data = this.data
        const vertices = data.vertices
        const faces = data.faces
        const cells = data.cells
        const cellCenters = this.cellCenters = []    
        cells.forEach((cell, cellIndex) => {
            let m = 0
            const p = new BABYLON.Vector4(0,0,0,0)
            cell.forEach(faceIndex => {
                faces[faceIndex].forEach(i=>{
                    p.addInPlace(vertices[i])
                    m++
                })
            })
            p.scaleInPlace(1/m)
            cellCenters.push(p)
        })
    }
    computeFaceCenters() {
        const data = this.data
        const vertices = data.vertices
        const faces = data.faces
        const faceCenters = this.faceCenters = []    
        faces.forEach(face => {
            let m = 0
            const p = new BABYLON.Vector4(0,0,0,0)
            face.forEach(i => {
                p.addInPlace(vertices[i])
                m++
            })
            p.scaleInPlace(1/m)
            faceCenters.push(p)
        })
    }
    computeCellLinks() {

        const data = this.data
        const cellLinks = this.cellLinks = []
        const facesTable = {}
        this.data.cells.forEach((cell, cellIndex) => {
            const cellLink = {}
            cellLinks.push(cellLink)
            cellLink.faces = []
            cell.forEach((faceIndex,i) => {
                cellLink.faces.push({})
                let lst = facesTable[faceIndex]
                if(lst === undefined)  
                    lst = facesTable[faceIndex] = []
                lst.push({c:cellIndex, f:i})
            })
        })
        for(let faceIndex in facesTable) {
            let lst = facesTable[faceIndex]
            if(lst.length != 2) throw "uh oh"
            let [c1,c2] = lst
            cellLinks[c1.c].faces[c1.f] = c2
            cellLinks[c2.c].faces[c2.f] = c1
                       
        }
        // face link = 


        
    }

    computeCellInnerLinks() {
        const faceCenters = this.faceCenters
        const data = this.data
        const innerLinks = this.cellInnerLinks = []
        this.data.cells.forEach((cell, cellIndex) => {
            const pts = cell.map(faceIndex => faceCenters[faceIndex])
            const innerLink = {}
            innerLinks.push(innerLink)
            innerLink.faces = []
            cell.forEach((fi, i) => {
                let moreDistant = -1
                let maxDist = 0
                pts.forEach((p,j) => {
                    let dist = BABYLON.Vector4.Distance(pts[i], pts[j])
                    if(dist>maxDist) { maxDist = dist; moreDistant = j}
                })
                innerLink.faces.push(moreDistant)                
            })
        })
    }

    getRing(cellIndex, faceIndexInCell) {
        let c = cellIndex
        let f = faceIndexInCell
        let cells = []
        for(let i=0; i<10; i++) {
            cells.push(c)
            const other = this.cellLinks[c].faces[f]
            c = other.c
            f = this.cellInnerLinks[c].faces[other.f]            
        }
        return cells
    }

    getAdjacentCells(...cells) {
        const links = this.cellLinks
        let qs = cells.map(cell=>links[cell].faces.map(link=>link.c))
        let q = qs.shift()
        return q.filter(cell => qs.every(q2=>q2.indexOf(cell)>=0))
    }

    getCommonFace(c1,c2) {
        const f1 = this.data.cells[c1]
        const f2 = this.data.cells[c2]
        const f = f1.filter(i=>f2.indexOf(i)>=0)
        if(f.length>1) throw "Uh oh"
        if(f.length==0) return null
        else return f[0]
    }
}

// ==================================================================

class StepManager {
    constructor() {
        this.step = -1
    }
    next() { this.setStep(this.step+1) }
    prev() { this.setStep(this.step-1) }
    
    setStep(index) {
        const steps = [
            [1,1],[1,2],[1,10],
            [2,1],[2,2],[2,10],
            [3,1],[3,2],[3,10],
            [4,1], [4,10],
            [5,1], [5,10],
            [6,1], [6,10],
            [7,1], [7,2], [7,3], [7,4], [7,5], [7,10],
            
            
        ]

        index = Math.max(0,Math.min(steps.length-1,index))
        if(this.step == index) return
        const oldStep = this.step
        this.step = index

        const md = slide.model
        const pcs = md.pcs


        for(let i=0;i<120;i++) md.showCell(i,0)
        const [m,k] = steps[this.step]
        for(let i=0; i<m-1; i++) this.showRing(i,0,10,i+1,false)        
        if(k==10 && oldStep == this.step-1) {
            this.showRing(m-1,0,steps[oldStep][1]+1,m, true)
            this.completeRing(m-1,steps[oldStep][1],m)
        } else {
            this.showRing(m-1,0,k,m,true)   
        }
    }

    showRing(ringIndex, start, end, colorIndex, commit=true) {
        const ring = slide.model.pcs.rings[ringIndex]
        const cells = []
        for(let i=start; i<end; i++) cells.push(ring[i])
        slide.model.showCells(cells, colorIndex, commit)

    }

    completeRing(ringIndex, start, colorIndex) {
        let i = start
        const ring = slide.model.pcs.rings[ringIndex]
        let intervalId = setInterval(() => {
            i++
            console.log("beep", i)
            if(i>=10) {
                clearInterval(intervalId)
            } else {
                slide.model.showCells([ring[i]],colorIndex)
            }
        }, 50)
    }
}

// ==================================================================

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
    slide.model.set4DRotationMatrix(slide.model.matrix)
    // slide.model.update()

}

// ==================================================================

class PolychoronBubbleModel {
    constructor() {
        this._createPalette()
        this.pcs = new PolychoronStructure(PolychoronData.p120)
        this.mesh = this.createFaceMesh(5)
        this.mesh.isVisible = false

        let material = this.material = this.createShaderMaterial()
        this.mesh.material = material

        this.createVertexBuffers(this.pcs.data.faces.length)
        this.instances = []
        //  this.mesh.rotation.x=Math.PI/2

        
        this.status = {
            cells: this.pcs.data.cells.map(f=>0), // 0=invisibile; >0=color index
            faces: this.pcs.data.faces.map(f=>[]) // active cells
        }


    }

    _createPalette() {
        this.palette = []
        for(let i = 0; i<8; i++) {
            let rgb = HSVtoRGB(i/8,0.6,1)
            this.palette.push(rgb)
        }
    }

    createFaceMesh(m) {
        const scene = slide.scene
        let n = 20
        let mesh = new BABYLON.Mesh("custom", scene);
        let positions = []
        let indices = []

        const pts = []
        // centro
        pts.push(new BABYLON.Vector3(0,0,0))

        // m raggi da n punti
        for(let i=0; i<m; i++) {
            let phi = Math.PI*2*i/m
            let cs = Math.cos(phi)
            let sn = Math.sin(phi)
            for(let j=1; j<=n; j++) {
                let t = j/n
                pts.push(new BABYLON.Vector3(t*cs,0,t*sn))
            }
        }

        // aggiungo i punti restanti e faccio le facce
        for(let i=0; i<m; i++) {
            let i1 = (i+1)%m
            let ks = [[0]]
            for(let j=1; j<=n; j++) {
                let a = i*n+j, b = i1*n+j
                const ksr = [a]
                let pa = pts[a], pb = pts[b]
                for(let s=1; s<j; s++) {
                    ksr.push(pts.length)
                    pts.push(BABYLON.Vector3.Lerp(pa,pb,s/j))                    
                }
                ksr.push(b)
                ks.push(ksr)
            }
            // facce in giù
            
            for(let j=0; j<n; j++) {
                for(let s=0; s<=j; s++) {
                    indices.push(ks[j][s],ks[j+1][s],ks[j+1][s+1])
                }
            }

            // facce in su
            for(let j=1; j<n; j++) {
                for(let s=0; s<j; s++) {
                    indices.push(ks[j][s],ks[j+1][s+1],ks[j][s+1])
                }
            }
            
        }

        pts.forEach(p=>positions.push(p.x,p.y,p.z))
        let vertexData = new BABYLON.VertexData();
        vertexData.positions = positions
        vertexData.indices = indices

        vertexData.applyToMesh(mesh)
        return mesh
    }

    
/*
        // create instances
        this.faces = [mesh]
        let data = PolychoronData.p120
        m = data.faces.length
        for(let i=1; i<m; i++) {
            let inst = mesh.createInstance("uff-"+i)
            this.faces.push(inst)
        }
*/
    createVertexBuffers(m) {        

        const originArray = this.originArray = new Float32Array(m*4)
        const e0Array = this.e0Array = new Float32Array(m*4)
        const e1Array = this.e1Array = new Float32Array(m*4)
        const colorArray = this.colorArray = new Float32Array(m*3)

        const engine = slide.engine
        const mesh = this.mesh
        let buffer = new BABYLON.Buffer(engine, originArray , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("origin", 0, 4))
        buffer = new BABYLON.Buffer(engine, e0Array , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("e0", 0, 4))
        buffer = new BABYLON.Buffer(engine, e1Array , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("e1", 0, 4))
        buffer = new BABYLON.Buffer(engine, colorArray , true, 3, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("color", 0, 3))

    }

    visualizeFaces() {

        const faces = []
        let status = this.status
        status.faces.forEach((cells,i) => {
            let colors = cells.map(c=>status.cells[c])
            if(colors.length == 1) faces.push({f:i, c:colors[0]})
            else if(cells.length == 2) faces.push({f:i, c:Math.min(colors[0], colors[1])})
        })

        // create instances (if needed)
        const mesh = this.mesh
        let m = faces.length
        if(m>this.instances.length) {
            while(m>this.instances.length) {
                let i = this.instances.length
                this.instances.push(mesh.createInstance('inst-'+i))
            }
        } else if(m<this.instances.length) {
            for(let i = this.instances.length-1;i>=m;i--) {
                this.instances[i].dispose()
            }
            this.instances.splice(m, this.instances.length-m)
        }

        // assign values
        function assign(array, i, p) { 
            array[4*i]=p.x
            array[4*i+1]=p.y 
            array[4*i+2]=p.z
            array[4*i+3]=p.w
        }
        function assign3(array, i, c) { 
            array[3*i]=c[0]
            array[3*i+1]=c[1]
            array[3*i+2]=c[2]
        }

        const data = this.pcs.data
        const originArray = this.originArray
        const e0Array = this.e0Array
        const e1Array = this.e1Array
        const colorArray = this.colorArray
        
        faces.forEach((face,i) => {
            const faceIndex = face.f
            const colorIndex = face.c

            const f = data.faces[faceIndex]
            let pts = f.map(j=>data.vertices[j])
            let center = new BABYLON.Vector4(0,0,0,0);
            pts.forEach(p=>{center.addInPlace(p)})
            center.scaleInPlace(1/f.length)

            let e0 = pts[0].subtract(center)
            let r = e0.length()
            e0.scaleInPlace(1/r)
            let e1 = pts[1].subtract(center)
            let d = e1.x*e0.x+e1.y*e0.y+e1.z*e0.z+e1.w*e0.w
            e1 = e1.subtract(e0.scale(d)).normalize()

            assign(originArray,i,center)
            assign(e0Array,i,e0.scale(r))
            assign(e1Array,i,e1.scale(r)) 
            assign3(colorArray, i, this.palette[colorIndex])     
        })



        const engine = slide.engine
        let buffer = new BABYLON.Buffer(engine, originArray , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("origin", 0, 4))
        buffer = new BABYLON.Buffer(engine, e0Array , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("e0", 0, 4))
        buffer = new BABYLON.Buffer(engine, e1Array , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("e1", 0, 4))
        buffer = new BABYLON.Buffer(engine, colorArray , true, 3, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("color", 0, 3))
    }



    createShaderMaterial() {
        const scene = slide.scene
        const shaderName = slide.shaderName
        var mat = new BABYLON.ShaderMaterial("bubbleMaterial", scene, {
                vertex: shaderName,
                fragment: shaderName,
            },
            {
                attributes: [
                    "position", "origin","e0","e1" 
                ],
                uniforms: [
                    "world", "worldView", 
                    "worldViewProjection", 
                    "view", "projection",
                    "cameraPosition",
                    "rot4"
                ]
            });
        mat.backFaceCulling = false
        // mat.alpha = 0.2
        
        this.matrix = BABYLON.Matrix.Identity()
        this.mat4d = mat

        mat.setMatrix('rot4', BABYLON.Matrix.Identity())

        return mat
    }

    set4DRotationMatrix(matrix) {
        this.matrix = matrix
        this.mat4d.setMatrix('rot4', matrix)

    }
    

    showCell(i, colorIndex) {
        const v = this.status
        if(v.cells[i] == colorIndex) return
        v.cells[i] = colorIndex

        if(colorIndex > 0) {
            this.pcs.data.cells[i].forEach(faceIndex => {
                const lst = v.faces[faceIndex]                
                if(lst.indexOf(i)<0) lst.push(i)
            })    
        } else {
            this.pcs.data.cells[i].forEach(faceIndex => {
                const lst = v.faces[faceIndex]  
                const j = lst.indexOf(i) 
                if(j>=0) lst.splice(j,1)             
            })    
        }
        // this.visualizeFaces()
        /*
        const facesToShow = []
        v.faces.forEach((refCount, i) => {
            if(refCount>0) facesToShow.push(i)
        })
        this.showFaces(facesToShow)
        */
    }

    hideCells() {
        for(let i=0;i<this.status.cells.length;i++) this.showCell(i,0)
        this.visualizeFaces()    
    }
    showCells(cells, colorIndex, commit = true) {
        cells.forEach(cell=>this.showCell(cell, colorIndex))
        if(commit) this.visualizeFaces()
    }

    showRing(cellIndex, faceIndexInCell, colorIndex, commit = true) {
        let ring = this.pcs.getRing(cellIndex, faceIndexInCell)
        this.showCells(ring, colorIndex, commit)
    }
}




(()=>{
    const shaderName = '4D'

    // ---------------------------------------------------------
    BABYLON.Effect.ShadersStore[shaderName + "VertexShader"]= `
    precision highp float;

    // Attributes
    attribute vec3 position, color;
    attribute vec4 origin, e0, e1;

    // Uniforms
    uniform mat4 worldViewProjection, world, worldView;
    uniform mat4 rot4;

    varying vec3 v_norm;
    varying vec3 v_pos;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    varying vec3 v_color;
    varying float err;
    

    #define PI 3.1415926535897932384626433832795

    vec3 fun(float u, float v) {   
        vec4 pos = rot4 * (origin + u * e0 + v * e1);
        pos = normalize(pos);
        float k = 0.5 / (1.0 - pos.w);
        return vec3(pos.x * k, pos.y * k, pos.z * k);
    }

    void main(void) {
        v_color = color;
        vec2 uv = vec2(position.x, position.z);

        vec3 p = fun(uv.x, uv.y);
        float epsilon = 0.001;
        vec3 dpdu = fun(uv.x+epsilon, uv.y) - fun(uv.x-epsilon, uv.y);
        vec3 dpdv = fun(uv.x, uv.y+epsilon) - fun(uv.x, uv.y-epsilon) ;
        vec3 norm = normalize(cross(dpdu, dpdv));
        v_pos = p;
        if(p.x*p.x+p.y*p.y+p.z*p.z>100.0) err = 1.0;

        gl_Position = worldViewProjection * vec4(p, 1.0);
        // v_norm = (worldView * vec4(norm, 0.0)).xyz;
        v_norm = norm;

        /*
        vUV = vec2(position.x, position.z);
        //if(p.x*p.x+p.y*p.y+p.z*p.z>100.0) err = 1.0;
        //else err = 0.0;
        */

        v_surfaceToLight = vec3(0.0,10.0,0.0) - (world * vec4(p,1.0)).xyz;
        v_surfaceToView = (vec4(0.0,0.0,0.0,1.0) - (world * vec4(p,1.0))).xyz; // u_viewInverse[3] 
    }
`

/*
BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"]= `
    precision highp float;

    varying vec3 v_norm;
    varying vec3 v_pos;    
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;

    vec4 lit(float l ,float h, float m) {
        return vec4(1.0,
                    abs(l),//max(l, 0.0),
                    (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
                    1.0);
    }

    void main(void) {
        vec3 norm = normalize(v_norm);
        vec3 surfaceToLight = normalize(v_surfaceToLight);
        vec3 surfaceToView = normalize(v_surfaceToView);
        vec3 halfVector = normalize(surfaceToLight + surfaceToView);
        
        if(dot(surfaceToView, norm)<0.0) {  norm = -norm; }
        float cs = dot(norm, surfaceToLight);
        vec4 litR = lit(cs,dot(norm, halfVector), 12.0);

        vec3 v_color = vec3(0.1,0.5,0.7);
        vec3 color = v_color * litR.y + vec3(0.2,0.8,0.2) * litR.z;
        
        
        gl_FragColor = vec4(litR.y,0.0,0.0,1.0); 
        // texture2D(textureSampler, vUV);      
    }
` 

*/
BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"]= `
    precision highp float;

    varying vec3 v_norm;
    varying vec3 v_pos;    
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    uniform vec3 cameraPosition;
    uniform mat4 world;
    varying vec3 v_color;
    varying float err;

    void main(void) {
        if(err>0.0) discard;

        vec3 vLightPosition = cameraPosition + vec3(0.0,1.0,0.0); // vec3(0, 20, 10);

        vec3 vPositionW = vec3(world * vec4(v_pos, 1.0));
        vec3 vNormalW = normalize(vec3(world * vec4(v_norm, 0.0)));
        vec3 viewDirectionW = normalize(cameraPosition - vPositionW);

        if(dot(viewDirectionW, vNormalW)<0.0) {  vNormalW = -vNormalW; }


        vec3 lightVectorW = normalize(vLightPosition - vPositionW);
        vec3 color = v_color; // vec3(0.1,0.5,0.7); // texture2D(textureSampler, vUV).rgb;
    
        // diffuse
        float ndl = max(0., dot(vNormalW, lightVectorW));

        // Specular
        vec3 angleW = normalize(viewDirectionW + lightVectorW);
        float specComp = max(0., dot(vNormalW, angleW));
        specComp = pow(specComp, 120.0) * 0.3;

        gl_FragColor = vec4(color * ndl + vec3(specComp), 1.); 
    }
` 
// ---------------------------------------------------------



})()




