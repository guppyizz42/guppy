const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('authenticate', (data) => {
        // Remove any stale entry for this socket
        users = users.filter(u => u.id !== socket.id);
        users.push({
            id: socket.id,
            uuid: data.uuid,
            peerId: data.peerId,
            status: 'idle',
            mode: null,
            tags: '',
            partner: null
        });
        io.emit('update-count', users.length);
    });

    socket.on('find-match', (data) => {
        const user = users.find(u => u.id === socket.id);
        if (!user) return;

        user.status = 'searching';
        user.mode = data.mode;
        user.tags = data.tags ? data.tags.toLowerCase().trim() : '';

        // Try exact interest match first
        let partner = users.find(u =>
            u.id !== socket.id &&
            u.status === 'searching' &&
            u.mode === user.mode &&
            user.tags !== '' &&
            u.tags === user.tags
        );

        if (partner) {
            finalizeMatch(user, partner);
        } else {
            // Wait 5s then match anyone in same mode
            setTimeout(() => {
                const u = users.find(u => u.id === socket.id);
                if (!u || u.status !== 'searching') return;

                let anyPartner = users.find(p =>
                    p.id !== socket.id &&
                    p.status === 'searching' &&
                    p.mode === u.mode
                );

                if (anyPartner) finalizeMatch(u, anyPartner);
            }, 5000);
        }
    });

    function finalizeMatch(u1, u2) {
        u1.status = 'chatting';
        u2.status = 'chatting';
        u1.partner = u2.id;
        u2.partner = u1.id;

        const commonTag = (u1.tags && u1.tags === u2.tags) ? u1.tags : null;

        io.to(u1.id).emit('match-found', { peerId: u2.peerId, commonInterest: commonTag, mode: u1.mode });
        io.to(u2.id).emit('match-found', { peerId: u1.peerId, commonInterest: commonTag, mode: u2.mode });
    }

    socket.on('send-msg', (msg) => {
        const user = users.find(u => u.id === socket.id);
        if (user && user.partner) {
            io.to(user.partner).emit('receive-msg', msg);
        }
    });

    socket.on('typing', () => {
        const user = users.find(u => u.id === socket.id);
        if (user && user.partner) {
            io.to(user.partner).emit('stranger-typing');
        }
    });

    socket.on('webrtc-signal', (data) => {
        const user = users.find(u => u.id === socket.id);
        if (user && user.partner) {
            io.to(user.partner).emit('webrtc-signal', data);
        }
    });

    socket.on('leave-chat', () => disconnectUser(socket.id));
    socket.on('disconnect', () => disconnectUser(socket.id));

    function disconnectUser(id) {
        const idx = users.findIndex(u => u.id === id);
        if (idx !== -1) {
            const user = users[idx];
            if (user.partner) {
                io.to(user.partner).emit('stranger-left');
                const partner = users.find(u => u.id === user.partner);
                if (partner) { partner.status = 'idle'; partner.partner = null; }
            }
            users.splice(idx, 1);
            io.emit('update-count', users.length);
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🐟 GUPPY running on port ${PORT}`));
