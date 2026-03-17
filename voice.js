// voice.js — WebRTC voice chat using Socket.IO for signalling
let localStream = null;
let peerConnection = null;
let isMuted = false;

const iceConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function startVoice(partnerId) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        document.getElementById('voice-state-label').innerText = '🎙️ Voice connected';

        peerConnection = new RTCPeerConnection(iceConfig);

        // Add local audio tracks
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // When we get remote audio
        peerConnection.ontrack = (event) => {
            const audio = document.getElementById('remote-audio');
            audio.srcObject = event.streams[0];
        };

        // ICE candidate exchange
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                window._guppySocket.emit('webrtc-signal', {
                    type: 'ice',
                    candidate: event.candidate
                });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            const state = peerConnection.connectionState;
            if (state === 'connected') {
                document.getElementById('voice-state-label').innerText = '🟢 Voice active';
                startWaveAnimation();
            } else if (state === 'disconnected' || state === 'failed') {
                document.getElementById('voice-state-label').innerText = '🔴 Voice disconnected';
                stopWaveAnimation();
            }
        };

        // Create and send offer (we always create offer; partner handles answer)
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        window._guppySocket.emit('webrtc-signal', { type: 'offer', sdp: offer });

    } catch (err) {
        console.error('Voice error:', err);
        document.getElementById('voice-state-label').innerText = '❌ Mic access denied';
    }
}

// Handle incoming WebRTC signals
window._guppySocket && setupSignalling();
window.addEventListener('load', () => {
    if (window._guppySocket) setupSignalling();
});

function setupSignalling() {
    window._guppySocket.on('webrtc-signal', async (data) => {
        if (!peerConnection) {
            // We're the answerer — set up peer connection first
            peerConnection = new RTCPeerConnection(iceConfig);

            if (localStream) {
                localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            }

            peerConnection.ontrack = (event) => {
                const audio = document.getElementById('remote-audio');
                audio.srcObject = event.streams[0];
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    window._guppySocket.emit('webrtc-signal', {
                        type: 'ice',
                        candidate: event.candidate
                    });
                }
            };

            peerConnection.onconnectionstatechange = () => {
                const state = peerConnection.connectionState;
                if (state === 'connected') {
                    document.getElementById('voice-state-label').innerText = '🟢 Voice active';
                    startWaveAnimation();
                }
            };
        }

        if (data.type === 'offer') {
            // Get mic if not already
            if (!localStream) {
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
                } catch (e) {
                    console.error('Mic error:', e);
                }
            }
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            window._guppySocket.emit('webrtc-signal', { type: 'answer', sdp: answer });

        } else if (data.type === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));

        } else if (data.type === 'ice') {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) { /* ignore */ }
        }
    });
}

function stopVoice() {
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    stopWaveAnimation();
    isMuted = false;
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) muteBtn.innerText = '🔇 Mute';
}

function toggleMute() {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    document.getElementById('mute-btn').innerText = isMuted ? '🔊 Unmute' : '🔇 Mute';
}

let waveInterval = null;
function startWaveAnimation() {
    const bars = document.querySelectorAll('.wave-bar');
    bars.forEach(b => b.classList.add('active'));
}
function stopWaveAnimation() {
    const bars = document.querySelectorAll('.wave-bar');
    bars.forEach(b => b.classList.remove('active'));
}

// Event listeners from client.js
window.addEventListener('start-voice', (e) => {
    startVoice(e.detail.partnerId);
});

window.addEventListener('stop-voice', () => {
    stopVoice();
});

window.addEventListener('stop-all-activities', () => {
    stopVoice();
});

// Set up signalling once socket is available
document.addEventListener('DOMContentLoaded', () => {
    const checkSocket = setInterval(() => {
        if (window._guppySocket) {
            setupSignalling();
            clearInterval(checkSocket);
        }
    }, 100);
});
