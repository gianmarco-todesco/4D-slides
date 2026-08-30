"use strict";

const MASCHERA_SEZIONE  = 0x1
const MASCHERA_SCHLEGEL = 0x2

const slide = {
    name:"4D sections",

    // Framing. Sharing the canvas costs the section half its width, so the
    // camera moves closer rather than further: measured against the panel, a
    // radius of 4 left the section looking lost inside its half.
    raggioSingolo: 4,
    raggioDoppio: 3.4,

    // The Schlegel projection: eye on the w axis at -distanza, looking at w = 0.
    // The closer distanza is to the polychoron, the more nested the picture.
    distanzaSchlegel: 1.15,
    fuocoSchlegel: 2.4,
    raggioSchlegel: 8.2,

    // Where the diagram is being looked at from. Kept here rather than read back
    // off the camera because Babylon routes a stray move to the other camera
    // when the pointer crosses between the two viewports mid-drag, and the
    // diagram would drift a few degrees on gestures that had nothing to do with
    // it. tick() writes these onto the camera every frame, so it moves when we
    // move it and at no other time.
    vistaSchlegel: { alpha: 1.1, beta: 1.25 },
    spessoreSchlegel: 0.055
}

function setup() {
    const canvas = slide.canvas = document.getElementById("renderCanvas")
    const engine = slide.engine = new BABYLON.Engine(canvas, true)
    const scene = slide.scene = new BABYLON.Scene(engine)
    applySlideBackground(scene)

    // Two panels in one scene: the section on the left, the Schlegel diagram of
    // the polychoron on the right. Two cameras with their own viewport rather
    // than two canvases, so there is still one engine and one render loop.
    //
    // The section stays on the LEFT on purpose: the drag that moves the section
    // plane lives in the leftmost 100 px, and putting the diagram there would
    // have meant changing that gesture.
    const camera = slide.camera = new BABYLON.ArcRotateCamera("Camera",
        1.5, 1.38, 4,
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 2
    camera.layerMask = MASCHERA_SEZIONE

    // Only this camera drives the pointer; the other mirrors it. One set of
    // controls, and picking has a single unambiguous answer.
    scene.cameraToUseForPointers = camera

    // The diagram keeps its own 3D camera. Dragging on the right panel turns
    // the picture and nothing else: the polychoron itself stays in its canonical
    // 4D orientation there, which is the whole point of that panel.
    const cameraSchlegel = slide.cameraSchlegel = new BABYLON.ArcRotateCamera(
        "CameraSchlegel", slide.vistaSchlegel.alpha, slide.vistaSchlegel.beta, slide.raggioSchlegel,
        new BABYLON.Vector3(0,0,0), scene)
    cameraSchlegel.wheelPrecision = 20
    cameraSchlegel.lowerRadiusLimit = 3
    cameraSchlegel.layerMask = MASCHERA_SCHLEGEL

    scene.activeCameras = [camera, cameraSchlegel]
    
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 10, 1), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    disponiPannelli()

    scene.registerBeforeRender(tick)

    // After the render, not before: Babylon applies the camera inputs after
    // onBeforeRender, so anything written in tick() would be undone in the same
    // frame. Stamping our own value here is what keeps the diagram still when
    // a drag that started on the left wanders across into the right panel.
    scene.onAfterRenderObservable.add(() => {
        const cs = slide.cameraSchlegel, v = slide.vistaSchlegel
        cs.alpha = v.alpha
        cs.beta = v.beta
        cs.radius = slide.raggioSchlegel
        cs.inertialAlphaOffset = 0
        cs.inertialBetaOffset = 0
        cs.inertialRadiusOffset = 0
    })
    scene.onKeyboardObservable.add(onKeyEvent);
    handlePointer()

    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", onResize)
}

function cleanup() {
    window.removeEventListener("resize", onResize)
    slide.engine.stopRenderLoop()
    slide.scene.dispose()
    delete slide.scene
    slide.engine.dispose()
    delete slide.engine    
}

function onResize() {
    slide.engine.resize()
}


function populateScene() {
    const scene = slide.scene
    slide.model = new PolychoronSectionModel('model',PolychoronData.p8, scene)
    slide.model.matrix = BABYLON.Matrix.Identity();
    // The identity matrix is deliberate -- it makes the opening section a clean
    // axis-aligned cube -- but it puts every vertex at w = +-0.5, and the
    // constructor leaves w0 at 0.5, which is the very top of that range: no edge
    // is crossed and the panel opens empty. adjustw() cannot help, it only nudges
    // w0 off a vertex layer.
    slide.model.w0 = 0.2;
    slide.model.update();
    applicaMaschera(slide.model, MASCHERA_SEZIONE)

    slide.schlegel = new PolychoronSchlegelModel('schlegel', PolychoronData.p8, scene)
}

// Both models are built on GeometricModel, which creates its instances lazily as
// vertices and edges are added, so the mask has to be reapplied after every
// rebuild rather than set once at construction.
function applicaMaschera(model, maschera) {
    const tocca = m => { if(m) m.layerMask = maschera }
    tocca(model.pivot); tocca(model.dot); tocca(model.edge); tocca(model.facesMesh)
    model.vertices.forEach(tocca)
    model.edges.forEach(tocca)
}

// The diagram is shown only where it can be read. With 720 and 1200 edges the
// 600-cell and the 120-cell come out as a ball of wool, so for those the
// section takes the whole canvas back.
function disponiPannelli() {
    const V = BABYLON.Viewport
    const doppio = slide.schlegel && slide.schlegel.visibile
    slide.camera.viewport = doppio ? new V(0, 0, 0.5, 1) : new V(0, 0, 1, 1)
    slide.cameraSchlegel.viewport = doppio ? new V(0.5, 0, 0.5, 1) : new V(0, 0, 0, 0)
    slide.camera.radius = doppio ? slide.raggioDoppio : slide.raggioSingolo
}

let stop = false

function tick() {
    if(slide.assetController) {
        if(!slide.assetController.tick()) slide.assetController = null;
    }

    // The diagram is rebuilt when the section moves. Rather than hunt down every
    // place that moves it -- the w0 drag, the rotation drag, setShape, the
    // AssetController -- watch what the section model actually holds. The two
    // cameras are NOT linked: only the cut points travel from one panel to the
    // other, not the point of view.
    const m = slide.model, s = slide.schlegel
    if(s && s.visibile &&
       (s.w0Ultimo !== m.w0 || !s.matriceUltima || !m.matrix.equals(s.matriceUltima))) {
        s.update(m.matrix, m.w0)
    }
}

// ============================================================================

function handlePointer() {
    let status = 0
    let oldx, oldy

    // Crossing from one viewport to the other makes Babylon synthesise a
    // POINTERUP followed by a POINTERDOWN, so a drag that began on the left and
    // wandered right would quietly turn into a drag on the diagram halfway
    // through. The DOM sees the truth -- one press, one release -- so the start
    // and the end of a gesture are taken from there, and which panel it belongs
    // to is settled once.
    let bottonePremuto = false
    let gestoIniziato = false
    slide.canvas.addEventListener('pointerdown', () => {
        bottonePremuto = true; gestoIniziato = false
    }, true)
    slide.canvas.addEventListener('pointerup', () => { bottonePremuto = false }, true)
    slide.canvas.addEventListener('pointercancel', () => { bottonePremuto = false }, true)
    slide.scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onpointerdown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                onpointerup(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(status != 0) onpointerdrag(pointerInfo)
                break
        }
    });
    // Which panel the pointer went down in decides everything that follows.
    function cameraDelPannello(offsetX) {
        const doppio = slide.schlegel && slide.schlegel.visibile
        if(doppio && offsetX >= slide.canvas.clientWidth * 0.5) return slide.cameraSchlegel
        return slide.camera
    }

    function onpointerdown(pointerInfo) {
        if(gestoIniziato) return
        gestoIniziato = true

        const x = pointerInfo.event.offsetX

        // Dragging on the right turns the diagram and nothing else: it is fixed
        // in 4D on purpose. Its camera is driven by hand here rather than with
        // attachControl, because Babylon will not hand its pointer control from
        // one camera to another in the middle of a gesture that has already
        // begun -- try it and both cameras orbit at once.
        if(cameraDelPannello(x) !== slide.camera) status = 3
        else if(x < 100) status = 1
        else if(pointerInfo.pickInfo.pickedMesh) status = 2

        if(status != 0) {
            // The gesture is ours, so the section camera must not orbit through
            // it. Detached at once, not on a later turn of the loop: deferring it
            // let the opening moves orbit as well as turn the solid.
            slide.camera.detachControl(slide.canvas)
            oldx = x
            oldy = pointerInfo.event.offsetY
        }
    }
    function onpointerup(pointerInfo) {
        if(bottonePremuto) return          // sintetico: il dito e' ancora giu'
        gestoIniziato = false
        if(status == 0) return
        status = 0
        slide.camera.attachControl(slide.canvas, true);
    }
    function onpointerdrag(pointerInfo) {
        
        let x = pointerInfo.event.offsetX
        let y = pointerInfo.event.offsetY
        let dx = x-oldx
        let dy = y-oldy
        oldx = x
        oldy = y
        if(status==1) {
            slide.model.w0 += dy * 0.01
            slide.model.update()  
        }
        else if(status == 3) {
            const v = slide.vistaSchlegel
            v.alpha -= dx * 0.006
            v.beta = Math.max(0.02, Math.min(Math.PI - 0.02, v.beta - dy * 0.006))
        }
        else if(status == 2) {

            slide.model.matrix = slide.model.matrix.multiply(getRotation(0,3,dx*0.01))
            slide.model.matrix = slide.model.matrix.multiply(getRotation(1,3,dy*0.01))
            slide.model.update()
            /*
            const RotX = BABYLON.Matrix.RotationX
            const RotZ = BABYLON.Matrix.RotationZ
           
            slide.model.matrix = 
                slide.model.matrix
                .multiply(RotZ(dx*0.01))
                .multiply(RotX(dy*0.01))                
            slide.model.update()
            */

        }
    }

}


function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(49<=key && key<=49+9) {
                let data 
                if(key == 49) data = PolychoronData.p5
                else if(key == 50) data = PolychoronData.p8
                else if(key == 51) data = PolychoronData.p16
                else if(key == 52) data = PolychoronData.p24
                else if(key == 53) data = PolychoronData.p120
                else if(key == 56) data = PolychoronData.p600
                else break;
                slide.model.setShape(data)
                applicaMaschera(slide.model, MASCHERA_SEZIONE)
                slide.schlegel.setShape(data)
                disponiPannelli()
            }
            // v, e, f, c turn the polychoron in 4D so that a vertex, an edge, a
            // face or a cell is what the sectioning space meets first.
            else if("vefc".indexOf(kbInfo.event.key) >= 0 && kbInfo.event.key.length == 1) {
                slide.assetController = new AssetController(slide.model);
                slide.assetController.puntaSu(kbInfo.event.key);
            }
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            // console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}

// ============================================================================

// The Schlegel diagram, and the section drawn inside it.
//
// This replaces PolychoronSimpleModel, which sat here unused and already did the
// projection: a central projection from a point on the w axis, which sends the
// cell nearest the eye out to the boundary and nests the others inside it. For
// the tesseract that is the cube-within-a-cube picture.
//
// Two GeometricModels, because each one carries a single dot material and a
// single edge material and the two layers want different weights:
//   base     the polychoron itself, pale and thin, staying out of the way
//   sezione  the points where the hyperplane cuts the edges, and the polygons
//            they trace -- the same solid that the other panel shows in full
class PolychoronSchlegelModel {
    constructor(name, data, scene) {
        this.scene = scene
        this.base = new GeometricModel(name + '-base', scene)
        this.sezione = new GeometricModel(name + '-sez', scene)

        this.base.dot.material.diffuseColor.set(...themed([0.62,0.58,0.70],[0.5,0.5,0.6]))
        this.base.edge.material.diffuseColor.set(...themed([0.72,0.70,0.78],[0.45,0.45,0.55]))
        this.sezione.dot.material.diffuseColor.set(...themed([0.85,0.25,0.15],[1.0,0.45,0.3]))
        // Same teal the section model uses for its own edges: it is literally
        // the same solid as the one in the other panel, and the eye should
        // join the two without being told.
        this.sezione.edge.material.diffuseColor.set(...themed([0.30,0.60,0.60],[0.4,0.8,0.8]))

        this.w0Ultimo = undefined
        this.matriceUltima = undefined
        this.setShape(data)
    }

    setShape(data) {
        this.data = data
        // Keys 1-4 only: the 120-cell and the 600-cell are unreadable here.
        this.visibile = data.cells.length <= 24
        this.w0Ultimo = undefined
        this.matriceUltima = undefined
    }

    // Central projection from (0,0,0,-distanza) onto the hyperplane w = 0.
    proietta(p4) {
        const k = slide.fuocoSchlegel / (slide.distanzaSchlegel + p4.w)
        return new BABYLON.Vector3(p4.x*k, p4.y*k, p4.z*k)
    }

    update(matrix, w0) {
        const T = BABYLON.Vector4.Transform
        const data = this.data

        // The diagram always draws the polychoron in its canonical orientation,
        // so it is built from the vertices as they come, with no rotation: for
        // the tesseract that is always the big cube with the small one inside.
        //
        // The 4D rotation still decides which edges the hyperplane crosses and
        // how far along, because that is a fact about the solid rather than
        // about how we choose to draw it. Only the w values need rotating.
        const w = data.vertices.map(p => T(matrix, p).w)
        const pts = data.vertices.map(p => this.proietta(p))

        const rV = slide.spessoreSchlegel, rE = rV * 0.45

        this.base.beginUpdate()
        pts.forEach(p => this.base.addVertex(p, rV))
        data.edges.forEach(([a,b]) => this.base.addEdge(pts[a], pts[b], rE))
        this.base.endUpdate()

        // Where the hyperplane cuts an edge. s is worked out from the rotated w
        // values, then the point is placed at that same fraction along the
        // UNROTATED edge: same point of the solid, drawn in the canonical
        // diagram.
        const tagli = {}
        const m = data.vertices.length
        this.sezione.beginUpdate()
        data.edges.forEach(([a,b]) => {
            if((w[a] - w0) * (w[b] - w0) >= 0) return
            const s = (w0 - w[a]) / (w[b] - w[a])
            const va = data.vertices[a], vb = data.vertices[b]
            const q = new BABYLON.Vector4(
                va.x + (vb.x - va.x) * s,
                va.y + (vb.y - va.y) * s,
                va.z + (vb.z - va.z) * s,
                va.w + (vb.w - va.w) * s)
            tagli[a*m + b] = tagli[b*m + a] = this.proietta(q)
        })
        Object.values(tagli).forEach(p => this.sezione.addVertex(p, rV * 1.7))

        // A plane meets the boundary of a convex polygon in exactly two points,
        // so a face contributes either one edge of the section or none at all.
        data.faces.forEach(f => {
            let a = f[f.length-1]
            const q = []
            f.forEach(b => {
                const p = tagli[a*m + b]
                if(p !== undefined) q.push(p)
                a = b
            })
            if(q.length === 2) this.sezione.addEdge(q[0], q[1], rE * 1.6)
        })
        this.sezione.endUpdate()

        applicaMaschera(this.base, MASCHERA_SCHLEGEL)
        applicaMaschera(this.sezione, MASCHERA_SCHLEGEL)

        this.w0Ultimo = w0
        this.matriceUltima = matrix.clone()
    }
}


BABYLON.Vector4.Transform = function(mat, v4) {
    const m = mat.m
    return new BABYLON.Vector4(
        m[ 0]*v4.x + m[ 1]*v4.y + m[ 2]*v4.z + m[ 3]*v4.w,
        m[ 4]*v4.x + m[ 5]*v4.y + m[ 6]*v4.z + m[ 7]*v4.w,
        m[ 8]*v4.x + m[ 9]*v4.y + m[10]*v4.z + m[11]*v4.w,
        m[12]*v4.x + m[13]*v4.y + m[14]*v4.z + m[15]*v4.w)
}

class PolychoronSectionModel extends GeometricModel {
    constructor(name, data, scene) {
        super(name,scene,true); // colorsEnabled = true
        this.data = data
        this.matrix = BABYLON.Matrix.Identity()
        this.w0 = 0.

        this.edge.material.diffuseColor.set(0.3,0.6,0.6)
        this.dot.material.diffuseColor.set(0.3,0.6,0.6)
        this.facesMesh.material.diffuseColor.set(1,1,1,1);

        let theta = Math.PI*0.25
        let csTheta = Math.cos(theta)
        let snTheta = Math.sin(theta)
    
        let arr = [
            csTheta,0,0,-snTheta,
            0,1,0,0,
            0,0,1,0,
            snTheta,0,0,csTheta
            ]
        this.matrix = BABYLON.Matrix.FromArray(arr)

        theta = Math.PI*0.33
        csTheta = Math.cos(theta)
        snTheta = Math.sin(theta)
        arr = [
            1,0,0,0,
            0,csTheta,0,-snTheta,
            0,0,1,0,
            0,snTheta,0,csTheta
            ]
        this.matrix = this.matrix.multiply(BABYLON.Matrix.FromArray(arr)) 

        arr = [
            1,0,0,0,
            0,1,0,0,
            0,0,csTheta,-snTheta,
            0,0,snTheta,csTheta
            ]
        this.matrix = this.matrix.multiply(BABYLON.Matrix.FromArray(arr)) 

        this.w0 = 0.5

        this.update()
    }


    setShape(data) {
        this.data = data
        this.matrix = BABYLON.Matrix.Identity()
        this.w0 = 0.
        this.update()
    }

    setCellColors() {
        let ws = this.data.cells.map((c,i) => 
            BABYLON.Vector4.Transform(this.matrix, this.data.getCellCenter(i)).w);
        let wmin = ws[0], wmax = ws[0];
        for(let i=1;i<ws.length;i++) {
            let w = ws[i];
            wmin = Math.min(wmin,w);
            wmax = Math.max(wmax,w);
        }
        this.cellColors = ws.map(w=>HSVtoRGB((2/3)*(w-wmin)/(wmax-wmin),1,1))
    }

    update() {
        const me = this
        const mat = this.matrix
        
        const Transform = BABYLON.Vector4.Transform
        const pts4 = this.data.vertices.map(p=>Transform(mat,p))
        let w0 = this.adjustw(this.w0, pts4);
        this.setCellColors();
        
        // compute edge points : intersections along edges. edgePoints = [(a,b,p),...]
        let edgePoints = this.computeEdgeIntersections(w0, pts4)

        // add vertices 

        me.beginUpdate()

        const thickness = 0.01

        // pts = new points; tb[edgeId] => point index
        const pts = []
        const tb = {}
        const m = pts4.length
        edgePoints.forEach(([a,b,p])=> { 
            const j = me.addVertex(p,thickness)
            tb[a*m+b] = tb[b*m+a] = j
            pts.push(p)
        })

        // add edges
        // faceTable[faceIndex] => [a,b]; a,b indices of new points
        const faceTable = {}
        this.data.faces.forEach((f,faceIndex) => {
            let a = f[f.length-1]
            const js = []
            f.forEach(b => {
                if((pts4[a].w-w0)*(pts4[b].w-w0)<0) {
                    js.push(tb[a*m+b])
                }
                a = b
            })
            if(js.length >= 2) {
                me.addEdge(pts[js[0]], pts[js[1]], thickness)
                faceTable[faceIndex] = [js[0], js[1]]
            }
        })

        // add faces
        this.data.cells.forEach((cellFaces,cellIdx) => {
            const links = {}
            let v
            cellFaces.forEach(faceIndex => {
                let ab = faceTable[faceIndex]
                if(ab !== undefined) {
                    const [a,b] = ab
                    if(links[a]===undefined) links[a]=[b]; else links[a].push(b)
                    if(links[b]===undefined) links[b]=[a]; else links[b].push(a)
                    v = a
                }
            })
            if(v !== undefined) {
                const v0 = v
                const facePts = [pts[v]]
                let v1 = links[v][0]
                while(v1 !=v0) {
                    facePts.push(pts[v1])
                    let v2 = links[v1][0]==v ? links[v1][1] : links[v1][0]
                    v=v1; v1=v2
                }
                if(facePts.length>=3) {
                    me.addFace(facePts, this.cellColors[cellIdx])

                }
            }
        })
        
        this.endUpdate()
    }

    adjustw(w0,pts) {
        if(pts.filter(p=>p.w==w0).length==0) {
            // w0 not present in pts[]: no problem
            return w0
        } else {
            const epsilon = 0.00001
            let lst = pts.filter(p=>p.w>w0)
            if(lst.length == 0) {
                // no w>w0
                return w0 + epsilon
            } else {
                let w = lst.reduce((a,b)=>a.w<b.w?a:b).w
                return Math.min(w0 + epsilon, (w0 + w)*0.5)
            }
        }
    }

    computeEdgeIntersections(w0, pts4) {
        // return [(a,b,p),...]        
        return this.data.edges.map(([a,b]) => {
            let wa = pts4[a].w
            let wb = pts4[b].w
            if((wa-w0)*(wb-w0)<0) {
                let p = BABYLON.Vector3.Lerp(
                    pts4[a].toVector3(),
                    pts4[b].toVector3(),
                    (w0-wa)/(wb-wa))
                return [a,b,p]
            } else {
                return undefined
            }
        }).filter(p=>p!==undefined)
    } 
}


class AssetController {
    constructor(model) {
        this.model = model;
        this.v2 = new BABYLON.Vector4(0,0,0,-1);
        this.t = 1.0;
    }
    setTargetPoints(pts) {
        const model = this.model;
        this.startMatrix = model.matrix.clone();
        this.t = 0;
        this.v1 = BABYLON.Vector4.Transform(model.matrix, pts[0]);
        this.vIndex = 0;
        for(let i=1;i<pts.length;i++) {
            let v = BABYLON.Vector4.Transform(model.matrix, pts[i]);
            // Was `v.w < this.v1`, a number against a Vector4: never true. So it
            // always took pts[0] and swung it all the way round, however far it
            // happened to be. Comparing the w's picks the feature that is
            // already nearest, which is the short way there.
            if(v.w < this.v1.w) { this.v1 = v; this.vIndex = i; }
        }
        return this.vIndex;
    }

    // Bring a vertex, an edge, a face or a cell to meet the sectioning space
    // first. The three new ones are just the averages of the points involved.
    puntaSu(tasto) {
        const data = this.model.data;
        const media = idx => {
            const c = new BABYLON.Vector4(0,0,0,0);
            idx.forEach(i => c.addInPlace(data.vertices[i]));
            return c.scaleInPlace(1/idx.length);
        };
        if(tasto === 'v') return this.setTargetPoints(data.vertices);
        if(tasto === 'e') return this.setTargetPoints(data.edges.map(media));
        if(tasto === 'f') return this.setTargetPoints(data.faces.map(media));
        return this.setTargetPoints(data.cells.map((c,i) => data.getCellCenter(i)));
    }
    setParam(t) {
        this.t = t;
        let mat = getRotationFromVectors(this.v1, this.v2, this.t);
        this.model.matrix = mat.multiply(this.startMatrix);
        this.model.update();        
    }
    tick() {
        if(this.t >= 1.0) return false;
        this.setParam(Math.min(1.0, this.t + 0.01));
        return this.t<1.0;
    }
}
