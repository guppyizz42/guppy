// void.js — The Void Portal
let voidActive = false;

function toggleVoid() {
    voidActive = !voidActive;
    document.body.classList.toggle('void-enabled', voidActive);
}

function stopVoid() {
    voidActive = false;
    document.body.classList.remove('void-enabled');
}

window.addEventListener('stop-all-activities', stopVoid);
