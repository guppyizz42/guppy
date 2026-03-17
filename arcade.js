// arcade.js — Flappy Fish game
let canvas, ctx, animLoop;
let gameRunning = false;
let gameOver = false;
let pipes = [];
let score = 0;
let guppy = { x: 70, y: 200, v: 0, size: 30 };

const GRAVITY = 0.45;
const FLAP = -7;
const PIPE_SPEED = 3;
const PIPE_GAP = 130;
const PIPE_WIDTH = 45;

function toggleGame() {
    if (gameRunning || gameOver) {
        stopGame();
    } else {
        startGame();
    }
}

function startGame() {
    gameRunning = true;
    gameOver = false;

    document.getElementById('game-container').style.display = 'flex';
    document.getElementById('messages').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('score').style.display = 'block';

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    guppy = { x: 70, y: canvas.height / 2, v: 0, size: 28 };
    pipes = [];
    score = 0;
    document.getElementById('score').innerText = '0';

    canvas.onclick = flap;
    document.addEventListener('keydown', onKeyFlap);

    spawnPipe();
    animLoop = requestAnimationFrame(gameFrame);
}

function spawnPipe() {
    if (!gameRunning) return;
    const minTop = 60;
    const maxTop = canvas.height - PIPE_GAP - 60;
    const topH = Math.random() * (maxTop - minTop) + minTop;
    pipes.push({ x: canvas.width, topH, scored: false });
    setTimeout(spawnPipe, 1800);
}

function flap() {
    if (gameRunning && !gameOver) guppy.v = FLAP;
}

function onKeyFlap(e) {
    if (e.code === 'Space' || e.key === ' ') flap();
}

function gameFrame() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Guppy physics
    guppy.v += GRAVITY;
    guppy.y += guppy.v;

    // Draw guppy
    ctx.font = `${guppy.size}px serif`;
    ctx.save();
    if (guppy.v > 2) {
        ctx.translate(guppy.x + guppy.size / 2, guppy.y);
        ctx.rotate(Math.min(guppy.v * 0.06, 0.5));
        ctx.fillText('🐟', -guppy.size / 2, 0);
    } else {
        ctx.fillText('🐟', guppy.x, guppy.y);
    }
    ctx.restore();

    // Draw & move pipes
    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;

        // Pipe color
        ctx.fillStyle = '#4a7c4a';
        ctx.strokeStyle = '#2e5c2e';
        ctx.lineWidth = 2;

        // Top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);

        // Bottom pipe
        const bottomY = pipe.topH + PIPE_GAP;
        ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, canvas.height - bottomY);
        ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, canvas.height - bottomY);

        // Pipe caps
        ctx.fillStyle = '#5a9c5a';
        ctx.fillRect(pipe.x - 4, pipe.topH - 15, PIPE_WIDTH + 8, 15);
        ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 15);

        // Score when passing pipe
        if (!pipe.scored && pipe.x + PIPE_WIDTH < guppy.x) {
            score++;
            pipe.scored = true;
            document.getElementById('score').innerText = score;
        }

        // Collision detection
        const gx = guppy.x + 4;
        const gy = guppy.y - guppy.size + 4;
        const gw = guppy.size - 8;
        const gh = guppy.size - 8;

        const inPipeX = gx + gw > pipe.x && gx < pipe.x + PIPE_WIDTH;
        const hitsTop = gy < pipe.topH;
        const hitsBottom = gy + gh > pipe.topH + PIPE_GAP;

        if (inPipeX && (hitsTop || hitsBottom)) {
            endGame();
            return;
        }
    });

    // Remove off-screen pipes
    pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);

    // Wall collisions
    if (guppy.y > canvas.height || guppy.y < 0) {
        endGame();
        return;
    }

    animLoop = requestAnimationFrame(gameFrame);
}

function endGame() {
    gameRunning = false;
    gameOver = true;
    cancelAnimationFrame(animLoop);
    document.removeEventListener('keydown', onKeyFlap);

    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('final-score').innerText = `Score: ${score}`;
    document.getElementById('score').style.display = 'none';
}

function restartGame() {
    stopGame();
    setTimeout(startGame, 100);
}

function stopGame() {
    gameRunning = false;
    gameOver = false;
    cancelAnimationFrame(animLoop);
    document.removeEventListener('keydown', onKeyFlap);
    pipes = [];

    document.getElementById('game-container').style.display = 'none';
    document.getElementById('messages').style.display = 'flex';
}

window.addEventListener('stop-all-activities', stopGame);
