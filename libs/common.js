"use strict";

// Each animation lives in its own iframe and exposes three globals: `slide`
// (which must carry a `name`), `setup()` and `cleanup()`. Reveal.js posts
// 'slide:start' to the iframe of the slide coming in and 'slide:stop' to the one
// going out (reveal/js/controllers/slidecontent.js), so the very same page runs
// inside the deck and standalone, which is how these pages get developed.

// Delay between 'slide:start' and setup(). Creating the WebGL context and
// compiling shaders while Reveal is still animating the transition makes the
// transition stutter, so we let it finish first. pages/sections2 had raised this
// to 600 in its own forked copy of this file; merging the two copies applies it
// everywhere. Lower it if the blank canvas on slide entry bothers you more than
// the stutter did.
const SETUP_DELAY_MS = 600;

if(window.self !== window.top) {

    // Reveal posts 'slide:start' more than once for the same slide: from the
    // iframe's own load event, from the slide change, and again from sync() on
    // every resize -- connecting a projector is enough to trigger one. Without
    // this guard the second one builds a second BABYLON.Engine on the same
    // canvas, leaving two render loops running while cleanup() disposes one.
    let started = false;

    addEventListener('message', msg => {
        if(msg.data == 'slide:start') {
            if(started) return
            started = true
            console.log("=========================")
            console.log("start:", "'"+slide.name+"'")
            console.log("=========================")
            setTimeout(() => { setup(); fitBuffersToScreen() }, SETUP_DELAY_MS)
        } else if(msg.data && msg.data.type == 'deck:scale') {
            // The deck's scale changed without this iframe's own layout size
            // changing, so no resize event fires in here: only the deck knows.
            deckScale = msg.data.scale
            fitBuffersToScreen()
        } else if(msg.data == 'slide:stop') {
            if(!started) return
            started = false
            console.log("=========================")
            console.log("stop:", "'"+slide.name+"'")
            console.log("=========================")
            cleanup()

        } else {
            console.log("=========================")
            console.log(msg)
            console.log("=========================")
        }
    })

    addEventListener("load", e=> {
        // typeof yields a string, so the original `typeof(slide) === undefined`
        // was always false and this check never fired.
        if(typeof slide === "undefined") {
            throw new Error("Undefined slide: this page must define a global `slide`")
        }
        console.log(slide.name, " loaded (slideshow)")
    })


} else {
    addEventListener("DOMContentLoaded", e=> {
        console.log("=========================")
        console.log("standalone")
        console.log("init & start")
        console.log("=========================")
        setup()
        fitBuffersToScreen()
    })
}


// ---------------------------------------------------------------------------
// Deck background.
//
// Every page's colours were originally chosen against Babylon's default slate
// grey, and moving the deck to white makes most of them unreadable: the
// polychora edges, for one, were a mid grey that lit up to nearly white.
//
// So the choice is a switch rather than a rewrite. Each page asks themed() for
// both values and keeps both in the source, which means SLIDE_THEME = 'dark'
// puts the whole deck back exactly as it was. Do not replace a themed() call
// with its light value alone: that is what throws the way back.
//
// bubbles is deliberately not themed. It draws its soap film with additive
// blending, which needs something dark to add light to.
// ---------------------------------------------------------------------------
const SLIDE_THEME = 'dark'           // 'light' | 'dark'

function themed(light, dark) { return SLIDE_THEME === 'light' ? light : dark }

function applySlideBackground(scene) {
    // Il valore scuro e' il #191919 del tema black di Reveal: se i due non
    // combaciano il riquadro dell'iframe si vede come una macchia piu' chiara
    // sulla slide, che e' il difetto per cui esisteva il bordo arancione.
    const c = themed([1, 1, 1], [0.098, 0.098, 0.098])
    // Color4.set takes four arguments. Called with three it leaves alpha
    // undefined, which has already bitten this project twice.
    scene.clearColor.set(c[0], c[1], c[2], 1)
}

// ---------------------------------------------------------------------------
// Sfondo sfumato.
//
// Un quadrilatero -- due triangoli -- figlio della camera e messo dietro a
// tutto, dimensionato per coprire il campo visivo, con il colore che sfuma fra
// i suoi quattro angoli. Sta qui e non in gutil.js perche' gutil.js e' forkato
// (libs/ contro pages/sections2/) e la funzione arriverebbe a metà delle slide,
// mentre questo file lo caricano tutte. E' la sorella ricca di
// applySlideBackground() qui sopra.
//
// La sfumatura la fa il fragment shader, non i colori sui vertici. Due triangoli
// interpolano linearmente un triangolo per volta, quindi se i quattro colori non
// soddisfano c0 + c2 == c1 + c3 lungo la diagonale resta una piega visibile:
// continua, ma non liscia. Leggendo i quattro angoli nello shader dalle uv si
// ottiene la bilineare vera con gli stessi due triangoli.
//
// Tre dettagli facili da sbagliare:
//   - isPickable = false. Diverse slide decidono cosa vuol dire un trascinamento
//     chiedendo pickInfo.pickedMesh, e un quadrilatero che copre tutta la vista
//     risponderebbe a ogni clic prendendosi il gesto.
//   - scrittura di profondita' spenta, test di profondita' acceso. Cosi' il
//     quadrilatero non puo' coprire niente in nessun ordine di disegno, e resta
//     comunque dietro perche' e' piu' lontano del contenuto.
//   - la dimensione si ricalcola quando cambiano rapporto d'aspetto, fov o
//     fovMode. Il rapporto puo' cambiare senza un resize: polychora-sections
//     alterna la sua camera fra il canvas intero e la meta'.
// ---------------------------------------------------------------------------

const NOME_SHADER_SFONDO = 'sfondoSfumato'

// Registrati alla prima chiamata e non al caricamento del file, cosi' common.js
// non pretende che BABYLON esista quando viene eseguito. Oggi babylon e' il primo
// script in tutte le pagine, ma non c'e' niente che lo imponga.
function registraShaderSfondo() {
    if(BABYLON.Effect.ShadersStore[NOME_SHADER_SFONDO + 'VertexShader']) return

    BABYLON.Effect.ShadersStore[NOME_SHADER_SFONDO + 'VertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    void main(void) {
        vUV = uv;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`

    BABYLON.Effect.ShadersStore[NOME_SHADER_SFONDO + 'FragmentShader'] = `
    precision highp float;
    varying vec2 vUV;
    uniform vec3 coloreAS, coloreAD, coloreBS, coloreBD;
    void main(void) {
        vec3 alto  = mix(coloreAS, coloreAD, vUV.x);
        vec3 basso = mix(coloreBS, coloreBD, vUV.x);
        gl_FragColor = vec4(mix(basso, alto, vUV.y), 1.0);
    }
`
}

// colori: i quattro angoli, nell'ordine alto-sinistra, alto-destra,
// basso-sinistra, basso-destra. Ognuno un BABYLON.Color3 o un [r,g,b].
// Ripetendo lo stesso colore si ottiene una sfumatura verticale o orizzontale.
// Senza colori usa una sfumatura discreta ricavata dal tema.
// opzioni: { distance, name }
function createGradientBackground(camera, colori, opzioni) {
    registraShaderSfondo()
    const scene = camera.getScene()
    const opz = opzioni || {}
    const nome = opz.name || 'sfondo-sfumato'

    const c3 = v => Array.isArray(v) ? new BABYLON.Color3(v[0], v[1], v[2]) : v
    if(!colori) {
        // Due tavolozze scritte a mano invece di una formula intorno al colore
        // del tema. Il primo tentativo era una formula, e la sfumatura usciva
        // cosi' timida da sembrare tinta unita: in alto faceva (26,26,56) contro
        // un fondo (25,25,25), cioe' rosso e verde identici e solo il blu
        // diverso. Su un monitor luminoso o su un proiettore con neri mediocri
        // non si distingueva. L'ampiezza va tenuta larga: qui il rapporto di
        // luminanza fra alto e basso e' circa 6 a 1.
        colori = themed(
            [[1.00, 1.00, 1.00], [1.00, 1.00, 1.00], [0.78, 0.78, 0.86], [0.78, 0.78, 0.86]],
            [[0.20, 0.20, 0.31], [0.20, 0.20, 0.31], [0.03, 0.03, 0.05], [0.03, 0.03, 0.05]])
    }
    const angoli = colori.map(c3)

    const mesh = new BABYLON.Mesh(nome, scene)
    const vd = new BABYLON.VertexData()
    vd.positions = [-0.5, 0.5, 0,   0.5, 0.5, 0,   -0.5, -0.5, 0,   0.5, -0.5, 0]
    vd.uvs       = [0, 1,           1, 1,          0, 0,            1, 0]
    vd.indices   = [0, 2, 1,   1, 2, 3]
    vd.applyToMesh(mesh)

    const mat = mesh.material = new BABYLON.ShaderMaterial(nome + '-mat', scene,
        { vertex: NOME_SHADER_SFONDO, fragment: NOME_SHADER_SFONDO },
        { attributes: ['position', 'uv'],
          uniforms: ['worldViewProjection', 'coloreAS', 'coloreAD', 'coloreBS', 'coloreBD'] })
    mat.backFaceCulling = false        // il senso di avvolgimento non conta
    mat.disableDepthWrite = true

    mesh.setColours = nuovi => {
        const [as_, ad, bs, bd] = nuovi.map(c3)
        mat.setColor3('coloreAS', as_); mat.setColor3('coloreAD', ad)
        mat.setColor3('coloreBS', bs);  mat.setColor3('coloreBD', bd)
    }
    mesh.setColours(angoli)

    mesh.parent = camera
    mesh.isPickable = false

    // Abbastanza lontano da stare dietro a tutto -- un ordine di grandezza oltre
    // il contenuto di qualunque slide -- e comodamente dentro il frustum.
    const distanza = opz.distance !== undefined
        ? opz.distance
        : Math.max(camera.minZ * 4, camera.maxZ * 0.5)
    mesh.position.set(0, 0, distanza)

    let memoria = ''
    const adatta = () => {
        const aspetto = scene.getEngine().getAspectRatio(camera)
        const chiave = [aspetto, camera.fov, camera.fovMode, distanza].join('|')
        if(chiave === memoria) return
        memoria = chiave
        // fov e' verticale per default ma non sempre, e leggerlo per l'asse
        // sbagliato lascerebbe una striscia scoperta su un lato.
        let larghezza, altezza
        if(camera.fovMode === BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED) {
            larghezza = 2 * distanza * Math.tan(camera.fov * 0.5)
            altezza = larghezza / aspetto
        } else {
            altezza = 2 * distanza * Math.tan(camera.fov * 0.5)
            larghezza = altezza * aspetto
        }
        const margine = 1.02
        mesh.scaling.set(larghezza * margine, altezza * margine, 1)
    }
    adatta()
    const osservatore = scene.onBeforeRenderObservable.add(adatta)
    mesh.onDisposeObservable.add(() => scene.onBeforeRenderObservable.remove(osservatore))

    return mesh
}


// ---------------------------------------------------------------------------
// Matching the drawing buffer to the pixels the canvas really occupies.
//
// Reveal scales the whole deck with `transform: scale()`, and the browser then
// composites everything inside it as a texture. Its filter is bilinear -- four
// taps -- so past a 2x reduction it undersamples and *creates* the stair
// stepping it is meant to remove. Measured on the tesseract slide: the deck
// asked the compositor for a 3.89x reduction, and that page, the only one that
// supersampled, was the one that looked worst. The other pages sat at ~1.96x
// and looked fine.
//
// So the buffer is sized to exactly the pixels the canvas covers on screen. The
// compositor then maps it 1:1 and does not resample, and what is left on screen
// is Babylon's own MSAA and nothing else. Reveal's translate(-50%,-50%) can
// still land the layer on a fractional pixel offset, which can soften the image
// slightly; it cannot bring the stair stepping back.
// ---------------------------------------------------------------------------

// Scale pushed by the deck. Needed only when this page cannot read its own
// frameElement -- a deck opened from file:// is the case that matters, since
// Chrome gives each file an opaque origin and blocks the access.
let deckScale = null

function getRenderScale() {
    if(deckScale !== null) return deckScale
    try {
        const fe = window.frameElement
        if(fe && fe.clientWidth > 0) return fe.getBoundingClientRect().width / fe.clientWidth
    } catch(e) {
        // cross-origin parent: wait for the deck to push the value
    }
    return 1
}

// Render 2x the pixels the canvas covers, when that fits, and 1x when it does
// not. 2:1 is the one reduction the compositor's four-tap filter handles
// properly -- each output pixel is the average of a 2x2 block -- so it buys real
// supersampling on top of the MSAA. Anything between 1 and 2 lands on a
// half-pixel grid and anything past 2 undersamples, which is what made the
// tesseract slide jagged in the first place.
//
// A cap is needed because the cost is the square: full screen at 1920 the
// doubling would ask for a 3840-wide buffer, four times the fragments, and the
// heavy slides (720 soap films, the 120-cell) run on integrated graphics.
const SUPERSAMPLING_MAX_LATO = 2048

function fitBuffersToScreen() {
    if(typeof BABYLON === "undefined" || !BABYLON.EngineStore) return
    const scala = getRenderScale() * (window.devicePixelRatio || 1)
    BABYLON.EngineStore.Instances.forEach(engine => {
        const canvas = engine.getRenderingCanvas()
        if(!canvas) return
        const latoFisico = Math.max(canvas.clientWidth, canvas.clientHeight) * scala
        const fattore = (latoFisico * 2 <= SUPERSAMPLING_MAX_LATO) ? 2 : 1
        engine.setHardwareScalingLevel(1 / (scala * fattore))
        engine.resize()
    })
}

addEventListener("resize", fitBuffersToScreen)

function subrange(x,a,b) { return x<=a?0:x>=b?1:(x-a)/(b-a); } 
function smooth(x) { return x*x*(3-2*x); }
