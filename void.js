function toggleVoid() {
    const app = document.getElementById('app');
    app.classList.toggle('void-active');
    
    if (app.classList.contains('void-active')) {
        console.log("Entering the void...");
    }
}

// Ensure the void ends when a match is found
socket.on('match-found', () => {
    document.getElementById('app').classList.remove('void-active');
});