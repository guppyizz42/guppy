let eStream = null;

window.toggleEgo = async () => {
    if (eStream) { window.stopEgo(); return; }

    try {
        eStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const chatArea = document.querySelector('.chat-area');

        const style = document.createElement('style');
        style.id = "ego-chaos-styles";
        style.innerHTML = `
            :root {
                --ego-speed: 0.5s;
            }

            .chat-area.ego-active {
                position: relative;
                overflow: hidden;
                animation: ego-vortex calc(var(--ego-speed)*2) infinite linear;
            }

            /* MAIN VIDEO */
            .ego-layer {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                mix-blend-mode: screen;
                filter: url(#ego-distort);
            }

            /* MULTI CLONE STACK */
            .ego-clone {
                position: absolute;
                inset: 0;
                animation: ego-clone-spin var(--ego-speed) infinite linear;
                transform-origin: center;
            }

            /* FRACTAL SQUARE SWARM */
            .ego-square {
                position: absolute;
                border: 2px solid white;
                mix-blend-mode: difference;
                animation:
                    ego-square-spin var(--ego-speed) infinite linear,
                    ego-square-pulse var(--ego-speed) infinite ease-in-out,
                    ego-hue calc(var(--ego-speed)*2) infinite linear;
            }

            /* VORTEX ROTATION */
            @keyframes ego-vortex {
                from { transform: rotate(0deg) scale(1); }
                to { transform: rotate(360deg) scale(1.2); }
            }

            /* CLONE ROTATION */
            @keyframes ego-clone-spin {
                from { transform: scale(1) rotate(0deg); }
                to { transform: scale(0.3) rotate(-360deg); }
            }

            /* SQUARE CHAOS */
            @keyframes ego-square-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(720deg); }
            }

            @keyframes ego-square-pulse {
                0%,100% { transform: scale(0.5); }
                50% { transform: scale(2); }
            }

            @keyframes ego-hue {
                from { filter: hue-rotate(0deg); }
                to { filter: hue-rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        /* 🔥 FACE MELT CORE */
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.position = "absolute";
        svg.style.width = 0;
        svg.innerHTML = `
            <filter id="ego-distort">
                <feTurbulence type="turbulence" baseFrequency="0.02 0.03" numOctaves="3">
                    <animate attributeName="baseFrequency"
                        dur="0.6s"
                        values="0.02 0.03; 0.08 0.1; 0.02 0.03"
                        repeatCount="indefinite"/>
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" scale="120"/>
            </filter>
        `;
        document.body.appendChild(svg);

        /* 🎥 BASE VIDEO */
        const baseVideo = document.createElement('video');
        baseVideo.srcObject = eStream;
        baseVideo.autoplay = true;
        baseVideo.muted = true;
        baseVideo.className = "ego-layer";

        chatArea.appendChild(baseVideo);

        /* 🔁 CREATE RECURSIVE CLONES */
        const CLONES = 6;
        for (let i = 0; i < CLONES; i++) {
            const clone = baseVideo.cloneNode();
            clone.className = "ego-layer ego-clone";
            clone.style.opacity = 0.7 - i * 0.1;
            clone.style.transform = `scale(${1 - i*0.1}) rotate(${i*30}deg)`;
            chatArea.appendChild(clone);
        }

        /* 🔳 SQUARE SWARM */
        for (let i = 0; i < 12; i++) {
            const sq = document.createElement('div');
            sq.className = "ego-square";
            sq.style.width = sq.style.height = `${50 + i*30}px`;
            sq.style.top = `${Math.random()*100}%`;
            sq.style.left = `${Math.random()*100}%`;
            chatArea.appendChild(sq);
        }

        chatArea.classList.add('ego-active');

        const msgs = document.getElementById('messages');
        if (msgs) msgs.style.visibility = 'hidden';

        console.log("%c [REALITY.EXE HAS STOPPED RESPONDING] ", "background:#000;color:#0f0;");

    } catch (e) {
        console.error(e);
        alert("Camera required.");
    }
};

window.stopEgo = () => {
    if (eStream) eStream.getTracks().forEach(t => t.stop());
    eStream = null;

    document.querySelectorAll('.ego-layer, .ego-square').forEach(el => el.remove());
    document.getElementById('ego-chaos-styles')?.remove();
    document.querySelector('svg')?.remove();

    const chatArea = document.querySelector('.chat-area');
    chatArea?.classList.remove('ego-active');

    const msgs = document.getElementById('messages');
    if (msgs) msgs.style.visibility = 'visible';
};

window.addEventListener('stop-all-activities', window.stopEgo);
