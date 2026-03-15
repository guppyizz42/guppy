function toggleVoid() {
    document.body.classList.toggle('void-enabled');
}

function stopVoid() {
    document.body.classList.remove('void-enabled');
}

window.addEventListener('stop-all-activities', stopVoid);