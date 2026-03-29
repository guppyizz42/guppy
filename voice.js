/**
 * GUPPY | MEDIA ENGINE
 * Handles native RTCPeerConnection for Voice and Video.
 */

let localStream = null;
let currentCall = null;

const iceConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// 1. START MEDIA (Triggered by Match)
// We pass 'true' if the mode is 'video', 'false' for 'voice'
window.startMedia = async function(useVideo = false) {
    try {
        // Request Permissions
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: useVideo 
        });

        updateVoiceUI(useVideo ? '📹 Initializing Video...' : '🎙️ Initializing Voice...');

        // If video is enabled, show your own face in a preview
        if (useVideo) showLocalPreview(localStream);

        // Initialize Peer Connection
        createPeerConnection();

        // Add all tracks (Audio + Video) to the stream
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        window.socket.emit('webrtc-signal', { type: 'offer', sdp: offer, useVideo: useVideo });

    } catch (err) {
        console.error("Media Access Error:", err);
        updateVoiceUI('❌ Access Denied');
        addMsg("SYSTEM: Please allow Camera/Mic access.", "system");
    }
};

// 2. CREATE PEER CONNECTION
function createPeerConnection() {
    if (peerConnection) return;

    peerConnection = new RTCPeerConnection(iceConfig);

    peerConnection.ontrack = (event) => {
        const stream = event.streams[0];
        
        // Handle Audio
        const remoteAudio = document.getElementById('remote-audio') || createAudioElement();
        remoteAudio.srcObject = stream;

        // Handle Video (If the stranger is sending video tracks)
        if (event.track.kind === 'video') {
            displayRemoteVideo(stream);
        }

        updateVoiceUI('🟢 Connection Live');
        startWaveAnimation();
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            window.socket.emit('webrtc-signal', { type: 'ice', candidate: event.candidate });
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') window.stopMedia();
    };
}

// 3. SIGNALING HANDLER
if (window.socket) {
    window.socket.on('webrtc-signal', async (data) => {
        if (!peerConnection) createPeerConnection();

        try {
            if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                
                if (!localStream) {
                    // Match the offer's media type (if they sent video, we send video)
                    const hasVideo = data.useVideo || false;
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: hasVideo });
                    if (hasVideo) showLocalPreview(localStream);
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
        } catch (e) { console.warn("Signaling Error:", e); }
    });

// --- VISUAL UTILITIES ---

function displayRemoteVideo(stream) {
    let rv = document.getElementById('remote-video');
    if (!rv) {
        rv = document.createElement('video');
        rv.id = 'remote-video';
        rv.autoplay = true;
        rv.playsinline = true; // Required for mobile
        document.getElementById('chat-viewport').appendChild(rv);
    }
    rv.srcObject = stream;
}

function showLocalPreview(stream) {
    let lv = document.getElementById('local-video-preview');
    if (!lv) {
        lv = document.createElement('video');
        lv.id = 'local-video-preview';
        lv.autoplay = true; lv.muted = true;
        document.querySelector('.sidebar').appendChild(lv);
    }
    lv.srcObject = stream;
}

window.stopMedia = function() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection) peerConnection.close();
    
    // Cleanup DOM
    const rv = document.getElementById('remote-video');
    const lv = document.getElementById('local-video-preview');
    if (rv) rv.remove();
    if (lv) lv.remove();

    localStream = null;
    peerConnection = null;
    updateVoiceUI('⚪ Media Offline');
    stopWaveAnimation();
};

window.toggleMute = function() {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    const btn = document.getElementById('mute-btn');
    if (btn) btn.innerText = isMuted ? '🔊 Unmute' : '🔇 Mute';
};

// --- SYSTEM SYNC ---
function updateVoiceUI(txt) {
    const label = document.getElementById('voice-state-label');
    if (label) label.innerText = txt;
}
function startWaveAnimation() { document.querySelectorAll('.wave-bar').forEach(b => b.classList.add('active')); }
function stopWaveAnimation() { document.querySelectorAll('.wave-bar').forEach(b => b.classList.remove('active')); }

window.addEventListener('stop-all-activities', window.stopMedia);
// Listen for custom trigger from client.js
window.addEventListener('start-voice', () => window.startMedia(false));
window.addEventListener('start-video', () => window.startMedia(true));
