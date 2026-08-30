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
const SLIDE_THEME = 'light'          // 'light' | 'dark'

function themed(light, dark) { return SLIDE_THEME === 'light' ? light : dark }

function applySlideBackground(scene) {
    const c = themed([1, 1, 1], [0.2, 0.2, 0.3])
    // Color4.set takes four arguments. Called with three it leaves alpha
    // undefined, which has already bitten this project twice.
    scene.clearColor.set(c[0], c[1], c[2], 1)
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

function fitBuffersToScreen() {
    if(typeof BABYLON === "undefined" || !BABYLON.EngineStore) return
    const level = 1 / (getRenderScale() * (window.devicePixelRatio || 1))
    // Babylon removes an engine from Instances when it is disposed, so every
    // entry here is live.
    BABYLON.EngineStore.Instances.forEach(engine => {
        engine.setHardwareScalingLevel(level)
        engine.resize()
    })
}

addEventListener("resize", fitBuffersToScreen)

function subrange(x,a,b) { return x<=a?0:x>=b?1:(x-a)/(b-a); } 
function smooth(x) { return x*x*(3-2*x); }
