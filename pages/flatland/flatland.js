"use strict";

const slide = {
    name:"Flatland"
}

function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)

    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        - Math.PI / 2, 0, 20, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    handlePointer()
    scene.registerBeforeRender(tick)
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


function handlePointer() {
    let clicked = false
    let oldy
    let sphereY = 0
    slide.scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onpointerdown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                if(clicked) onpointerup(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(clicked) onpointerdrag(pointerInfo)
                break
        }
    });
    function onpointerdown(pointerInfo) {
        console.log(pointerInfo)
        if(pointerInfo.event.offsetX<100) {
            clicked = true
            oldy = pointerInfo.event.offsetY
            setTimeout(() => slide.camera.detachControl(slide.canvas))
        }
    }
    function onpointerup(pointerInfo) {
        clicked = false
        slide.camera.attachControl(slide.canvas, true); 
    }
    function onpointerdrag(pointerInfo) {
        let y = pointerInfo.event.offsetY
        let dy = y-oldy
        oldy = y

        sphereY += dy * 0.01

        slide.model.setSpherePosition(sphereY)
    }

}


// ----------------------------------------------------------------------------

function populateScene() {
    const scene = slide.scene

    showWorldAxis(4, scene)
    slide.model = new BookAndSphereModel()
}

let stop = false

function tick() {
}

// ============================================================================

class BookAndSphereModel {
    constructor() {
        const scene = slide.scene

        const bookCoverAr = 841/1024
        const bookCoverHeight = 16

        const bookCover = this.bookCover = BABYLON.MeshBuilder.CreateGround('paper', {
            width:bookCoverHeight * bookCoverAr,
            height:bookCoverHeight
        }, scene)

        const mat = bookCover.material = new BABYLON.StandardMaterial('bookCover-mat', scene)
        mat.specularColor.set(0,0,0)
        mat.diffuseColor.set(0.8,0.8,0.8)
        // mat.diffuseColor.set(0.3,0.3,0.8)

        mat.diffuseTexture = new BABYLON.Texture("images/flatland-cover.jpg", scene);

        const sphere = this.sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {diameter:1.5}, scene)
        sphere.position.set(-0.4,0,-1.8)
        const material = sphere.material = new BABYLON.StandardMaterial('sphere-mat', scene)
        
        material.diffuseColor = new BABYLON.Color3(0, 0, 0);
        material.reflectionTexture = new BABYLON.CubeTexture("textures/TropicalSunnyDay", scene);
        material.reflectionTexture.level = 1;
        material.specularPower = 150;
        material.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        material.alpha = 0.4;

        const ringMesh = this.ringMesh = BABYLON.MeshBuilder.CreateTorus('ring', {updatable:true}, scene)
        ringMesh.material = new BABYLON.StandardMaterial('ring-mat', scene)


    }

    updateRingMesh() {
        const r1 = 2, r2 = 0.1
        
        const mesh = this.ringMesh
        var positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        var normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        var colors = mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind);
        var uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
        let n = uvs.length/2
        for(let i=0; i<n; i++) {
            const u = uvs[i*2], v = uvs[i*2+1]
            const phi = u*Math.PI*2
            const csPhi = Math.cos(phi)
            const theta = v*Math.PI*2
            const y = Math.sin(theta)
            const r = Math.cos(theta) + 
        }
        
    }

    setSpherePosition(y) {
        this.sphere.position.y = y
    }
}