/**
 * GUPPY | VOICE PLUGIN
 * Handles WebRTC Audio Signaling & Peer Connections.
 */

let localStream = null;
let peerConnection = null;
let isMuted = false;

const iceConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// 1. START VOICE (Triggered by Match)
window.startVoice = async function() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        updateVoiceUI('🎙️ Requesting Connection...');

        // Initialize Peer Connection
        createPeerConnection();

        // Add our audio to the connection
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // Only the person who clicked "Join" first usually sends the offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        window.socket.emit('webrtc-signal', { type: 'offer', sdp: offer });

    } catch (err) {
        console.error("Mic Error:", err);
        updateVoiceUI('❌ Mic Access Denied');
    }
};

// 2. CREATE PEER CONNECTION (Common Logic)
function createPeerConnection() {
    if (peerConnection) return;

    peerConnection = new RTCPeerConnection(iceConfig);

    // When remote audio arrives
    peerConnection.ontrack = (event) => {
        const remoteAudio = document.getElementById('remote-audio') || createAudioElement();
        remoteAudio.srcObject = event.streams[0];
        updateVoiceUI('🟢 Voice Active');
        startWaveAnimation();
    };

    // When network paths (ICE) are found
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            window.socket.emit('webrtc-signal', { type: 'ice', candidate: event.candidate });
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected') window.stopVoice();
    };
}

// 3. HANDLE INCOMING SIGNALS (The Handshake)
if (window.socket) {
    window.socket.on('webrtc-signal', async (data) => {
        if (!peerConnection) createPeerConnection();

        try {
            if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                
                // Get local mic if we haven't yet
                if (!localStream) {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
                }

                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                window.socket.emit('webrtc-signal', { type: 'answer', sdp: answer });

            } else if (data.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));

            } else if (data.type === 'ice' && data.candidate) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (e) {
            console.warn("WebRTC Signaling Error:", e);
        }
    });
}

// --- UTILITIES ---

function createAudioElement() {
    const el = document.createElement('audio');
    el.id = 'remote-audio';
    el.autoplay = true;
    document.body.appendChild(el);
    return el;
}

window.stopVoice = function() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection) peerConnection.close();
    localStream = null;
    peerConnection = null;
    updateVoiceUI('⚪ Voice Offline');
    stopWaveAnimation();
};

window.toggleMute = function() {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    const btn = document.getElementById('mute-btn');
    if (btn) btn.innerText = isMuted ? '🔊 Unmute' : '🔇 Mute';
};

function updateVoiceUI(txt) {
    const label = document.getElementById('voice-state-label');
    if (label) label.innerText = txt;
}

function startWaveAnimation() { document.querySelectorAll('.wave-bar').forEach(b => b.classList.add('active')); }
function stopWaveAnimation() { document.querySelectorAll('.wave-bar').forEach(b => b.classList.remove('active')); }

// Listen for global shutdown (Match found or Skip)
window.addEventListener('stop-all-activities', window.stopVoice);
window.addEventListener('start-voice', window.startVoice);
