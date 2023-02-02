
let dimButtons;
let d2Panel;
let d3Panel;
const hypercube = new Hypercube(5);
let oldTime;

function getTime() { return performance.now() * 0.001; }


const slide = {
    name: 'sequence',
}




function setup() {
    addStyles();
    let container = document.getElementById('animation-container');

    let buttonsPanel = createButtonsPanel();
    container.appendChild(buttonsPanel);

    let mainDiv = document.createElement('div');
    mainDiv.classList.add('main-panel');
    container.appendChild(mainDiv);


    //d3Panel = document.createElement('div');
    //d3Panel.classList.add('d3-panel');
    //mainDiv.appendChild(d3Panel);
    d3Panel = new D3Panel(mainDiv, hypercube);

    //d2Panel = document.createElement('div');
    //d2Panel.classList.add('d2-panel');
    //mainDiv.appendChild(d2Panel);
    d2Panel = new D2Panel(mainDiv, hypercube);

    // new D3Panel(mainDiv, hypercube);
    
    window.container = container;
    window.buttonsPanel  = buttonsPanel;
    window.d3Panel = d3Panel;
    window.d2Panel = d2Panel;

    oldTime = getTime();
    setInterval(tick, 20);
    d2Panel.repaint();

    window.addEventListener("resize", function () {
        d2Panel.repaint();
        d3Panel.resize();
    });
}

function cleanup() {
    d3Panel.engine.stopRenderLoop()    
    d3Panel.scene.dispose()
    delete d3Panel.scene
    d3Panel.engine.dispose()
    delete d3Panel.engine
}

function addStyles() {
    let style = document.createElement('style');
    style.innerHTML = `
        #animation-container {
            display:flex;
            flex-direction:column;
            background-color:white;
            border:none;
            align-content:stretch;
        }

        .buttons-panel {
            display:flex;
            flex-direction:row;
            flex: 0 0 auto;
            gap:30px;
            padding:10px;    
            justify-content:center;
        }

        .buttons-panel button {
            border-radius:50%;
            width:50px;
            height:50px;
            border:none;
            background-color: transparent;
            padding:0;
            margin:0;
            color:black;
            font-size:40px;
            line-height:50px;
        }
        .buttons-panel button:active {
            background-color:red;
        }
        .buttons-panel button:hover {
            background-color: #DDD;
        }
        .buttons-panel button.current {
            color:red;
        }
        .buttons-panel button.target {
            border:solid 3px red;
            animation: pulse 1s infinite;
        }

        
        .main-panel {
            flex-grow:1;
            display:grid;
            grid-auto-columns: 1fr;
            grid-auto-flow: column;
        }


        .d3-panel {            
        }
        .d2-panel {
            
        }
    `;
    document.head.appendChild(style);    
}

function createButtonsPanel() {
    let panel = document.createElement('div');
    panel.classList.add('buttons-panel');
    dimButtons = [];
    for(let i=0; i<=5; i++) {
        let btn = document.createElement('button');
        btn.innerText = ""+i;
        panel.appendChild(btn);
        let idx = i;
        btn.onclick = () => {
            hypercube.targetDim = idx;
            btn.classList.add('target');
        };
        if(idx == hypercube.currentDim) btn.classList.add('current');
        dimButtons.push(btn);
    }
    return panel;
}

function updateButtons() {
    dimButtons.forEach((btn,i) => {
        if(i==hypercube.ceilD) {
            if(i==hypercube.currentDim)
                btn.classList.remove('target');
            btn.classList.add("current");
        } else if(i==hypercube.targetDim) {
            btn.classList.remove('current');
            btn.classList.add("target");
        } else {
            btn.classList.remove('current', 'target');
        }
    })
}

function tick() {
    let time = getTime();
    let dt = time-oldTime;
    oldTime = time;
    if(hypercube.tick(dt)) {
        updateButtons();
        d2Panel.repaint();
        d3Panel.update();
    }
}




