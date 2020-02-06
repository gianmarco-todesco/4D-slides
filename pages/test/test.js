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
let m = 50
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

const vs = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;
    uniform float time;

    // Normal
    varying vec2 vUV;
    varying vec3 v_norm;

    vec3 getPosition(float u, float v) {
        float x = 2.0*(-1.0 + 2.0*u);
        float z = -2.0*(-1.0 + 2.0*v);
        float y = 0.25 * sin(time + x*x+z*z);
        return vec3(x,y,z);
    }


    void main(void) {
        vec3 p = getPosition(uv.x, uv.y);
        float epsilon = 0.0001;
        vec3 dpdu = getPosition(uv.x+epsilon, uv.y) - p;
        vec3 dpdv = getPosition(uv.x, uv.y+epsilon) - p;
        v_norm = normalize(cross(dpdu, dpdv));
        gl_Position = worldViewProjection * vec4(p, 1.0);
        vUV = uv;
    }
`

const fs = `
    precision highp float;
    varying vec2 vUV;
    varying vec3 v_norm;

    // uniform sampler2D textureSampler;
    void main(void) {
        vec3 norm = normalize(v_norm);
        vec3 color = vec3(0.4,0.8,0.9) * norm.y;
        gl_FragColor = vec4(color,1.0); // texture2D(textureSampler, vUV);
    }
`


var amigaMaterial = new BABYLON.ShaderMaterial("amiga", scene, {
            vertex: 'base64:'+btoa(vs),
            fragment: 'base64:'+btoa(fs),
        },
        {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "time"]
        });
/*
// amigaMaterial.setTexture("textureSampler", new BABYLON.Texture("amiga.jpg", scene));
*/
customMesh.material = amigaMaterial;

scene.registerBeforeRender(() => {
    amigaMaterial.setFloat('time',performance.now()*0.003)
})

engine.runRenderLoop(() => scene.render())
window.addEventListener("resize", () => engine.resize())
