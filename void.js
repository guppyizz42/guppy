/**
 * GUPPY | VOID ENGINE
 * Manages the transition between 4 distinct psychedelic phases.
 */

const ANCIENT_SCRIPTS = [
    "अहं ब्रह्मास्मि", 
    "ॐ मणि पद्मे हूँ", 
    "קדש קדש קדש", 
    "तत्त्वमसि", 
    "שמע ישראל", 
    "𐤀𐤋𐤕 𐤌𐤔𐤕", 
    "ओं शान्तिः"
];

let shlokaInterval = null;
let patternInterval = null;
let currentPhase = 0;

window.toggleVoid = function() {
    const isEnabling = !document.body.classList.contains('void-enabled');
    
    // Toggle the master class
    document.body.classList.toggle('void-enabled');

    if (isEnabling) {
        console.log("%c [VOID PROTOCOL INITIATED] ", "background: #000; color: #39ff14;");
        
        // 1. Start the Shloka Rotation (Syncs with 4s CSS animation)
        rotateShlokas();
        shlokaInterval = setInterval(rotateShlokas, 4000); 
        
        // 2. Start the Pattern Morphing (Changes style every 3.5s)
        cyclePatterns();
        patternInterval = setInterval(cyclePatterns, 3500); 
        
    } else {
        window.stopVoid();
    }
};

function cyclePatterns() {
    const tunnel = document.getElementById('void-tunnel');
    const turb = document.getElementById('turbulence');
    
    if (!tunnel) return;

    // Remove previous phase class (phase-1, phase-2, etc.)
    tunnel.className = '';
    
    // Increment phase (1 through 4)
    currentPhase = (currentPhase % 4) + 1;
    tunnel.classList.add('phase-' + currentPhase);
    
    // Randomize the SVG Warp seed so no two "melts" look the same
    if (turb) {
        const randomSeed = Math.floor(Math.random() * 1000);
        turb.setAttribute('seed', randomSeed);
    }
}

function rotateShlokas() {
    const overlay = document.getElementById('void-text-overlay');
    if (overlay) {
        const randomIndex = Math.floor(Math.random() * ANCIENT_SCRIPTS.length);
        overlay.innerText = ANCIENT_SCRIPTS[randomIndex];
    }
}

window.stopVoid = function() {
    // 1. Remove visual classes
    document.body.classList.remove('void-enabled');
    
    // 2. Kill the timers to save MacBook CPU
    if (shlokaInterval) clearInterval(shlokaInterval);
    if (patternInterval) clearInterval(patternInterval);
    
    // 3. Reset the overlay text
    const overlay = document.getElementById('void-text-overlay');
    if (overlay) overlay.innerText = "";

    console.log("%c [VOID PROTOCOL OFFLINE] ", "color: #666;");
};

/**
 * GLOBAL KILL-SWITCH
 * Triggered by client.js when a match is found.
 */
window.addEventListener('stop-all-activities', window.stopVoid);