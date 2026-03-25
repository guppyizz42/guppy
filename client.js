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

window.handleSkip = () => {
    window.socket.emit('leave-chat');
    location.reload(); 
};

window.addEventListener('keydown', (e) => { if (e.key === "Escape") window.handleSkip(); });

window.sendMessage = () => {
    const i = document.getElementById('chat-input');
    if (i && i.value.trim()) {
        window.socket.emit('send-msg', i.value);
        addMsg(i.value, 'me');
        i.value = '';
    }
};

window.socket.on('receive-msg', m => addMsg(m, 'stranger'));
window.socket.on('stranger-left', () => { 
    addMsg('Stranger left.', 'system'); 
    setTimeout(() => location.reload(), 1000); 
});

function addMsg(t, c) {
    const m = document.getElementById('messages'); 
    if (!m) return;
    const d = document.createElement('div'); 
    d.className = `msg ${c}`; 
    d.innerText = t;
    m.appendChild(d); 
    m.scrollTop = m.scrollHeight;
}
