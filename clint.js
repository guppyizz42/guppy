const socket = io();
const peer = new Peer();
const uuid = 'user-' + Math.random().toString(36).substr(2, 9);
let myPeerId, partnerPeerId, currentMode, myStream, egoStream;

// --- CORE MATCHMAKING ---
peer.on('open', id => { myPeerId = id; socket.emit('authenticate', { uuid, peerId: id }); });
socket.on('update-count', c => document.getElementById('count').innerText = c);

function joinQueue(mode) {
    currentMode = mode;
    const tags = document.getElementById('tags').value;
    socket.emit('find-match', { mode, tags });
    document.getElementById('messages').innerHTML = '<div class="system">Searching...</div>';
    document.getElementById('start-controls').style.display = 'none';
    document.getElementById('active-controls').style.display = 'flex';
    disableInput();
}

socket.on('match-found', data => {
    stopGame(); stopEgo(); stopVoid();
    partnerPeerId = data.peerId;
    document.getElementById('messages').innerHTML = data.commonInterest ? 
        `<div class="system interest-msg">✨ You both like ${data.commonInterest}!</div>` : 
        `<div class="system">Stranger connected.</div>`;
    enableInput();
    if(currentMode === 'voice') startCall(partnerPeerId);
});

// --- GAME LOGIC ---
let canvas, ctx, loop, gameRunning = false, pipes = [], score = 0, guppy = { x: 50, y: 150, v: 0 };
function startGame() {
    gameRunning = true;
    document.getElementById('messages').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    canvas = document.getElementById('gameCanvas'); ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight;
    guppy.y = canvas.height/2; pipes = []; score = 0;
    document.getElementById('game-container').onclick = () => guppy.v = -6;
    gameLoop();
}
function stopGame() { 
    gameRunning = false; cancelAnimationFrame(loop); 
    document.getElementById('game-container').style.display = 'none'; 
    document.getElementById('messages').style.display = 'flex';
}
function gameLoop() {
    if(!gameRunning) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    guppy.v += 0.4; guppy.y += guppy.v;
    ctx.font = "30px Arial"; ctx.fillText("🐟", guppy.x, guppy.y);
    if(Math.random() < 0.02) pipes.push({ x: canvas.width, t: Math.random()*(canvas.height-150), p: false });
    pipes.forEach(p => {
        p.x -= 3; ctx.fillStyle = "#34C759";
        ctx.fillRect(p.x, 0, 40, p.t); ctx.fillRect(p.x, p.t + 120, 40, canvas.height);
        if(p.x < guppy.x && !p.p) { score++; p.p = true; document.getElementById('score').innerText = score; }
    });
    if(guppy.y > canvas.height || guppy.y < 0) startGame();
    loop = requestAnimationFrame(gameLoop);
}

// --- PORTALS (VOID & EGO) ---
function toggleVoid() { document.getElementById('app').classList.toggle('void-active'); }
function stopVoid() { document.getElementById('app').classList.remove('void-active'); }

async function toggleEgo() {
    if (!egoStream) {
        try {
            egoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const v = document.createElement('video'); v.id = "ego-vid"; v.srcObject = egoStream; v.autoplay = true;
            v.style = "width:100%; height:100%; object-fit:cover; filter:invert(1) hue-rotate(90deg); position:absolute; top:0; left:0;";
            document.querySelector('.chat-area').appendChild(v);
            document.getElementById('messages').style.visibility = 'hidden';
        } catch (e) { alert("Need Camera!"); }
    } else { stopEgo(); }
}
function stopEgo() {
    if(egoStream) { egoStream.getTracks().forEach(t => t.stop()); egoStream = null; }
    const v = document.getElementById('ego-vid'); if(v) v.remove();
    document.getElementById('messages').style.visibility = 'visible';
}

// --- VOICE & CHAT ---
function requestCall() { socket.emit('request-call'); document.getElementById('call-btn').innerText = "Ringing..."; }
socket.on('incoming-call', () => { if(confirm("Accept call?")) { socket.emit('accept-call'); startCall(partnerPeerId); } });
socket.on('call-accepted', () => { document.getElementById('call-btn').innerText = "On Call 🟢"; document.getElementById('call-btn').disabled = true; });

async function startCall(id) {
    myStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const call = peer.call(id, myStream);
    call.on('stream', s => document.getElementById('remoteAudio').srcObject = s);
}
peer.on('call', c => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
        myStream = s; c.answer(s);
        c.on('stream', rs => document.getElementById('remoteAudio').srcObject = rs);
    });
});

function sendMessage() {
    const i = document.getElementById('chat-input');
    if(i.value) { socket.emit('send-msg', i.value); addMessage(i.value, 'me'); i.value = ''; }
}
function addMessage(t, c) {
    const d = document.createElement('div'); d.className = 'msg ' + c; d.innerText = t;
    document.getElementById('messages').appendChild(d); document.getElementById('messages').scrollTop = 9999;
}
socket.on('receive-msg', t => addMessage(t, 'stranger'));
socket.on('stranger-left', () => { addMessage('Stranger left.', 'system'); location.reload(); });
function handleSkip() { socket.emit('leave-chat'); location.reload(); }
function handleTyping(e) { if(e.key === 'Enter') sendMessage(); else socket.emit('typing'); }
function enableInput() { document.getElementById('chat-input').disabled = false; }
function disableInput() { document.getElementById('chat-input').disabled = true; }