// ego.js — Ego Portal (glitchy webcam)
let egoStream = null;

async function toggleEgo() {
    if (egoStream) {
        stopEgo();
        return;
    }

    try {
        egoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const video = document.getElementById('ego-vid');
        video.srcObject = egoStream;

        document.getElementById('ego-container').style.display = 'flex';
        document.getElementById('messages').style.display = 'none';

    } catch (e) {
        alert('Camera access is required for the Ego Portal.');
    }
}

function stopEgo() {
    if (egoStream) {
        egoStream.getTracks().forEach(t => t.stop());
        egoStream = null;
    }

    const video = document.getElementById('ego-vid');
    video.srcObject = null;

    document.getElementById('ego-container').style.display = 'none';
    document.getElementById('messages').style.display = 'flex';
}

window.addEventListener('stop-all-activities', stopEgo);
