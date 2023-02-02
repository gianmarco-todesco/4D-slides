"use strict";


if(window.self !== window.top) {
    let status = 0
    addEventListener('message', msg => {
        if(msg.data == 'slide:start') {
            console.log("=========================")
            console.log("start:", "'"+slide.name+"'")
            console.log("=========================")
            setTimeout(setup, 600)
        } else if(msg.data == 'slide:stop') {
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
        if(typeof(slide) === undefined) {
            throw "Undefined slide"
        }
        const name = slide.name
        console.log(name, " loaded (slideshow)")
    })


} else {
    addEventListener("DOMContentLoaded", e=> {
        console.log("=========================")
        console.log("standalone")
        console.log("init & start")
        console.log("=========================")
        setup()
    })
}


function subrange(x,a,b) { return x<=a?0:x>=b?1:(x-a)/(b-a); } 
function smooth(x) { return x*x*(3-2*x); }

