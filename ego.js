let egoStream = null;

async function toggleEgo() {
    if (!egoStream) {
        try {
            egoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const v = document.createElement('video');
            v.id = "ego-vid"; v.srcObject = egoStream; v.autoplay = true;
            v.style = "width:100%; height:100%; object-fit:cover; filter:invert(1) hue-rotate(180deg) contrast(3); position:absolute; top:0; left:0; z-index:100;";
            document.querySelector('.chat-area').appendChild(v);
            document.getElementById('messages').style.visibility = 'hidden';
        } catch (e) { alert("Camera required."); }
    } else { stopEgo(); }
}

function stopEgo() {
    if (egoStream) { egoStream.getTracks().forEach(t => t.stop()); egoStream = null; }
    const v = document.getElementById('ego-vid'); if (v) v.remove();
    document.getElementById('messages').style.visibility = 'visible';
}

window.addEventListener('stop-all-activities', stopEgo);