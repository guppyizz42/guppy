/**
 * GUPPY | MEDIA ENGINE
 * Handles native RTCPeerConnection for Voice and Video.
 */

let localStream = null;
let peerConnection = null; // Global declaration fixed
let isMuted = false;

const iceConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// --- HANDSHAKE LOGIC ---
window.requestVideo = () => {
    window.socket.emit('video-request');
    const m = document.getElementById('messages');
    if (m) m.innerHTML += '<div class="system">Video request sent...</div>';
};

window.acceptCall = () => {
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'none';
    window.socket.emit('video-accepted');
};

window.denyCall = () => {
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'none';
    window.socket.emit('video-denied');
};

// 1. START MEDIA
window.startMedia = async function(useVideo = false) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: useVideo 
        });

        updateVoiceUI(useVideo ? '📹 Initializing Video...' : '🎙️ Initializing Voice...');

        if (useVideo) showLocalPreview(localStream);

        createPeerConnection();

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        window.socket.emit('webrtc-signal', { type: 'offer', sdp: offer, useVideo: useVideo });

    } catch (err) {
        console.error("Media Access Error:", err);
        updateVoiceUI('❌ Access Denied');
        // Function name synced with client.js
        if (window.addMessage) window.addMessage("SYSTEM: Mic/Camera Access Denied.", "system");
    }
};

// 2. CREATE PEER CONNECTION
function createPeerConnection() {
    if (peerConnection) return;

    peerConnection = new RTCPeerConnection(iceConfig);

    peerConnection.ontrack = (event) => {
        const stream = event.streams[0];
        const remoteAudio = document.getElementById('remote-audio');
        if (remoteAudio) remoteAudio.srcObject = stream;

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

// 3. SIGNALING HANDLER (Brackets Fixed)
if (window.socket) {
    window.socket.on('webrtc-signal', async (data) => {
        if (!peerConnection) createPeerConnection();

        try {
            if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                
                if (!localStream) {
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
} 

// --- VISUAL UTILITIES ---
function displayRemoteVideo(stream) {
    let rv = document.getElementById('remote-video');
    if (!rv) {
        rv = document.createElement('video');
        rv.id = 'remote-video';
        rv.autoplay = true;
        rv.playsinline = true; 
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
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.appendChild(lv);
    }
    lv.srcObject = stream;
}

window.stopMedia = function() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection) peerConnection.close();
    
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

function updateVoiceUI(txt) {
    const label = document.getElementById('voice-state-label');
    if (label) label.innerText = txt;
}
function startWaveAnimation() { document.querySelectorAll('.wave-bar').forEach(b => b.classList.add('active')); }
function stopWaveAnimation() { document.querySelectorAll('.wave-bar').forEach(b => b.classList.remove('active')); }

window.addEventListener('stop-all-activities', window.stopMedia);
window.addEventListener('start-voice', () => window.startMedia(false));
window.addEventListener('start-video', () => window.startMedia(true));
