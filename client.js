window.socket = io();
window.peer = new Peer();
window.partnerPeerId = null; // Initialize this so voice.js can see it

window.peer.on('open', (id) => window.socket.emit('authenticate', { peerId: id }));
window.socket.on('update-count', c => document.getElementById('count').innerText = c);

window.joinQueue = (mode) => {
    window.socket.emit('find-match', { mode });
    document.getElementById('messages').innerHTML = '<div class="system">Searching the mesh...</div>';
    document.getElementById('start-controls').style.display = 'none';
    document.getElementById('active-controls').style.display = 'flex';
};

window.socket.on('match-found', (data) => {
    // 1. Kill all background visuals
    if (window.stopVoid) window.stopVoid();
    if (window.stopEgo) window.stopEgo();
    
    // 2. CRITICAL: Save the stranger's ID for PeerJS Voice
    window.partnerPeerId = data.peerId; 
    
    // 3. Update UI
    document.getElementById('messages').innerHTML = '<div class="system">Connected to stranger!</div>';
    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-input').focus();

    // 4. Trigger voice if the mode matches
    if (data.mode === 'voice' && window.startVoice) {
        window.startVoice();
    }
});

window.handleSkip = () => {
    window.socket.emit('leave-chat');
    location.reload(); // Hard reset is the safest way to clear PeerJS data
};

// ESC Key to Skip
window.addEventListener('keydown', (e) => { 
    if (e.key === "Escape") window.handleSkip(); 
});

window.sendMessage = () => {
    const i = document.getElementById('chat-input');
    if (i.value.trim()) {
        window.socket.emit('send-msg', i.value);
        addMsg(i.value, 'me');
        i.value = '';
    }
};

window.socket.on('receive-msg', m => addMsg(m, 'stranger'));

window.socket.on('stranger-left', () => { 
    addMsg('Stranger left.', 'system'); 
    setTimeout(() => location.reload(), 1200); 
});

function addMsg(t, c) {
    const d = document.createElement('div'); 
    d.className = `msg ${c}`; 
    d.innerText = t;
    const m = document.getElementById('messages'); 
    m.appendChild(d); 
    m.scrollTop = m.scrollHeight;
}
