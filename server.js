const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(__dirname));

let users = [];

io.on('connection', (socket) => {
    socket.on('authenticate', (data) => {
        users = users.filter(u => u.id !== socket.id);
        users.push({ id: socket.id, peerId: data.peerId, status: 'idle' });
        io.emit('update-count', users.length);
    });

    socket.on('find-match', (data) => {
        const user = users.find(u => u.id === socket.id);
        if (!user) return;
        user.status = 'searching';
        user.mode = data.mode;

        let partner = users.find(p => p.id !== socket.id && p.status === 'searching' && p.mode === user.mode);
        if (partner) {
            user.status = user.partner = partner.id;
            partner.status = partner.partner = user.id;
            io.to(user.id).emit('match-found', { peerId: partner.peerId });
            io.to(partner.id).emit('match-found', { peerId: user.peerId });
        }
    });

    socket.on('send-msg', (msg) => {
        const u = users.find(u => u.id === socket.id);
        if (u && u.partner) io.to(u.partner).emit('receive-msg', msg);
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('update-count', users.length);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));