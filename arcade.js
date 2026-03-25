/**
 * GUPPY | ARCADE MODULE
 * A simple "Matrix Snake" to play while waiting for nodes.
 */

let gameInterval = null;
let canvas = null;
let ctx = null;
let snake = [{x: 10, y: 10}];
let food = {x: 5, y: 5};
let dx = 1;
let dy = 0;

window.toggleGame = function() {
    const chatArea = document.querySelector('.chat-area');
    const existingCanvas = document.getElementById('arcade-canvas');

    if (existingCanvas) {
        window.stopGame();
        return;
    }

    // Create Canvas
    canvas = document.createElement('canvas');
    canvas.id = 'arcade-canvas';
    canvas.width = chatArea.clientWidth;
    canvas.height = chatArea.clientHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '100';
    canvas.style.background = '#000';
    chatArea.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Hide messages while playing
    document.getElementById('messages').style.visibility = 'hidden';

    // Controls
    window.addEventListener('keydown', changeDirection);
    gameInterval = setInterval(drawGame, 100);
};

function drawGame() {
    // Move Snake
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head);

    // Eat Food
    if (head.x === food.x && head.y === food.y) {
        food = {x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20)};
    } else {
        snake.pop();
    }

    // Wall Collision
    if (head.x < 0 || head.x > 25 || head.y < 0 || head.y > 25) {
        window.stopGame();
        alert("SYSTEM HALT: Link Severed.");
        return;
    }

    // Render
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#39ff14"; // Toxic Green
    snake.forEach(part => ctx.fillRect(part.x * 20, part.y * 20, 18, 18));

    ctx.fillStyle = "red";
    ctx.fillRect(food.x * 20, food.y * 20, 18, 18);
}

function changeDirection(e) {
    if (e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -1; }
    if (e.key === "ArrowDown" && dy === 0) { dx = 0; dy = 1; }
    if (e.key === "ArrowLeft" && dx === 0) { dx = -1; dy = 0; }
    if (e.key === "ArrowRight" && dx === 0) { dx = 1; dy = 0; }
}

window.stopGame = function() {
    clearInterval(gameInterval);
    const c = document.getElementById('arcade-canvas');
    if (c) c.remove();
    document.getElementById('messages').style.visibility = 'visible';
    window.removeEventListener('keydown', changeDirection);
};

window.addEventListener('stop-all-activities', window.stopGame);
