const slide = {
    name: 'sequence',
    targetDim: 0, 
    currentDim: 0,
    currentDimSpeed: 0.001
}



function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)

    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 10, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    
    scene.ambientColor.set(0.5,0.5,0.5)

    //renderTarget = createRenderTarget()
    
    // light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    slide.light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 10, 0), scene)    
    slide.light1 = new BABYLON.PointLight("light1", new BABYLON.Vector3(0, 0, 0), scene)    
    slide.light1.parent = camera

    // shadow
    //let shadowGenerator = sg = new BABYLON.ShadowGenerator(512, light2);
    // shadowGenerator.useBlurVarianceShadowMap = true;
    // shadowGenerator.blurScale = 10.0;
    // shadowGenerator.usePoissonSampling = true
    //sg.setDarkness(0.8)
    // sg.usePoissonSampling=true
    //sg.useBlurExponentialShadowMap  = true

    // background
    createGround()

/*
    let plane = BABYLON.MeshBuilder.CreatePlane('a', {size:3}, scene)
    plane.material = new BABYLON.StandardMaterial("planeMat", scene);
    plane.material.diffuseTexture = renderTarget

    plane.position.x = 3
*/
    // model
    slide.model = new Model(scene)    
    slide.model.updatePositions(slide.currentDim)

    slide.oldTime = performance.now()

    scene.registerBeforeRender(tick)    
    window.addEventListener("resize", () => engine.resize())    
    scene.onKeyboardObservable.add(onKeyEvent);

    engine.runRenderLoop(() => scene.render())   
}




function cleanup() {
    slide.engine.stopRenderLoop()    
    slide.scene.dispose()
    delete slide.scene
    slide.engine.dispose()
    delete slide.engine

}

function createGround() {
    const scene = slide.scene
    let groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    groundMat.ambientColor = new BABYLON.Color3(0.5, 0.5, 0.5); 
    groundMat.specularColor.set(0,0,0)   
    let ground = BABYLON.MeshBuilder.CreateGround('ground', {
        width:5, 
        height:5}, scene)
    ground.position.y = -3
    ground.material = groundMat;
    //ground.receiveShadows = true;
    // groundMat.diffuseTexture = renderTarget
}

function createRenderTarget() {
    let rtt = new BABYLON.RenderTargetTexture("rt", 512, scene)
    scene.customRenderTargets.push(rtt);


    let rttCamera = new BABYLON.FreeCamera('rttCamera', new BABYLON.Vector3(0,10,0), scene)
    // rttCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
    rttCamera.rotation.x = Math.PI/2
    rtt.activeCamera = rttCamera

    let rttMaterial = new BABYLON.StandardMaterial('rtt-mat', scene)
    rttMaterial.diffuseColor.set(0,0,0)
    rttMaterial.specularColor.set(0,0,0)
    rttMaterial.emissiveColor.set(0,0,0)
    rttMaterial.ambientColor.set(0,0,0)
    
    let bgColor = new BABYLON.Color3()

    
    rtt.onBeforeRender = (e) => {
        rtt.renderList.forEach(mesh => {
            mesh._saved = mesh.material
            mesh.material =  rttMaterial
        })
        bgColor.copyFrom(scene.clearColor)
        scene.clearColor.set(.9,.9,.9)
    };
    rtt.onAfterRender = () => {
        rtt.renderList.forEach(mesh => {
            mesh.material =  mesh._saved
        })
        scene.clearColor.copyFrom(bgColor)
    };
    

    return rtt
}


class Model {
    constructor(scene) {
        // let rl = shadowGenerator.getShadowMap().renderList;
        // let rl = []
        let rl = []


        this.scene = scene
        this.vertices = []
        let edgeCount = 0
        for(let i=0; i<32; i++) {
            let sphere = BABYLON.MeshBuilder.CreateSphere("sphere-"+i, {diameter:0.1}, scene)
            rl.push(sphere)
            let mat = sphere.material = new BABYLON.StandardMaterial('mat-'+i, scene)
            mat.diffuseColor.set(0.8,0.2,0.2)
            this.vertices.push(sphere)
            sphere.edges = {}
            for(let j=0; j<5; j++) {
                if((i>>j)&1) {
                    let edge = BABYLON.MeshBuilder.CreateCylinder("cyl-"+edgeCount, {diameter:0.05, height:1}, scene)
                    rl.push(edge)
                    edge.mat = new BABYLON.StandardMaterial('mat2-'+edgeCount, scene)
                    edge.mat.diffuseColor.set(0.5,0.5,0.5)
                    sphere.edges[j] = edge
                    edgeCount++
                }
            }
        }
        
        // renderTarget.renderList = rl

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
    }

}


function tick() {
    
    let time = performance.now()
    let deltaTime = time - slide.oldTime
    slide.oldTime = time

    let { targetDim, currentDim, currentDimSpeed } = slide
    let oldDim = currentDim
    if(currentDim < targetDim) {
        currentDim = Math.min(targetDim, currentDim + currentDimSpeed * deltaTime)
    } else if(currentDim > targetDim) {
        currentDim = Math.max(targetDim, currentDim - currentDimSpeed * deltaTime)
    }
    if(oldDim != currentDim) {
        slide.currentDim = currentDim
        slide.model.updatePositions(currentDim)
    }
}

function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            const key = kbInfo.event.keyCode
            if(49<=key && key<=49+4) {
                slide.targetDim = Math.min(4.999, key-48)
                
            }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            break;
    }
}
