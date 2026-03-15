const socket = io();
const peer = new Peer();
const uuid = 'user-' + Math.random().toString(36).substr(2, 9);
let myPeerId, partnerPeerId, currentMode;

peer.on('open', id => { myPeerId = id; socket.emit('authenticate', { uuid, peerId: id }); });
socket.on('update-count', c => document.getElementById('count').innerText = c);

function joinQueue(mode) {
    currentMode = mode;
    const tags = document.getElementById('tags').value;
    socket.emit('find-match', { mode, tags });
    document.getElementById('messages').innerHTML = '<div class="system">ENTERING QUEUE...</div>';
    document.getElementById('start-controls').style.display = 'none';
    document.getElementById('active-controls').style.display = 'flex';
}

socket.on('match-found', data => {
    // THIS TELLS ALL OTHER FILES TO SHUT DOWN
    window.dispatchEvent(new Event('stop-all-activities'));
    
    partnerPeerId = data.peerId;
    document.getElementById('messages').innerHTML = data.commonInterest ? 
        `<div class="system">MATCH: ${data.commonInterest}</div>` : 
        `<div class="system">STRANGER CONNECTED</div>`;
    
    document.getElementById('chat-input').disabled = false;
    if(currentMode === 'voice') window.dispatchEvent(new CustomEvent('start-voice', { detail: { id: partnerPeerId } }));
});

function sendMessage() {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
        socket.emit('send-msg', input.value);
        addMessage(input.value, 'me');
        input.value = '';
    }
}

function addMessage(t, type) {
    const d = document.createElement('div'); d.className = 'msg ' + type; d.innerText = t;
    const m = document.getElementById('messages'); m.appendChild(d); m.scrollTop = m.scrollHeight;
}

socket.on('receive-msg', m => addMessage(m, 'stranger'));
socket.on('stranger-left', () => { addMessage('Stranger left.', 'system'); setTimeout(() => location.reload(), 1500); });
function handleSkip() { socket.emit('leave-chat'); location.reload(); }