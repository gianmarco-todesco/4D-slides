"use strict";

const slide = {
    name:"Bubbles"
}

function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)
    // Explicit and near-black: the film is drawn with additive blending, so it
    // has to add light to something dark. Babylon's default (0.2,0.2,0.3) is a
    // mid grey that the old material could only ever darken.
    scene.clearColor.set(0.02, 0.02, 0.05, 1)

    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera", 
        Math.PI / 2, Math.PI / 2, 9, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    
    scene.registerBeforeRender(tick)
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



let stop = false

// The xw rotation sweeps faces through the pole of the stereographic projection
// (w = 1), where they blow up into sheets that cover everything: measured, the
// object went from 23% to 97% of the frame over one full turn, and the cluster
// was swamped for most of it. theta = 0 is the frame where it reads best -- a
// compact, centred, symmetric cluster -- so we only breathe around it. Even this
// narrow a band still shows the thing worth showing: one cell inflates while
// another deflates as they move in w. Set slide.thetaAmplitude = Math.PI to get
// the full sweep back.
slide.thetaAmplitude = 0.13
slide.thetaPeriod = 14000

function tick() {
    const theta = slide.thetaAmplitude *
        Math.sin(performance.now() * 2 * Math.PI / slide.thetaPeriod);
    const cs = Math.cos(theta);
    const sn = Math.sin(theta);
    const mat = slide.model.mesh.material
    mat.setMatrix('rot4', BABYLON.Matrix.FromArray([
        cs,0,0,-sn,
        0,1,0,0,
        0,0,1,0,
        sn,0,0,cs
    ]))
    // The shader used to assume the eye was at (0,0,10), so the highlights did
    // not follow the camera as soon as you orbited.
    mat.setVector3('eye', slide.camera.position)
}


// ==================================================================

let uffa = {}




class PolychoronBubbleModel {
    constructor() {
        this.mesh = this.buildMesh(5)
       //  this.mesh.rotation.x=Math.PI/2
    }

    buildMesh(m) {
        const scene = slide.scene
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
        const engine = slide.engine

        let buffer = new BABYLON.Buffer(engine, originArray , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("origin", 0, 4))
        buffer = new BABYLON.Buffer(engine, e0Array , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("e0", 0, 4))
        buffer = new BABYLON.Buffer(engine, e1Array , true, 4, false, true);
        mesh.setVerticesBuffer(buffer.createVertexBuffer("e1", 0, 4))


        return mesh


    }

    createShaderMaterial() {
        const scene = slide.scene
        const shaderName = 'hyperBubble'
        const mat = new BABYLON.ShaderMaterial("bubbleMaterial", scene, {
                vertex: shaderName,
                fragment: shaderName,
            },
            {
                attributes: ["position", "origin", "e0", "e1"],
                uniforms: [
                    "world", "worldView", "worldViewProjection",
                    "view", "projection", "rot4", "eye",
                    "filmBase", "fresnelGain", "borderWidth", "borderGain",
                    "iriGain", "specGain", "fadeStart", "fadeEnd",
                    "sizeMin", "sizeMax", "sizeWeight"
                ]
            });

        // Additive, depth-write off. Two reasons, and the second is why the old
        // alpha blending could not have worked whatever the colours were: a soap
        // film adds light rather than subtracting it, AND additive blending is
        // order independent. The 720 pentagons are instances of one mesh, so
        // they go out in a single unsorted draw call -- under SRC_ALPHA blending
        // the result depended on instance order, which is arbitrary.
        mat.alphaMode = BABYLON.Constants.ALPHA_ONEONE
        mat.alpha = 0.999                   // makes Babylon take the blend path
        mat.disableDepthWrite = true
        mat.backFaceCulling = false

        // Uniforms rather than #defines so they can be tuned from the console
        // without a shader recompile: mat.setFloat('fresnelGain', 0.8).
        slide.params = {
            filmBase:    0.09,   // brightness face-on, where a film is nearly invisible
            fresnelGain: 1.2,    // brightness at grazing angles: the main soap cue
            borderWidth: 0.075,   // Plateau border width, in patch uv units
            borderGain:  0.10,    // brightness of the 120 degree junctions
            iriGain:     0.30,    // thin-film iridescence, 0 = white film
            specGain:    0.50,
            fadeStart:   3.2,     // fade geometry blown up near the pole
            fadeEnd:     5.5,
            // Band-pass on cell size. Stereographic projection spreads the 720
            // faces over a huge range of scales: the ones near the pole become
            // screen-filling sheets, the ones near the antipode pile up into a
            // saturated blob. Only the middle of the range reads as a foam.
            sizeMin:     0.12,
            sizeMax:     4.0,
            sizeWeight:  0.30    // how much the smallest cells are dimmed
        }
        Object.keys(slide.params).forEach(k => mat.setFloat(k, slide.params[k]))
        mat.setVector3('eye', new BABYLON.Vector3(0, 0, 10))
        mat.setMatrix('rot4', BABYLON.Matrix.Identity())

        return mat
    }
}


function populateScene() {
    slide.model = new PolychoronBubbleModel(PolychoronData.p8)
}


(()=>{
    const shaderName = 'hyperBubble'

    // ---------------------------------------------------------
    BABYLON.Effect.ShadersStore[shaderName + "VertexShader"] = `
    precision highp float;

    attribute vec3 position;
    attribute vec4 origin, e0, e1;

    uniform mat4 worldViewProjection, world, worldView, view;
    uniform mat4 rot4;
    uniform vec3 eye;
    uniform float fadeStart, fadeEnd, sizeMin, sizeMax, sizeWeight;

    varying vec3 v_norm;
    varying vec3 v_view;
    varying vec2 v_uv;
    varying float v_fade;
    varying float v_phase;

    // Inflate the flat pentagon onto the unit 3-sphere, then project it
    // stereographically from w = 1. The projection is conformal, and that is
    // what makes three films meet at 120 degrees here exactly as they do in a
    // real cluster: the whole point of the slide rests on this function.
    vec3 fun(float u, float v) {
        vec4 pos = rot4 * (origin + u * e0 + v * e1);
        pos = normalize(pos);
        float k = 0.5 / (1.0 - pos.w);
        return vec3(pos.x * k, pos.y * k, pos.z * k);
    }

    void main(void) {
        v_uv = vec2(position.x, position.z);

        vec3 p = fun(v_uv.x, v_uv.y);
        float epsilon = 0.001;
        vec3 dpdu = fun(v_uv.x + epsilon, v_uv.y) - fun(v_uv.x - epsilon, v_uv.y);
        vec3 dpdv = fun(v_uv.x, v_uv.y + epsilon) - fun(v_uv.x, v_uv.y - epsilon);
        vec3 norm = normalize(cross(dpdu, dpdv));

        gl_Position = worldViewProjection * vec4(p, 1.0);

        vec3 world_p = (world * vec4(p, 1.0)).xyz;
        v_norm = (world * vec4(norm, 0.0)).xyz;
        v_view = eye - world_p;

        // How much the projection stretches this patch locally. dpdu is a
        // central difference over 2*epsilon, so divide it back out.
        float stretch = length(dpdu) / (2.0 * epsilon);

        // Drop the screen-filling sheets near the pole and the degenerate
        // slivers, but only dim the small cells rather than removing them: they
        // are the interior structure, and cutting them leaves a hole in the
        // middle of the cluster. Because they are many and overlap, each one has
        // to count for less light or the additive blend saturates to white.
        float big   = 1.0 - smoothstep(sizeMax, sizeMax * 2.0, stretch);
        float small = smoothstep(sizeMin, sizeMin * 2.5, stretch);
        float crowd = mix(sizeWeight, 1.0, smoothstep(sizeMin, sizeMax * 0.5, stretch));

        v_fade = (1.0 - smoothstep(fadeStart, fadeEnd, length(p))) * big * small * crowd;

        // Per-face film thickness, so neighbouring films differ in colour the
        // way they do in a real foam.
        v_phase = fract(dot(origin, vec4(12.9898, 78.233, 45.164, 94.673)) * 0.037);
    }
`

    BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"] = `
    precision highp float;

    varying vec3 v_norm;
    varying vec3 v_view;
    varying vec2 v_uv;
    varying float v_fade;
    varying float v_phase;

    uniform float filmBase, fresnelGain, borderWidth, borderGain;
    uniform float iriGain, specGain;

    #define TAU 6.283185307179586

    // Distance from the pentagon boundary in patch uv coordinates: 0 on the
    // edge, up to the apothem at the centre. The five edge normals bisect the
    // five vertices, which buildMesh puts at angles 2*pi*i/5 and radius 1.
    float pentagonEdge(vec2 p) {
        const float APOTHEM = 0.80901699;      // cos(pi/5)
        float m = -1.0;
        for (int i = 0; i < 5; i++) {
            float a = TAU * (float(i) + 0.5) / 5.0;
            m = max(m, dot(p, vec2(cos(a), sin(a))));
        }
        return APOTHEM - m;
    }

    void main(void) {
        vec3 N = normalize(v_norm);
        vec3 V = normalize(v_view);
        if (dot(N, V) < 0.0) N = -N;            // a film has no inside
        float ndv = clamp(dot(N, V), 0.0, 1.0);

        // Fresnel. This says "soap film" more than anything else does: the film
        // is almost invisible face-on and bright edge-on, which is what draws
        // the silhouette of every single bubble in a cluster.
        float fres = pow(1.0 - ndv, 3.0);

        // Thin-film interference, approximated as a hue sweep driven by the
        // per-face thickness and the viewing angle.
        float t = fract(v_phase + 0.55 * (1.0 - ndv));
        vec3 iri = 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.67)));
        iri = mix(vec3(1.0), iri, iriGain);

        // Plateau borders, where three films meet at 120 degrees. Three
        // coincident patch edges land on each one, so the additive blend
        // brightens them by itself; this only has to give them a width.
        float d = pentagonEdge(v_uv);
        float border = 1.0 - smoothstep(0.0, borderWidth, d);

        vec3 L = normalize(vec3(0.4, 1.0, 0.6));
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 80.0);

        float film = filmBase + fresnelGain * fres;

        vec3 color = iri * film
                   + vec3(1.0) * spec * specGain * (0.3 + 0.7 * fres)
                   + iri * border * borderGain;

        gl_FragColor = vec4(color * v_fade, 1.0);   // additive: alpha is unused
    }
`
    // ---------------------------------------------------------
})()
