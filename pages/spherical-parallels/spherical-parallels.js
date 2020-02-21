"use strict";

const slide = {
    name: "Tori",
    
    shaderName : 'toriShader'

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
    
    
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 10, -10), scene)

    populateScene()




    // customMesh.position.y = -3

    
/*

BABYLON.Effect.ShadersStore[shaderName + "VertexShader"]= `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec2 uv;

    attribute vec2 phi_cssn;
    attribute vec3 color;

    // Uniforms
    uniform mat4 worldViewProjection, world;
    uniform float time;

    // Normal
    varying vec2 vUV;
    varying vec3 v_norm;
    varying vec3 v_pos;
    varying float v_x4;
    uniform float u_cs, u_sn;
    varying float err;
    varying vec3 v_color;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;


    #define PI 3.1415926535897932384626433832795

    vec3 fun(float u, float v) {   
        float u_ab = phi_cssn[0];
        float u_cd = phi_cssn[1];
        
        float r = u_ab*sin(v*PI);
        float x2 = u_ab*cos(v*PI);
        float x1 = r*cos(2.0*u*PI);
        float x3 = r*sin(2.0*u*PI);
        float x4 = u_cd;
        float tm;
        
        tm = x1*u_cs-x4*u_sn;
        x4 = x1*u_sn+x4*u_cs;
        x1 = tm;        
        v_x4 = x4;
        float d = 1.0/(1.0-x4);            
        return d*vec3(x1,x2,x3);
    }

    void main(void) {
        v_color = color;
        vec3 p = fun(uv.x, uv.y);
        float epsilon = 0.00001;
        vec3 dpdu = fun(uv.x+epsilon, uv.y) - p;
        vec3 dpdv = fun(uv.x, uv.y+epsilon) - p;
        v_norm = normalize(cross(dpdu, dpdv));
        v_pos = p;
        gl_Position = worldViewProjection * vec4(p, 1.0);
        vUV = uv;
        if(p.x*p.x+p.y*p.y+p.z*p.z>100.0) err = 1.0;
        else err = 0.0;

        v_surfaceToLight = vec3(0.0,10.0,0.0) - (world * vec4(p,1.0)).xyz;
        v_surfaceToView = (vec4(0.0,0.0,10.0,1.0) - (world * vec4(p,1.0))).xyz; // u_viewInverse[3] 
      
    }
`

*/


    

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
        const theta = performance.now()*0.0003
        const phi = performance.now()*0.001
        let material = slide.mesh.material
        material.setFloat('u_cs', Math.cos(theta))
        material.setFloat('u_sn', Math.sin(theta))
                
        material.setFloat('time',performance.now()*0.001)
    })

    window.addEventListener("resize", onResize)    
    engine.runRenderLoop(() => scene.render())
}



function cleanup() {
    window.removeEventListener("resize", onResize)    
    if(slide.engine)
    {
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



function populateScene()
{
    createBox()
    createMesh()
}


function createBox()
{
    const scene = slide.scene

    let pts = [...Array(8).keys()].map(i=>
        new BABYLON.Vector3(
            (2*((i>>0)&1)-1) * 6.0,
            (2*((i>>1)&1)-1) * 2.0,
            (2*((i>>2)&1)-1) * 1.0))
    let arr3 = []    
    for(let i=0; i<8; i++) {
        for(let j=0; j<3; j++) {
            if(((i>>j)&1)==0) {
                arr3.push([pts[i], pts[i+(1<<j)]])
            }
        }
    }
    var lines = BABYLON.MeshBuilder.CreateLineSystem("lines", {lines: arr3}, scene);
}

function createMesh() {
    const scene = slide.scene

    let mesh = slide.mesh = new BABYLON.Mesh('custom', scene)
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
    vertexData.applyToMesh(mesh);

    // create instances
    const N = 5

    for(let i=1; i<N; i++) {
        const inst1 = mesh.createInstance("inst-"+i)
    }

    // instance buffers
    const phiCssnArray = new Float32Array(N*2)
    const colorsArray = new Float32Array(N*3)

    const vv = [0.1,0.3,0.5,0.7,0.9]
    vv.forEach((v,i) => {    
        const phi = Math.PI*0.5 * v;
        phiCssnArray[i*2] = Math.cos(phi);
        phiCssnArray[i*2+1] = Math.sin(phi);

        const color = HSVtoRGB(v,0.5,0.9);
        for(let j=0;j<3;j++) colorsArray[i*3+j] = color[j]
    })
    const engine = slide.engine
    const phiCssnBuffer = new BABYLON.Buffer(engine, phiCssnArray , true, 2, false, true);
    mesh.setVerticesBuffer(phiCssnBuffer.createVertexBuffer("phi_cssn", 0, 2))

    const colorsBuffer = new BABYLON.Buffer(engine, colorsArray , true, 3, false, true);
    mesh.setVerticesBuffer(colorsBuffer.createVertexBuffer("color", 0, 3))

    // material
    
    const material = mesh.material = new BABYLON.ShaderMaterial("mat", scene, {
            vertex: slide.shaderName,
            fragment: slide.shaderName,
        },
        {
            attributes: ["position", "uv", "color", "phi_cssn"],
            uniforms: [
                "world", "worldView", 
                "worldViewProjection", 
                "view", "projection", 
                "time", 
                "u_cs", "u_sn"]
        });
        /*
        // amigaMaterial.setTexture("textureSampler", new BABYLON.Texture("amiga.jpg", scene));
        */
       material.backFaceCulling = false;


}


//=============================================================================


BABYLON.Effect.ShadersStore[slide.shaderName + "VertexShader"]= `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec2 uv;

    attribute vec2 phi_cssn;
    attribute vec3 color;

    // Uniforms
    uniform mat4 worldViewProjection, world;
    uniform float time;

    // Normal
    varying vec2 vUV;
    varying vec3 v_norm;
    varying vec3 v_pos;
    varying float v_x4;
    uniform float u_cs, u_sn;
    varying float err;
    varying vec3 v_color;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;


    #define PI 3.1415926535897932384626433832795

    vec3 fun(float u, float v) {   
        float u_ab = phi_cssn[0];
        float u_cd = phi_cssn[1];
        
        float r = u_ab*sin(v*PI);
        float x2 = u_ab*cos(v*PI);
        float x1 = r*cos(2.0*u*PI);
        float x3 = r*sin(2.0*u*PI);
        float x4 = u_cd;
        float tm;
        
        tm = x1*u_cs-x4*u_sn;
        x4 = x1*u_sn+x4*u_cs;
        x1 = tm;        
        v_x4 = x4;
        float d = 1.0/(1.0-x4);            
        return d*vec3(x1,x2,x3);
    }

    void main(void) {
        v_color = color;
        vec3 p = fun(uv.x, uv.y);
        float epsilon = 0.00001;
        vec3 dpdu = fun(uv.x+epsilon, uv.y) - p;
        vec3 dpdv = fun(uv.x, uv.y+epsilon) - p;
        v_norm = normalize(cross(dpdu, dpdv));
        v_pos = p;
        gl_Position = worldViewProjection * vec4(p, 1.0);
        vUV = uv;
        if(p.x*p.x+p.y*p.y+p.z*p.z>100.0) err = 1.0;
        else err = 0.0;

        v_surfaceToLight = vec3(0.0,10.0,0.0) - (world * vec4(p,1.0)).xyz;
        v_surfaceToView = (vec4(0.0,0.0,10.0,1.0) - (world * vec4(p,1.0))).xyz; // u_viewInverse[3] 
      
    }
`
BABYLON.Effect.ShadersStore[slide.shaderName + "FragmentShader"]= `
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
    if(err > 0.0 || abs(v_pos.x) > 6.0 || abs(v_pos.y) > 2.0 || abs(v_pos.z) > 1.0) discard;
    else 
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
