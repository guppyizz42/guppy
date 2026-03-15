let canvas, ctx, loop, gameRunning = false, pipes = [], score = 0, guppy = { x: 50, y: 150, v: 0 };

function toggleGame() {
    if (gameRunning) { stopGame(); return; }
    gameRunning = true;
    document.getElementById('messages').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    canvas = document.getElementById('gameCanvas'); ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight;
    guppy.y = canvas.height / 2; pipes = []; score = 0;
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
        p.x -= 3; ctx.fillStyle = "#2e2e2e";
        ctx.fillRect(p.x, 0, 40, p.t); ctx.fillRect(p.x, p.t + 120, 40, canvas.height);
        if(p.x < guppy.x && !p.p) { score++; p.p = true; document.getElementById('score').innerText = score; }
    });
    if(guppy.y > canvas.height || guppy.y < 0) toggleGame(); 
    loop = requestAnimationFrame(gameLoop);
}

window.addEventListener('stop-all-activities', stopGame);