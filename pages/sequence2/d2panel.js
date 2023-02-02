class D2Panel {
    constructor(container, hypercube) {
        this.container = container;
        this.hypercube = hypercube;
        this.maxDim = Math.min(5, hypercube.maxDim);
        let panel = this.panel = document.createElement('div');
        panel.classList.add('d2-panel');
        let canvas = this.canvas = document.createElement('canvas');
        panel.appendChild(canvas);
        canvas.style.width = "95%";
        canvas.style.height = "95%";
        this.ctx = canvas.getContext('2d');   
        container.appendChild(panel);
        this.vertices = hypercube.vertices.map(v=>({x:0, y:0, idx:v.idx, hv:v}));
        this.base = Array(5).fill().map(()=>[0,0]);
        this.labels = [
            "punto",
            "segmento",
            "quadrato",
            "cubo",
            "4-ipercubo",
            "5-ipercubo"
        ];
    }
    
    repaint() {
        const { canvas, ctx } = this;
        const width = canvas.width = canvas.clientWidth;
        const height = canvas.height = canvas.clientHeight;
        ctx.clearRect(0,0,width,height);        
        this.computeBase();
        this.computePoints();
        this.drawEdges();
        this.drawPoints();
        this.drawLabel();
    }

    computeBase() {
        const base = this.base;
        const unit = 60.0;
        function setBase(i,p,t=1) { base[i][0] = p[0]*unit*t; base[i][1] = p[1]*unit*t; }
        function getDir(phi) { return [Math.cos(phi), Math.sin(phi)]; }
        let v45 = getDir(Math.PI/4);
        const floorD = this.hypercube.floorD;
        const param = this.hypercube.parameter;
        if(floorD == 0) {
            setBase(0,[1,0],param);
            for(let i=1;i<5;i++) setBase(i,[0,0]);
        } else if(floorD == 1) {
            setBase(0,[1,0] );
            setBase(1,[0,1], param);
            for(let i=2;i<5;i++) setBase(i,[0,0]);
        } else if(floorD == 2) {
            setBase(0,[1,0]);
            setBase(1,[0,1]);
            setBase(2,v45, param*0.5);
            for(let i=3;i<5;i++) setBase(i,[0,0]);
        } else if(floorD == 3) {
            setBase(0,[1,0]);
            setBase(1,[0,1]);
            setBase(2,v45, (1+param)*0.5);
            setBase(3,[-v45[0],v45[1]], param);
            for(let i=4;i<5;i++) setBase(i,[0,0]);
        } else if(floorD >= 4) {
            let t = floorD == 4 ? param : 1;
            const u = Math.PI/5;
            // let psi = t*2*Math.PI/5;
            setBase(0,getDir(0));
            setBase(1,getDir((1-t) * Math.PI/2 + t * 2 * u));
            setBase(2,getDir((1-t) * Math.PI/4 + t * 1 * u));
            setBase(3,getDir((1-t) * 3*Math.PI/4 + t*4*u));
            setBase(4,getDir(3*u), t);
        } else if(floorD == 5) {
            const u = Math.PI/5;
            setBase(0,[1,0]);
            setBase(1,getDir(2*u));
            setBase(2,getDir(1*u));
            setBase(3,getDir(4*u));
            setBase(4,getDir(3*u),0);

        }
    }

    computePoints() {
        const maxDim = this.maxDim;
        const { canvas, base }  = this;
        
        this.vertices.forEach(v => {
            v.x = canvas.clientWidth/2;
            v.y = canvas.clientHeight/2;
            for(let d=0; d<maxDim; d++) {
                let sgn = -1 + 2*((v.idx>>d)&1);
                v.x += sgn * base[d][0];
                v.y += sgn * base[d][1];
            }
        })
    }

    drawEdges() {
        const ctx = this.ctx;
        ctx.beginPath();
        this.hypercube.edges.filter(e=>e.isVisible).forEach(e=>{
            let pa = this.vertices[e.va.idx];
            let pb = this.vertices[e.vb.idx];
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
        })
        ctx.lineWidth = 1;
        ctx.strokeStyle = "gray";
        ctx.stroke();
    }
    drawPoints() {
        const ctx = this.ctx;
        ctx.beginPath();
        const r = 4;
        this.hypercube.vertices.filter(e=>e.isVisible).forEach(v=>{
            let p = this.vertices[v.idx];
            ctx.moveTo(p.x+r, p.y);
            ctx.arc(p.x,p.y,r,0,Math.PI*2);
        })
        ctx.fillStyle = "#F88";
        ctx.fill();
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 1;
        ctx.stroke();
    }


    drawLabel() {
        const parameter = this.hypercube.parameter;
        // if(parameter > 0.1 && parameter < 0.7) return; 
        const ctx = this.ctx;
        ctx.globalAlpha = 1 
            - getParameter(parameter, 0, 0.3) 
            + getParameter(parameter, 0.7,1.0);
        ctx.font = "40px Arial";
        ctx.fillStyle = "black";
        let d = parameter < 0.5 ? this.hypercube.floorD : this.hypercube.ceilD;
        let txt = this.labels[d];
        let textSize = ctx.measureText(txt);
        let x = this.canvas.clientWidth/2;
        let y = Math.min(...this.vertices.map(v=>v.y));
        window.textSize = textSize;
        ctx.fillText(txt, x-textSize.width/2,y-30);
    }
    
}
