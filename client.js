window.socket = io();
window.peer = new Peer();
window.partnerPeerId = null;

window.peer.on('open', (id) => {
    window.socket.emit('authenticate', { peerId: id });
});

window.socket.on('update-count', c => document.getElementById('count').innerText = c);

window.joinQueue = function(mode) {
    const tags = document.getElementById('tags').value;
    window.socket.emit('find-match', { mode, tags });
    document.getElementById('messages').innerHTML = '<div class="system">Scanning mesh...</div>';
    document.getElementById('start-controls').style.display = 'none';
    document.getElementById('active-controls').style.display = 'flex';
};

window.socket.on('match-found', (data) => {
    window.dispatchEvent(new Event('stop-all-activities'));
    window.partnerPeerId = data.peerId;
    document.getElementById('messages').innerHTML = `<div class="system">Stranger connected. ${data.commonInterest || ''}</div>`;
    document.getElementById('chat-input').disabled = false;
    if (data.mode === 'voice') window.dispatchEvent(new CustomEvent('start-voice'));
});

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
        window.socket.emit('send-msg', input.value);
        addMsg(input.value, 'me');
        input.value = '';
    }
};

window.socket.on('receive-msg', m => addMsg(m, 'stranger'));
window.socket.on('stranger-left', () => { addMsg('Stranger left.', 'system'); setTimeout(() => location.reload(), 1500); });

function addMsg(t, cls) {
    const d = document.createElement('div'); d.className = `msg ${cls}`; d.innerText = t;
    const m = document.getElementById('messages'); m.appendChild(d); m.scrollTop = m.scrollHeight;
}

window.handleSkip = () => location.reload();