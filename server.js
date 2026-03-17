const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = [];

io.on('connection', (socket) => {
    socket.on('authenticate', (data) => {
        users = users.filter(u => u.id !== socket.id);
        users.push({ id: socket.id, peerId: data.peerId, status: 'idle', mode: null, tags: '', partner: null });
        io.emit('update-count', users.length);
    });

    socket.on('find-match', (data) => {
        const user = users.find(u => u.id === socket.id);
        if (!user) return;
        user.status = 'searching';
        user.mode = data.mode;
        user.tags = data.tags ? data.tags.toLowerCase().trim() : '';

        let partner = users.find(u => u.id !== socket.id && u.status === 'searching' && u.mode === user.mode && user.tags !== '' && u.tags === user.tags);

        if (partner) {
            finalizeMatch(user, partner);
        } else {
            setTimeout(() => {
                const u = users.find(u => u.id === socket.id);
                if (!u || u.status !== 'searching') return;
                let anyP = users.find(p => p.id !== socket.id && p.status === 'searching' && p.mode === u.mode);
                if (anyP) finalizeMatch(u, anyP);
            }, 5000);
        }
    });

    function finalizeMatch(u1, u2) {
        if (u1.status !== 'searching' || u2.status !== 'searching') return;
        u1.status = u2.status = 'chatting';
        u1.partner = u2.id; u2.partner = u1.id;
        const tag = (u1.tags === u2.tags) ? u1.tags : null;
        io.to(u1.id).emit('match-found', { peerId: u2.peerId, commonInterest: tag, mode: u1.mode });
        io.to(u2.id).emit('match-found', { peerId: u1.peerId, commonInterest: tag, mode: u2.mode });
    }

    socket.on('send-msg', (msg) => {
        const u = users.find(u => u.id === socket.id);
        if (u && u.partner) io.to(u.partner).emit('receive-msg', msg);
    });

    socket.on('webrtc-signal', (data) => {
        const u = users.find(u => u.id === socket.id);
        if (u && u.partner) io.to(u.partner).emit('webrtc-signal', data);
    });

    socket.on('disconnect', () => {
        const idx = users.findIndex(u => u.id === socket.id);
        if (idx !== -1) {
            if (users[idx].partner) io.to(users[idx].partner).emit('stranger-left');
            users.splice(idx, 1);
            io.emit('update-count', users.length);
        }
    });
});

s// Replace the last few lines of server.js with this:
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`GUPPY Engine active on port ${PORT}`);
});
