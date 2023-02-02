"use strict";

function getParameter(t, t0,t1) {
    return t<t0?0:t>t1?1:(t-t0)/(t1-t0);
}

class Vertex {
    constructor(idx) { 
        this.idx = idx; 
        this.isVisible = false;
        this.isNew = false;
        this.ts = [];
    }
}

class Edge {
    constructor(va,vb) { 
        this.va = va; 
        this.vb = vb; 
        this.isVisible = false;
        this.isNew = false;
    }
}

class Hypercube {
    constructor(maxDim = 5) {
        this.maxDim = maxDim;
        this._build();
        this.currentDim = this.targetDim = 2.0;
        
    }

    _build() {
        const maxDim = this.maxDim;
        // 2^maxDim vertici; ogni vertice ha un numero d'ordine (v.idx)
        const vertices = this.vertices = Array(1<<maxDim).fill().map((_,i)=>new Vertex(i));
        // creo gli spigoli
        this.edges = [];
        // per ogni vertice ... 
        vertices.forEach(v => {
            v.ts = Array(maxDim).fill(0);
            // per ogni dimensione (se il bit corrispondente è a 0)
            for(let j=0;j<maxDim;j++) {
                let otherIdx = v.idx | (1<<j);
                if(otherIdx != v.idx) {
                    // creo uno spigolo fra v.idx e otherIdx
                    this.edges.push(new Edge(v, vertices[otherIdx]));
                }
            }
        })

    }

    get targetDim() { return this._targetDim; }
    set targetDim(d) {
        this._targetDim = d;
    }

    get currentDim() { return this._currentDim; }
    set currentDim(d) {
        this._currentDim = d;
        let floorD = this.floorD = Math.floor(d);
        let ceilD = this.ceilD = Math.ceil(d);
        let t = d - floorD;
        let parameter = this.parameter = getParameter(t, 0, 0.8);
        this.endParameter = getParameter(t, 0.8, 1.0);
        const lowerLimit = 1<<floorD;
        const upperLimit = 1<<ceilD;
        const maxDim = this.maxDim;
        this.vertices.forEach(v => {
            v.isVisible = v.idx<upperLimit;
            v.isNew = lowerLimit <= v.idx && v.idx<upperLimit; 
            for(let i=0; i<maxDim; i++) {
                let t = i<floorD ? 1.0 : i>floorD ? 0.0 : parameter;
                v.ts[i] = t * (2*((v.idx>>i)&1)-1); 
            }
        });
        this.edges.forEach(e => {
            e.isVisible = e.va.idx<upperLimit && e.vb.idx<upperLimit;
            e.isNew = e.isVisible && (e.va.idx>=lowerLimit || e.vb.idx>=lowerLimit);
        });
    }
    
    tick(dt = 0.050) {
        const transitionTime = 2.5; // seconds to change dimension
        const ds = dt / transitionTime;
        if(this._currentDim < this._targetDim) {
            this.currentDim = Math.min(this._targetDim, this._currentDim + ds);
        } else if(this._currentDim > this._targetDim) {
            this.currentDim = Math.max(this._targetDim, this._currentDim - ds);
        } else return false;
        return true;
    } 
}
