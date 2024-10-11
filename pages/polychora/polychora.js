const slide = {
    name: "Polychora",
    
    focus : 3,
    scaleFactor : 6,
    e0 : 0

}

function setup() {

    let canvas = slide.canvas = document.getElementById("renderCanvas")
    let engine = slide.engine = new BABYLON.Engine(canvas, true)
    let scene = slide.scene = new BABYLON.Scene(engine)


    let camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        1.8,1.15, 6, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    let light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    let light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene(scene)
    
    scene.registerBeforeRender(tick)
    handlePointer()
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
    slide.matrix = BABYLON.Matrix.Identity()

    const th = -Math.asin(1/slide.focus)
    const r = Math.cos(th) * slide.scaleFactor / (slide.focus + Math.sin(th))
    const sphere = slide.sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {
        diameter:r*2}, 
        scene)
    sphere.material = new BABYLON.StandardMaterial('sphere-mat', scene)
    sphere.material.diffuseColor.set(0.8,0.7,0.9)
    sphere.material.specularColor.set(1,1,1)
    sphere.material.alpha = 0.2
    sphere.material.specularPower = 120
    
    slide.model = new PolychoronModel('tesseract', PolychoronData.p8, scene)
    slide.model.update()

    // showWorldAxis(5,scene)
}

function tick() {
    // sphere.position.x = Math.cos(performance.now()*0.001) * 2
    slide.model.update()
}

function project(p) {
    const mat = slide.matrix.m

    let x1 = p.x * mat[ 0] + p.y * mat[ 1] + p.z * mat[ 2] + p.w * mat[ 3]
    let x2 = p.x * mat[ 4] + p.y * mat[ 5] + p.z * mat[ 6] + p.w * mat[ 7]
    let x3 = p.x * mat[ 8] + p.y * mat[ 9] + p.z * mat[10] + p.w * mat[11]
    let x4 = p.x * mat[12] + p.y * mat[13] + p.z * mat[14] + p.w * mat[15]
    let k = slide.scaleFactor/(x4+slide.focus)
    return new BABYLON.Vector3(x1*k,x2*k,x3*k)
}



function placeCylinder(cylinder, vStart, vEnd) {
    const distance = BABYLON.Vector3.Distance(vStart,vEnd )
    BABYLON.Vector3.LerpToRef(vStart,vEnd,0.5,cylinder.position)       
    cylinder.scaling.set(1,distance,1)

    const delta = vEnd.subtract(vStart).scale(1.0/distance)
    const up = new BABYLON.Vector3(0, 1, 0)
    let angle = Math.acos(BABYLON.Vector3.Dot(delta, up));
    let quaternion
    const eps = 0.00001;
    const absAngle = Math.abs(angle);
    if(eps < absAngle && absAngle < Math.PI - eps) {
        const axis = BABYLON.Vector3.Cross( up, delta).normalize()
        quaternion = BABYLON.Quaternion.RotationAxis(axis, angle);    
    } else quaternion = BABYLON.Quaternion.Identity()
    cylinder.rotationQuaternion = quaternion
}

class PolychoronModel {
    constructor(name, data, scene) {
        this.data = data
        const scaleFactor = 1.0/data.vertices[0].length()
        this.pts = data.vertices.map(p=>p.scale(scaleFactor))

        this.preprocess()

        this.vFlags = this.pts.map(p=>false)
        const pivot = this.pivot = new BABYLON.Mesh(name, scene)

        let dot = BABYLON.MeshBuilder.CreateSphere(name+'-dot', {diameter:0.1}, scene)
        dot.parent = pivot
        let mat = dot.material = new BABYLON.StandardMaterial(name+'dot-mat', scene)
        mat.diffuseColor.set(0.6,0.1,0.7)
        this.vertices = [dot]
        for(let i = 1; i<data.vertices.length; i++) { 
            let inst = dot.createInstance(name+'-dot-inst-'+i)
            this.vertices.push(inst)
        }
        
        let edge = BABYLON.MeshBuilder.CreateCylinder(name+'-edge', {diameter:0.05, height:1}, scene)
        edge.parent = pivot
        mat = edge.material = new BABYLON.StandardMaterial(name+'edge-mat', scene)
        mat.diffuseColor.set(0.6,0.6,0.6)
        this.edges = [edge]
        for(let i = 1; i<data.edges.length; i++) { 
            let inst = edge.createInstance(name+'-edge-inst-'+i)
            this.edges.push(inst)
        }

        let bigEdge = this.bigEdge = BABYLON.MeshBuilder.CreateCylinder(name+'-edge', {diameter:0.06, height:1}, scene)
        bigEdge.parent = pivot
        mat = bigEdge.material = new BABYLON.StandardMaterial(name+'bigedge-mat', scene)
        mat.diffuseColor.set(0.8,0.1,0.1)
        bigEdge.isVisible = false
        this.bigEdges = []

        

    }

    preprocess() {
        if(this.data.cells.length != 120) return
        let theta = Math.PI/2 + Math.atan(2)

        let cs = Math.cos(theta)
        let sn = Math.sin(theta)
        this.pts.forEach(p=>{
            let a = p.y, b = p.z
            p.y = a*cs - b*sn
            p.z = a*sn + b*cs
        })
    }

    update() {
        this.pts.forEach((p,i)=>{
            let q = project(p)
            this.vertices[i].position.copyFrom(q)
        })

        const vFlags = this.vFlags
        

        this.data.edges.forEach(([a,b],i)=>{
            let pa = this.vertices[a].position
            let pb = this.vertices[b].position
            placeCylinder(this.edges[i], pa,pb)
        })

        this.bigEdges.forEach(edge => {
            let pa = this.vertices[edge.a].position
            let pb = this.vertices[edge.b].position
            placeCylinder(edge, pa,pb)
        })
    }

    selectCell(cellIndex) {
        const vFlags = this.vFlags
        for(let i=0; i<vFlags.length; i++) vFlags[i]=0
        const faces = this.data.faces
        this.data.cells[cellIndex].forEach(faceIndex => {
            faces[faceIndex].forEach(j=>vFlags[j]=true)
        })
        this.bigEdges.forEach(edge=>edge.dispose())
        const bigEdges = this.bigEdges = []
        const pivot = this.pivot
        const bigEdge = this.bigEdge
        const vertices = this.vertices
        this.data.edges.forEach(([a,b],i)=>{
            if(vFlags[a] && vFlags[b]) {
                let inst = bigEdge.createInstance('big-edge-inst')
                inst.parent = pivot
                inst.a = a
                inst.b = b
                let pa = vertices[a].position
                let pb = vertices[b].position
                placeCylinder(inst, pa,pb)
                bigEdges.push(inst)  
            }
        })
    }

    unselectCells() {
        const vFlags = this.vFlags
        for(let i=0; i<vFlags.length; i++) vFlags[i]=0
        this.bigEdges.forEach(edge=>edge.dispose())
        const bigEdges = this.bigEdges = []
    }
}




function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            const key = kbInfo.event.key
            const keyCode = kbInfo.event.keyCode

            if(49<=keyCode && keyCode<=49+6) {
                slide.model.pivot.dispose()
                let data
                switch(keyCode)
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
                slide.matrix = BABYLON.Matrix.Identity()  
                slide.camera.beta = 1.15
                slide.camera.alpha = 1.8            
            } else if(key == "c") {
                if(slide.model.bigEdges.length == 0)    
                    slide.model.selectCell(0)
                else
                slide.model.unselectCells()
            } 
            else if(key == 'x') { slide.e0 = 0 }
            else if(key == 'y') { slide.e0 = 1 }
            else if(key == 'z') { slide.e0 = 2 }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            break;
    }
}

function getRotation(e1,e2,theta) {
    const cs = Math.cos(theta)
    const sn = Math.sin(theta)
    const matrix = new BABYLON.Matrix()
    for(let i=0;i<4;i++) {
        for(let j=0;j<4;j++) {
            let v
            if(i==e1 && j==e1 || i==e2 && j==e2) v = cs
            else if(i==e1 && j==e2) v = sn
            else if(i==e2 && j==e1) v = -sn
            else v = (i==j) ? 1 : 0
            matrix.m[i*4+j] = v
        }
    }
    return matrix

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

        let matrix
        matrix = getRotation(slide.e0,3,dx*0.01)
        slide.matrix = slide.matrix.multiply(matrix)
        //matrix = getRotation(2,3,dy*0.01)
        //slide.matrix = slide.matrix.multiply(matrix)
        slide.model.update()
    }

}
