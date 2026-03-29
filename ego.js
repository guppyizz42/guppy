/**
 * GUPPY | PSYCHEDELIC EGO ENGINE
 * Overdrives the camera feed with recursive CSS filters.
 */

let eStream = null;

window.toggleEgo = async () => {
    if (eStream) { window.stopEgo(); return; }
    
    try {
        eStream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        const chatArea = document.querySelector('.chat-area');
        
        // 1. Inject "Chaos Styles" directly into the document
        const style = document.createElement('style');
        style.id = "ego-chaos-styles";
        style.innerHTML = `
            #ego-vid {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                object-fit: cover; z-index: 50; transform: scaleX(-1);
                filter: invert(1) contrast(500%) brightness(150%) saturate(200%);
                mix-blend-mode: exclusion;
                animation: ego-melt 3s infinite alternate ease-in-out, 
                           ego-chroma 5s infinite linear;
            }
            .ego-active::before {
                content: ""; position: absolute; inset: 0;
                background: repeating-conic-gradient(from 0deg, #ff0000, #00ff00, #0000ff, #ff0000 10%);
                opacity: 0.3; z-index: 51; mix-blend-mode: color-burn;
                pointer-events: none; animation: ego-bg-spin 10s infinite linear;
            }
            @keyframes ego-melt {
                0% { filter: invert(1) blur(0px) contrast(200%); transform: scaleX(-1) scale(1); }
                100% { filter: invert(0) blur(15px) contrast(800%); transform: scaleX(-1) scale(1.5); }
            }
            @keyframes ego-chroma {
                from { filter: hue-rotate(0deg) invert(1); }
                to { filter: hue-rotate(360deg) invert(1); }
            }
            @keyframes ego-bg-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        // 2. Create the Video Element
        const v = document.createElement('video');
        v.id = "ego-vid"; 
        v.srcObject = eStream; 
        v.autoplay = true; 
        v.muted = true;
        
        chatArea.appendChild(v);
        chatArea.classList.add('ego-active');
        
        // 3. Hide messages for total immersion
        const msgs = document.getElementById('messages');
        if (msgs) msgs.style.visibility = 'hidden';

        console.log("%c [EGO DEPTHS ACCESSED] ", "background: #f0f; color: #fff;");
        
    } catch (e) { 
        console.error(e);
        alert("EGO BLOCKED: Camera required for dissolution."); 
    }
};

window.stopEgo = () => {
    if (eStream) eStream.getTracks().forEach(t => t.stop());
    eStream = null;
    
    // Remove Video
    const v = document.getElementById('ego-vid'); 
    if (v) v.remove();
    
    // Remove Injected Styles
    const style = document.getElementById('ego-chaos-styles');
    if (style) style.remove();
    
    // Restore UI
    const chatArea = document.querySelector('.chat-area');
    if (chatArea) chatArea.classList.remove('ego-active');
    
    const msgs = document.getElementById('messages');
    if (msgs) msgs.style.visibility = 'visible';
};

window.addEventListener('stop-all-activities', window.stopEgo);
