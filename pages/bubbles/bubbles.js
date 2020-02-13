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
    model = new PolychoronBubbleModel(PolychoronData.p8)
}

let stop = false

function tick() {
    const theta = performance.now() * 0.0001;
    const cs = Math.cos(theta);
    const sn = Math.sin(theta);
    model.mesh.material.setMatrix('rot4', BABYLON.Matrix.FromArray([
        cs,0,0,-sn,
        0,1,0,0,
        0,0,1,0,
        sn,0,0,cs
    ]))
}


// ==================================================================

uffa = {}




class PolychoronBubbleModel {
    constructor() {
        this.mesh = this.buildMesh(5)
       //  this.mesh.rotation.x=Math.PI/2
    }

    buildMesh(m) {
        let n = 20
        let mesh = this.mesh = new BABYLON.Mesh("custom", scene);
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

        uffa.vertexData = vertexData
        vertexData.applyToMesh(mesh)

        let data = PolychoronData.p120
        m = data.faces.length
        for(let i=1; i<m; i++) {
            mesh.createInstance("uff-"+i)
        }

        mesh.material = this.createShaderMaterial()

        function assign(array, i, p) { 
            array[4*i]=p.x
            array[4*i+1]=p.y 
            array[4*i+2]=p.z
            array[4*i+3]=p.w
        }
        const originArray = new Float32Array(m*4)
        const e0Array = new Float32Array(m*4)
        const e1Array = new Float32Array(m*4)
        data.faces.forEach((f,i) => {
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
        })
        
        let buffer = new BABYLON.Buffer(engine, originArray , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("origin", 0, 4))
        buffer = new BABYLON.Buffer(engine, e0Array , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("e0", 0, 4))
        buffer = new BABYLON.Buffer(engine, e1Array , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("e1", 0, 4))


        return mesh


    }

    createShaderMaterial() {
        const shaderName = 'hyperBubble'
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
                    "rot4"
                ]
            });
        mat.backFaceCulling = false
        mat.alpha = 0.2
        
        mat.setMatrix('rot4', BABYLON.Matrix.Identity())

        return mat
    }
}




(()=>{
    const shaderName = 'hyperBubble'

    // ---------------------------------------------------------
    BABYLON.Effect.ShadersStore[shaderName + "VertexShader"]= `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec4 origin, e0, e1;

    // Uniforms
    uniform mat4 worldViewProjection, world, worldView;
    uniform mat4 rot4;

    varying vec3 v_norm;
    varying vec3 v_pos;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;


    #define PI 3.1415926535897932384626433832795

    vec3 fun(float u, float v) {   
        
        vec4 pos =rot4 * (origin + u * e0 + v * e1);
        pos = normalize(pos);
        float k = 0.5 / (1.0 - pos.w);
        return vec3(pos.x * k, pos.y * k, pos.z * k);
    }

    void main(void) {
        vec2 uv = vec2(position.x, position.z);

        vec3 p = fun(uv.x, uv.y);
        float epsilon = 0.001;
        vec3 dpdu = fun(uv.x+epsilon, uv.y) - fun(uv.x-epsilon, uv.y);
        vec3 dpdv = fun(uv.x, uv.y+epsilon) - fun(uv.x, uv.y-epsilon) ;
        vec3 norm = normalize(cross(dpdu, dpdv));
        

        gl_Position = worldViewProjection * vec4(p, 1.0);
        v_norm = (worldView * vec4(norm, 0.0)).xyz;

        /*
        vUV = vec2(position.x, position.z);
        //if(p.x*p.x+p.y*p.y+p.z*p.z>100.0) err = 1.0;
        //else err = 0.0;
        */

        v_surfaceToLight = vec3(0.0,10.0,0.0) - (world * vec4(p,1.0)).xyz;
        v_surfaceToView = (vec4(0.0,0.0,10.0,1.0) - (world * vec4(p,1.0))).xyz; // u_viewInverse[3] 
    }
`

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
        vec4 litR = lit(cs,dot(norm, halfVector), 120.0);

        vec3 v_color = vec3(0.2,0.2,0.2);
        vec3 color = v_color * litR.y + vec3(1.0,1.0,1.0) * litR.z;
        gl_FragColor = vec4(color,0.2); // texture2D(textureSampler, vUV);      
    }
` 
// ---------------------------------------------------------



})()




