const socket = io();
const peer = new Peer(); 
const uuid = 'user-' + Math.random().toString(36).substr(2, 9);

let myPeerId = null;
let partnerPeerId = null;
let currentMode = 'text';
let skipState = 0; 
let skipTimer;
let typingTimer;
let myStream = null;

peer.on('open', (id) => {
    myPeerId = id;
    socket.emit('authenticate', { uuid: uuid, peerId: id });
});

socket.on('update-count', c => document.getElementById('count').innerText = c);

function joinQueue(mode) {
    currentMode = mode;
    const tags = document.getElementById('tags').value;
    socket.emit('find-match', { mode: mode, tags: tags });
    
    document.getElementById('messages').innerHTML = '<div class="system">Searching...</div>';
    document.getElementById('start-controls').style.display = 'none';
    document.getElementById('active-controls').style.display = 'flex';
    document.getElementById('call-btn').style.display = mode === 'voice' ? 'none' : 'flex';
    disableInput();
}

socket.on('match-found', (data) => {
    partnerPeerId = data.peerId;
    
    document.getElementById('messages').innerHTML = data.commonInterest ? 
        `<div class="system interest-msg">✨ You both like ${data.commonInterest}!</div>` : 
        `<div class="system">Stranger connected.</div>`;
    
    if (currentMode === 'text') {
        enableInput();
    } else if (currentMode === 'voice') {
        startCall(partnerPeerId);
        document.getElementById('messages').innerHTML += '<div class="system">Connecting voice...</div>';
    }
});

function handleSkip() {
    const btn = document.getElementById('skip-btn');
    if (skipState === 0) {
        skipState = 1;
        btn.innerText = "Are you sure?";
        skipTimer = setTimeout(() => { skipState = 0; btn.innerText = "Skip (Esc)"; }, 3000);
    } else {
        clearTimeout(skipTimer);
        socket.emit('leave-chat');
        resetChatUI();
        joinQueue(currentMode); 
    }
}

function resetChatUI() {
    partnerPeerId = null;
    skipState = 0;
    document.getElementById('skip-btn').innerText = "Skip (Esc)";
    document.getElementById('call-btn').innerText = "📞 Request Call";
    document.getElementById('call-btn').disabled = false;
    disableInput();
    if(myStream) {
        myStream.getTracks().forEach(track => track.stop());
        myStream = null;
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
        socket.emit('send-msg', input.value);
        addMessage(input.value, 'me');
        input.value = '';
    }
}

function handleTyping(e) {
    if (e.key === 'Enter') sendMessage();
    else socket.emit('typing');
}

socket.on('receive-msg', m => {
    document.getElementById('typing-indicator').style.display = 'none';
    addMessage(m, 'stranger');
});

socket.on('stranger-typing', () => {
    const ind = document.getElementById('typing-indicator');
    ind.style.display = 'block';
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => ind.style.display = 'none', 1500);
});

socket.on('stranger-left', () => {
    addMessage('Stranger disconnected.', 'system');
    resetChatUI();
    document.getElementById('active-controls').style.display = 'none';
    document.getElementById('start-controls').style.display = 'flex';
});

function requestCall() {
    socket.emit('request-call');
    document.getElementById('call-btn').innerText = "Ringing...";
    document.getElementById('call-btn').disabled = true;
}

socket.on('incoming-call', () => document.getElementById('call-modal').style.display = 'flex');

socket.on('call-accepted', () => {
    document.getElementById('call-btn').innerText = "On Call 🟢";
    document.getElementById('call-btn').disabled = true;
});

function acceptCall() {
    document.getElementById('call-modal').style.display = 'none';
    socket.emit('accept-call'); 
    startCall(partnerPeerId);
}

function rejectCall() {
    document.getElementById('call-modal').style.display = 'none';
    addMessage('Call declined.', 'system');
}

async function startCall(id) {
    try {
        myStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const call = peer.call(id, myStream);
        document.getElementById('call-btn').innerText = "On Call 🟢";
        document.getElementById('call-btn').disabled = true;
        call.on('stream', remoteStream => document.getElementById('remoteAudio').srcObject = remoteStream);
    } catch (err) {
        addMessage('Microphone denied.', 'system');
        document.getElementById('call-btn').innerText = "📞 Request Call";
        document.getElementById('call-btn').disabled = false;
    }
}

peer.on('call', (call) => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
        myStream = stream;
        document.getElementById('call-btn').innerText = "On Call 🟢";
        document.getElementById('call-btn').disabled = true;
        call.answer(stream);
        call.on('stream', remoteStream => document.getElementById('remoteAudio').srcObject = remoteStream);
    });
});

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = 'msg ' + type;
    div.innerText = text;
    const container = document.getElementById('messages');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function enableInput() {
    document.getElementById('chat-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('chat-input').focus();
}

function disableInput() {
    document.getElementById('chat-input').disabled = true;
    document.getElementById('send-btn').disabled = true;
}

window.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && document.getElementById('active-controls').style.display !== 'none') {
        handleSkip();
    }
});