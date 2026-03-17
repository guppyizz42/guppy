const socket = io();
const uuid = 'user-' + Math.random().toString(36).substr(2, 9);
let currentMode = null;
let typingTimeout = null;

// Wait for socket connection then authenticate
socket.on('connect', () => {
    socket.emit('authenticate', { uuid, peerId: uuid }); // peerId = uuid for WebRTC signalling via socket
});

socket.on('update-count', c => {
    document.getElementById('count').innerText = c;
});

function joinQueue(mode) {
    currentMode = mode;
    const tags = document.getElementById('tags').value.trim();
    socket.emit('find-match', { mode, tags });

    addMessage('🔍 Searching for a stranger...', 'system');
    document.getElementById('start-controls').style.display = 'none';
    document.getElementById('active-controls').style.display = 'flex';

    if (mode === 'voice') {
        document.getElementById('voice-status').style.display = 'flex';
    }
}

socket.on('match-found', (data) => {
    window.dispatchEvent(new Event('stop-all-activities'));

    const label = data.commonInterest
        ? `✨ Matched! Common interest: <b>${data.commonInterest}</b>`
        : '👤 Stranger connected.';
    addMessage(label, 'system');

    if (data.mode === 'voice' || currentMode === 'voice') {
        document.getElementById('voice-container').style.display = 'flex';
        document.getElementById('messages').style.display = 'none';
        document.getElementById('voice-state-label').innerText = '🎙️ Connecting voice...';
        window.dispatchEvent(new CustomEvent('start-voice', { detail: { partnerId: data.peerId } }));
    } else {
        document.getElementById('chat-input').disabled = false;
    }
});

function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    socket.emit('send-msg', text);
    addMessage(text, 'me');
    input.value = '';
}

function emitTyping() {
    socket.emit('typing');
}

socket.on('receive-msg', (msg) => {
    addMessage(msg, 'stranger');
});

socket.on('stranger-typing', () => {
    const indicator = document.getElementById('typing-indicator');
    indicator.style.display = 'flex';
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => indicator.style.display = 'none', 2000);
});

socket.on('stranger-left', () => {
    addMessage('👋 Stranger has left.', 'system');
    document.getElementById('chat-input').disabled = true;
    document.getElementById('typing-indicator').style.display = 'none';

    // Reset voice UI if in voice mode
    document.getElementById('voice-container').style.display = 'none';
    document.getElementById('messages').style.display = 'flex';
    window.dispatchEvent(new Event('stop-voice'));

    setTimeout(() => resetUI(), 2000);
});

function handleSkip() {
    socket.emit('leave-chat');
    window.dispatchEvent(new Event('stop-voice'));
    resetUI();
    location.reload();
}

function addMessage(text, type) {
    const d = document.createElement('div');
    d.className = 'msg ' + type;
    if (type === 'system') {
        d.innerHTML = text;
    } else {
        d.innerText = text;
    }
    const m = document.getElementById('messages');
    m.appendChild(d);
    m.scrollTop = m.scrollHeight;
}

function resetUI() {
    document.getElementById('start-controls').style.display = 'flex';
    document.getElementById('active-controls').style.display = 'none';
    document.getElementById('voice-status').style.display = 'none';
    document.getElementById('chat-input').disabled = true;
    document.getElementById('voice-container').style.display = 'none';
    document.getElementById('messages').style.display = 'flex';
}

// ESC key = skip
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') handleSkip();
});

// Expose socket for voice.js
window._guppySocket = socket;
