class PolychoronData {
    constructor() {
        
    }
}


PolychoronData.p8 = (() => {
    const r = 1
    let pc = new PolychoronData()
    pc.vertices = []
    for(let i=0; i<16; i++) {
        let p = new BABYLON.Vector4(
            (((i>>0)&1)*2-1)*r,
            (((i>>1)&1)*2-1)*r,
            (((i>>2)&1)*2-1)*r,
            (((i>>3)&1)*2-1)*r)
        pc.vertices.push(p)
    }
    pc.edges = []
    for(let i=0; i<16; i++) {
        for(let j=0; j<4; j++) {
            let d = 1<<j
            if((i&d)==0) pc.edges.push([i, i+d])
        }
    }
    return pc

})()


