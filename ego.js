let eStream = null;

window.toggleEgo = async () => {
    if (eStream) { window.stopEgo(); return; }
    try {
        eStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const v = document.createElement('video');
        v.id = "ego-vid"; v.srcObject = eStream; v.autoplay = true; v.muted = true;
        document.querySelector('.chat-area').appendChild(v);
        document.querySelector('.chat-area').classList.add('ego-active');
        document.getElementById('messages').style.visibility = 'hidden';
    } catch (e) { alert("Camera denied."); }
};

window.stopEgo = () => {
    if (eStream) eStream.getTracks().forEach(t => t.stop());
    eStream = null;
    const v = document.getElementById('ego-vid'); if (v) v.remove();
    document.querySelector('.chat-area').classList.remove('ego-active');
    document.getElementById('messages').style.visibility = 'visible';
};
window.addEventListener('stop-all-activities', window.stopEgo);