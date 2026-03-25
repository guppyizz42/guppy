/**
 * GUPPY | VOICE PLUGIN (PeerJS Edition)
 */

let localStream = null;
let currentCall = null;

// 1. START VOICE (Triggered when Match Found)
window.startVoice = async function() {
    try {
        // Get Mic
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        updateVoiceUI('🎙️ Mic Active');

        if (window.partnerPeerId) {
            // CALL the stranger using their PeerID
            const call = window.peer.call(window.partnerPeerId, localStream);
            setupCallListeners(call);
        }
    } catch (err) {
        console.error("Voice Error:", err);
        updateVoiceUI('❌ Mic Denied');
    }
};

// 2. ANSWER VOICE (When someone calls us)
window.peer.on('call', async (call) => {
    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    call.answer(localStream);
    setupCallListeners(call);
});

function setupCallListeners(call) {
    currentCall = call;
    
    call.on('stream', (remoteStream) => {
        const audio = document.getElementById('remote-audio');
        if (audio) {
            audio.srcObject = remoteStream;
            updateVoiceUI('🟢 Voice Live');
            if (window.toggleWave) window.toggleWave(true);
        }
    });

    call.on('close', window.stopVoice);
    call.on('error', window.stopVoice);
}

window.stopVoice = function() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (currentCall) currentCall.close();
    localStream = null;
    currentCall = null;
    updateVoiceUI('⚪ Voice Offline');
    if (window.toggleWave) window.toggleWave(false);
};

function updateVoiceUI(txt) {
    const label = document.getElementById('voice-state-label');
    if (label) label.innerText = txt;
}

window.addEventListener('stop-all-activities', window.stopVoice);
