
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

    d3Panel = new D3Panel(container, hypercube);
    d2Panel = new D2Panel(container, hypercube);

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
            flex-direction:row;
            background-color:white;
            border:none;
        }

        .buttons-panel {
            display:flex;
            flex-direction:column;
            gap:30px;
            padding:10px;    
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

        .d3-panel {
            flex:1;            
        }
        .d3-panel canvas {
            outline:none;
        }
        .d2-panel {
            flex:1;
        }

        @keyframes pulse {
            0% {
                border-color:red;
            }
        
            50% {
                border-color:transparent;
            }
        
            100% {
                border-color:red;
            }
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




