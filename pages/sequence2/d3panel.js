"use strict";


function alignMesh(mesh, p1, p2) {
    let delta = p2.subtract(p1);
    mesh.position.set(0,0,0);
    mesh.lookAt(delta);
    mesh.rotate(BABYLON.Axis.X, Math.PI/2);
    mesh.scaling.set(1,delta.length()*0.5,1);
    BABYLON.Vector3.LerpToRef(p1,p2,0.5,mesh.position);   
}

class D3Panel {
    constructor(container, hypercube) {
        this.hypercube = hypercube;
        let panel = this.panel = document.createElement('div');
        panel.classList.add('d3-panel');
        let canvas = this.canvas = document.createElement('canvas');
        panel.appendChild(canvas);
        container.appendChild(panel);
        
        canvas.style.width = "90%";
        canvas.style.height = "90%";        
        canvas.addEventListener('wheel', evt => evt.preventDefault());
        let engine = this.engine = new BABYLON.Engine(canvas, true);
        engine.setHardwareScalingLevel(0.5);
        let scene = this.scene = new BABYLON.Scene(engine);
        let camera = this.camera = new BABYLON.ArcRotateCamera('cam', 
            Math.PI/2,Math.PI/2,
            10, 
            new BABYLON.Vector3(0,0,0), 
            scene);
        // camera.attachControl(canvas,true);
        camera.wheelPrecision = 50;
        camera.lowerRadiusLimit = 3;
        camera.upperRadiusLimit = 13*2; 
        camera.fov = 0.8;           

        this.populateScene();
        this.update();

        this.engine.resize();
        engine.runRenderLoop(()=>{ 
            if(canvas.width != canvas.clientWidth || 
                canvas.height != canvas.clientHeight) engine.resize();
            scene.render()
        });

        this.handlePointer();
    

        /*
                var pipeline = new BABYLON.DefaultRenderingPipeline(
            "defaultPipeline", // The name of the pipeline
            true, // Do you want the pipeline to use HDR texture?
            d3Panel.scene, // The scene instance
            [d3Panel.camera] // The list of cameras to be attached to
        );
        undefined
        pipeline.samples=4
        4
        pipeline.samples=8
        8
        pipeline.fxaaEnabled = true;
        true
        */
    }

    resize() {
        this.engine.resize();
    }

    populateScene() {

        const scene = this.scene;

        scene.clearColor.set(1,1,1)

        var light = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(0, -1, 0), scene);
        light.position = new BABYLON.Vector3(0, 10, 0);
    
        var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0,0,0), scene);
        light2.parent = this.camera;
        //var lightSphere = BABYLON.Mesh.CreateSphere("sphere", 10, 2, scene);
        //lightSphere.position = light.position;
        //lightSphere.material = new BABYLON.StandardMaterial("light", scene);
        //lightSphere.material.emissiveColor = new BABYLON.Color3(1, 1, 0);
    
        // Ground
        var ground = BABYLON.MeshBuilder.CreateGround("ground", {width:10, height:10}, scene);
        window.ground = ground;
        var groundMaterial = new BABYLON.StandardMaterial("ground", scene);
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        groundMaterial.diffuseColor = new BABYLON.Color3(1,1,1);

        ground.position.y = -2.8;
        ground.material = groundMaterial;
    
        let pivot = this.pivot = new BABYLON.TransformNode('pivot', scene);
        pivot.rotationQuaternion = new BABYLON.Quaternion();
        let ball = BABYLON.MeshBuilder.CreateSphere('a', {diameter:0.15}, scene);
        ball.material = this.vertexMaterial = new BABYLON.StandardMaterial('mat-a', scene);
        ball.material.specularColor.set(0.1,0.1,0.1);
        let balls = this.balls = [ball];
        let vertexCount = this.hypercube.vertices.length;
        for(let i=1; i<vertexCount; i++) balls.push(ball.createInstance('b'+i));
        balls.forEach(b=>{ b.isVisible = false; b.parent = pivot;} );

        let cyl = new BABYLON.MeshBuilder.CreateCylinder('a', {diameter:0.1}, scene);
        cyl.material = this.edge1Material = new BABYLON.StandardMaterial('mat-a', scene);
        cyl.material.specularColor.set(0.1,0.1,0.1);
        let edges = this.edges = [cyl];
        let edgeCount = this.hypercube.edges.length;
        for(let i=1; i<edgeCount; i++) edges.push(cyl.clone());
        edges.forEach(e=>{ e.isVisible = false; e.parent = pivot; });


        ball.material.diffuseColor.set(0.8,0.7,0.7);

        this.edge2Material = this.edge1Material.clone();
        this.edge3Material = this.edge1Material.clone();

        
        this.edgeColor = new BABYLON.Color4(0.8,0.7,0.6);
        this.newEdgeColor = new BABYLON.Color4(0.8,0.8,0.2);
        this.sideEdgeColor = new BABYLON.Color4(0.8,0.2,0.2);

        this.edge1Material.diffuseColor.copyFrom(this.edgeColor);  
        //this.edge2Material.diffuseColor.set(0.8,0.8,0.1);
        //this.edge3Material.diffuseColor.set(0.8,0.1,0.1);
        
        

        // objects
        // Shadows
        var shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
        let renderList = shadowGenerator.getShadowMap().renderList;
        balls.forEach(ball=>renderList.push(ball));
        edges.forEach(edge=>renderList.push(edge));
        
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.useKernelBlur = true;
        shadowGenerator.blurKernel = 64; // 128;
    
        ground.receiveShadows = true;
        
        scene.registerBeforeRender(()=>{
            this.adjustRotation();
        })
    }

    handlePointer() {
        const scene = this.scene;
        let oldx, oldy;
        scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    oldx = scene.pointerX;
                    oldy = scene.pointerY;
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    if(pointerInfo.event.buttons != 0) {
                        let dx = scene.pointerX - oldx;
                        let dy = scene.pointerY - oldy;
                        this.drag(dx,dy);
                        oldx = scene.pointerX;
                        oldy = scene.pointerY;
                    }  
                    break;
            }
        });    
    }

    canRotate() {
        return this.hypercube.ceilD >= 3 || this.hypercube.targetDim >= 3;
    }

    drag(dx, dy) {
        if(!this.canRotate()) return;
        let rot = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -dx*0.01);
        rot.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, dy*0.01));
        this.pivot.rotationQuaternion = 
            rot.multiply(this.pivot.rotationQuaternion);
    }

    adjustRotation() {
        if(!this.canRotate()) {
            const identity = BABYLON.Quaternion.Identity();
            if(BABYLON.Quaternion.AreClose(
                this.pivot.rotationQuaternion, 
                identity,
                0.001)) {
                this.pivot.rotationQuaternion.copyFrom(identity);
            } else {
                BABYLON.Quaternion.SlerpToRef(
                    this.pivot.rotationQuaternion, 
                    identity,
                    0.1,
                    this.pivot.rotationQuaternion
                );
            }
        }
    }

    update() {
        let base = [
            new BABYLON.Vector3(1,0,0),
            new BABYLON.Vector3(0,1,0),
            new BABYLON.Vector3(0,0,1),
            new BABYLON.Vector3(0.1,-0.2,0.5),
                        
        ];
        const balls = this.balls;
        balls.forEach((ball,i) => {
            let vertex = this.hypercube.vertices[i];
            ball.isVisible = vertex.isVisible;
            let p = ball.position;
            p.set(0,0,0);
            if(vertex.isVisible) {
                for(let j=0; j<3; j++) p.addInPlace(base[j].scale(vertex.ts[j]));
                let t = 1 + 0.3*vertex.ts[3];
                p.scaleInPlace(t);
                p.addInPlace(base[3].scale(vertex.ts[4]));
            }
        });
        let mat1 = this.edge1Material;
        let mat2 = this.edge2Material;
        let mat3 = this.edge3Material;
        
        this.edges.forEach((e,i) => {
            let edge = this.hypercube.edges[i];
            e.isVisible = edge.isVisible;
            if(e.isVisible) {
                let pa = balls[edge.va.idx].position;
                let pb = balls[edge.vb.idx].position;
                alignMesh(e, pa,pb);
                if(edge.va.isNew && edge.vb.isNew) e.material = mat3;
                else if(edge.va.isNew || edge.vb.isNew) e.material = mat2;
                else e.material = mat1;
            }
        });
        let cParam = 1-this.hypercube.endParameter;

        BABYLON.Color3.LerpToRef(this.edgeColor, this.newEdgeColor, cParam, 
            mat3.diffuseColor);
        BABYLON.Color3.LerpToRef(this.edgeColor, this.sideEdgeColor, cParam, 
            mat2.diffuseColor);

        
    }
}

