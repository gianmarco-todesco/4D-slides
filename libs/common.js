"use strict";
    
if(location.search.indexOf('slide')>=0) {
    let status = 0
    addEventListener('message', msg => {
        if(msg.data == 'slide:start') {
                console.log("=========================")
                console.log("start")
                console.log("=========================")
                if(status==0) { initialize(); status = 1;}
                start()

        } else if(msg.data == 'slide:stop') {
            console.log("=========================")
            console.log("stop")
            console.log("=========================")
            stop()

        } else {
            console.log("=========================")
            console.log(msg)
            console.log("=========================")
        }
    })

    addEventListener("DOMContentLoaded", e=> {
        console.log("=========================")
        console.log("DOMContentLoaded")
        console.log("=========================")
    })


} else {
    addEventListener("DOMContentLoaded", e=> {
        console.log("=========================")
        console.log("standalone")
        console.log("init & start")
        console.log("=========================")
        initialize()
        start()
    })
}