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
}


// ==================================================================

uffa = {}




class PolychoronBubbleModel {
    constructor() {
        this.mesh = this.buildMesh(5)
        this.mesh.rotation.x=Math.PI/2
    }

    buildMesh(m) {
        let n = 5
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

        mesh.material = this.createShaderMaterial()
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
                    "position", "uv", "color", "phi_cssn",
                    "origin", "e0", "e1", 
                ],
                uniforms: [
                    "world", "worldView", 
                    "worldViewProjection", 
                    "view", "projection", 
                    "time",
                    
                    "u_cs", "u_sn"]
            });
        mat.backFaceCulling = false
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

    // Uniforms
    uniform mat4 worldViewProjection, world;
    uniform float time;
    uniform vec4 origin, e0, e1; 

    // Normal
    varying vec2 vUV;
    varying vec3 v_norm;
    varying vec3 v_pos;
    varying float err;
    varying vec3 v_color;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;


    #define PI 3.1415926535897932384626433832795

    vec3 fun(float u, float v) {   
        
        vec4 pos = origin + u * e0 + v * e1;
        pos = normalize(pos);
        float k = 2.0 / (1.0 - pos.w);
        return vec3(pos.x * k, pos.y * k, pos.z * k);
    }

    void main(void) {

        vec3 p = fun(position.x, position.z);
        float epsilon = 0.00001;
        vec3 dpdu = fun(position.x+epsilon, position.z) - p;
        vec3 dpdv = fun(position.x, position.z+epsilon) - p;
        vec3 norm = normalize(cross(dpdu, dpdv));
        /*
        v_color = vec3(0.8,0.3,0.1);
        v_pos = p;
        gl_Position = worldViewProjection * vec4(p, 1.0);
        */

        gl_Position = worldViewProjection * vec4(p, 1.0);
        v_norm = vec3(world * vec4(norm, 0.0));

        /*
        vUV = vec2(position.x, position.z);
        //if(p.x*p.x+p.y*p.y+p.z*p.z>100.0) err = 1.0;
        //else err = 0.0;

        v_surfaceToLight = vec3(0.0,10.0,0.0) - (world * vec4(p,1.0)).xyz;
        v_surfaceToView = (vec4(0.0,0.0,10.0,1.0) - (world * vec4(p,1.0))).xyz; // u_viewInverse[3] 
      */
    }
`
    // ---------------------------------------------------------
    BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"]= `
    precision highp float;
    varying vec2 vUV;
    varying vec3 v_norm;
    varying vec3 v_pos;
    varying float err;
    varying vec3 v_color;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;

    vec4 lit(float l ,float h, float m) {
        return vec4(1.0,
                    abs(l),//max(l, 0.0),
                    (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
                    1.0);
    }


    // uniform sampler2D textureSampler;
    void main(void) {
        //if(err > 0.0 || abs(v_pos.x) > 2.0 || abs(v_pos.y) > 2.0 || abs(v_pos.z) > 2.0) discard;
        //else 
        {
            vec3 norm = normalize(v_norm);
            vec3 surfaceToLight = normalize(v_surfaceToLight);
            vec3 surfaceToView = normalize(v_surfaceToView);
            vec3 halfVector = normalize(surfaceToLight + surfaceToView);
          
            if(dot(surfaceToView, norm)<0.0) {  norm = -norm; }
            float cs = dot(norm, surfaceToLight);
            vec4 litR = lit(cs,dot(norm, halfVector), 120.0);
  
            vec3 color = v_color * litR.y + vec3(1.0,1.0,1.0) * litR.z;
            gl_FragColor = vec4(color,1.0); // texture2D(textureSampler, vUV);    
        }
    }
` 
BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"]= `
    precision highp float;
    varying vec2 vUV;
    varying vec3 v_norm;
    varying vec3 v_pos;
    varying float err;
    varying vec3 v_color;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;

    

    void main(void) {
        vec3 norm = normalize(v_norm);
        float cs = norm.z;
        if(cs<0.0) cs = -cs;
        vec3 color = cs * vec3(0.3,0.4,0.6);
        gl_FragColor = vec4(color,1.0) ;         
    }
` 
// ---------------------------------------------------------



})()




