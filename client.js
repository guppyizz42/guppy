window.socket = io();
window.peer = new Peer();
window.partnerPeerId = null;

window.peer.on('open', (id) => window.socket.emit('authenticate', { peerId: id }));
window.socket.on('update-count', c => {
    const el = document.getElementById('count');
    if (el) el.innerText = c;
});

window.joinQueue = (mode) => {
    window.socket.emit('find-match', { mode });
    const m = document.getElementById('messages');
    if (m) m.innerHTML = '<div class="system">Searching...</div>';
    
    const sc = document.getElementById('start-controls');
    const ac = document.getElementById('active-controls');
    if (sc) sc.style.display = 'none';
    if (ac) ac.style.display = 'flex';
};

window.socket.on('match-found', (data) => {
    // STOP ALL PLUGINS
    if (window.stopVoid) window.stopVoid();
    if (window.stopEgo) window.stopEgo();
    if (window.stopGame) window.stopGame();
    
    window.partnerPeerId = data.peerId; 
    
    const m = document.getElementById('messages');
    const inp = document.getElementById('chat-input');
    if (m) m.innerHTML = '<div class="system">Connected!</div>';
    if (inp) { inp.disabled = false; inp.focus(); }

    if (data.mode === 'voice' && window.startVoice) window.startVoice();
});

// --- VIDEO CALL HANDSHAKE (ACCEPT/DENY) ---

// When a stranger manually requests video during a text chat
window.socket.on('video-request-received', () => {
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'flex';
});

// When the request is accepted, tell the media engine to fire up
window.socket.on('start-peer-video', () => {
    window.dispatchEvent(new CustomEvent('start-video'));
});

// Notify if they said no
window.socket.on('video-denied-notify', () => {
    addMessage('Stranger declined the video call.', 'system');
});

// --- BASIC CHAT LOGIC ---

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    if (input && input.value.trim()) {
        window.socket.emit('send-msg', input.value);
        addMessage(input.value, 'me');
        input.value = '';
    }
};

window.socket.on('receive-msg', m => addMessage(m, 'stranger'));

window.socket.on('stranger-left', () => {
    addMessage('Stranger left.', 'system');
    setTimeout(() => location.reload(), 1500);
});

// ESC KEY TO SKIP
window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") window.handleSkip();
});

window.handleSkip = function() {
    window.socket.emit('leave-chat');
    location.reload(); 
};

function addMessage(text, type) {
    const m = document.getElementById('messages');
    if (!m) return;
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerText = text;
    m.appendChild(div);
    m.scrollTop = m.scrollHeight;
}
