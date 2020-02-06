let canvas,engine,scene
let camera
let light1, light2


canvas = document.getElementById("renderCanvas")
engine = new BABYLON.Engine(canvas, true)
scene = new BABYLON.Scene(engine)

camera = new BABYLON.ArcRotateCamera("Camera", 
    Math.PI / 2, Math.PI / 2, 10, 
    new BABYLON.Vector3(0,0,0), scene)
camera.attachControl(canvas, true)

light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), scene)


let customMesh = new BABYLON.Mesh('custom', scene)
let m = 100
let positions = []
let uvs = []
for(let i=0; i<m; i++) {
    for(let j=0; j<m; j++) {
        let u = i/(m-1)
        let v = j/(m-1)
        let x = (u*2-1) * 2.0
        let z = -(v*2-1) * 2.0
        uvs.push(u,v)
        positions.push(x,0,z)
    }
}
let indices = []
for(let i=0; i+1<m; i++) {
    for(let j=0; j+1<m; j++) {
        let k = i*m + j
        indices.push(k,k+1,k+m+1,k,k+m+1,k+m)
    }
}

var vertexData = new BABYLON.VertexData();
vertexData.positions = positions;
vertexData.indices = indices;    
vertexData.uvs = uvs;    
vertexData.applyToMesh(customMesh);

customMesh.position.y = -3

const shaderName = 'myShader'

BABYLON.Effect.ShadersStore[shaderName + "VertexShader"]= `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec2 uv;

    attribute float customattr;
    attribute vec2 phi_cssn;

    // Uniforms
    uniform mat4 worldViewProjection;
    uniform float time;

    // Normal
    varying vec2 vUV;
    varying vec3 v_norm;
    varying vec3 v_pos;
    varying float v_x4;
    uniform float u_cs, u_sn;
    varying float err;

    #define PI 3.1415926535897932384626433832795

    vec3 fun(float u, float v) {   
        float u_ab = phi_cssn[0];
        float u_cd = phi_cssn[1];
           
        float x1 = u_ab*cos(2.0*u*PI);
        float x3 = u_ab*sin(2.0*u*PI);
        float x2 = u_cd*cos(2.0*v*PI);
        float x4 = u_cd*sin(2.0*v*PI);
        float tm;
        
        tm = x1*u_cs-x4*u_sn;
        x4 = x1*u_sn+x4*u_cs;
        x1 = tm;        
        v_x4 = x4;
        float d = 1.0/(1.0-x4);            
        return d*vec3(x1,x2,x3);
    }

    void main(void) {
        vec3 p = fun(uv.x, uv.y);
        float epsilon = 0.00001;
        vec3 dpdu = fun(uv.x+epsilon, uv.y) - p;
        vec3 dpdv = fun(uv.x, uv.y+epsilon) - p;
        v_norm = normalize(cross(dpdu, dpdv));
        v_pos = p;
        gl_Position = worldViewProjection * vec4(p, 1.0);
        vUV = uv;
        if(p.x*p.x+p.y*p.y+p.z*p.z>10.0) err = 1.0;
        else err = 0.0;
    }
`

BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"]= `
    precision highp float;
    varying vec2 vUV;
    varying vec3 v_norm;
    varying vec3 v_pos;
    varying float err;

    // uniform sampler2D textureSampler;
    void main(void) {
        if(err > 0.0 || abs(v_pos.x) > 2.0 || abs(v_pos.y) > 2.0 || abs(v_pos.z) > 2.0) discard;
        else 
        {
            vec3 norm = normalize(v_norm);
            float q = dot(norm, vec3(0.2,0.6,0.05));
            vec3 color = vec3(0.4,0.8,0.9) * q;
            gl_FragColor = vec4(color,1.0); // texture2D(textureSampler, vUV);    
        }
    }
`


var amigaMaterial = new BABYLON.ShaderMaterial("amiga", scene, {
            vertex: shaderName,
            fragment: shaderName,
        },
        {
            attributes: ["position", "uv", "color", "customattr", "phi_cssn"],
            uniforms: [
                "worldViewProjection", 
                "time", 
                "u_cs", "u_sn"]
        });
/*
// amigaMaterial.setTexture("textureSampler", new BABYLON.Texture("amiga.jpg", scene));
*/
customMesh.material = amigaMaterial;
amigaMaterial.backFaceCulling = false;

const inst1 = customMesh.createInstance("i1")

const arr = new Float32Array(2);
arr[0] = 0.0; 
arr[1] = 1.0; 


customMesh.customInstancesBuffer = new BABYLON.Buffer(engine, arr , true, 1, false, true);
customMesh.customVertBuffer = customMesh.customInstancesBuffer.createVertexBuffer("customattr", 0, 1)

customMesh.setVerticesBuffer(customMesh.customVertBuffer);


const arr2 = new Float32Array(2*2);


for(let i=0; i<2; i++) {
    const phi = 0;
    arr2[i*2] = Math.cos(phi+i);
    arr2[i*2+1] = Math.sin(phi+i);
    
    //amigaMaterial.setFloat('u_cs', Math.cos(phi))
    //amigaMaterial.setFloat('u_sn', Math.sin(phi))

}

const arr2_buff = new BABYLON.Buffer(engine, arr2 , true, 2, false, true);
customMesh.setVerticesBuffer(arr2_buff.createVertexBuffer("phi_cssn", 0, 2))




/*
arr[2] = 1.0
customMesh.customInstancesBuffer = new BABYLON.Buffer(
        engine, 
        customMesh.customInstanceData , true, 1, false, true);
customMesh.customVertBuffer = customMesh.customInstancesBuffer.createVertexBuffer(
    "customattr", 0, 1);

customMesh.setVerticesBuffer(customMesh.customVertBuffer);

*/

let R = 0.0;
let dr = 0.000001;

scene.registerBeforeRender(() => {
    const theta = 0.4
    const phi = performance.now()*0.001
    amigaMaterial.setFloat('u_cs', Math.cos(theta))
    amigaMaterial.setFloat('u_sn', Math.sin(theta))
    
    for(let i=0; i<2; i++) {
        arr2[i*2] = Math.cos(phi+i);
        arr2[i*2+1] = Math.sin(phi+i);
        
        //amigaMaterial.setFloat('u_cs', Math.cos(phi))
        //amigaMaterial.setFloat('u_sn', Math.sin(phi))
    
    }
    arr2_buff.update(arr2);
    
    amigaMaterial.setFloat('time',performance.now()*0.003)
})

engine.runRenderLoop(() => scene.render())
window.addEventListener("resize", () => engine.resize())
