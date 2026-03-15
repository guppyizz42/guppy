const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve all your modular files (index.html, client.js, void.js, etc.)
app.use(express.static(__dirname));

let users = []; // Store active users: { id, uuid, peerId, mode, tags, status }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. Initial Authentication
    socket.on('authenticate', (data) => {
        users.push({
            id: socket.id,
            uuid: data.uuid,
            peerId: data.peerId,
            status: 'idle',
            mode: null,
            tags: null
        });
        io.emit('update-count', users.length);
    });

    // 2. The Matchmaking Logic (With Interest Priority)
    socket.on('find-match', (data) => {
        const user = users.find(u => u.id === socket.id);
        if (!user) return;

        user.status = 'searching';
        user.mode = data.mode;
        user.tags = data.tags ? data.tags.toLowerCase().trim() : "";

        // Attempt 1: Look for an exact interest match
        let partner = users.find(u => 
            u.id !== socket.id && 
            u.status === 'searching' && 
            u.mode === user.mode && 
            user.tags !== "" && 
            u.tags === user.tags
        );

        // Attempt 2: If no interest match, wait 5 seconds, then allow any match
        if (!partner) {
            setTimeout(() => {
                const refreshedUser = users.find(u => u.id === socket.id);
                if (!refreshedUser || refreshedUser.status !== 'searching') return;

                // Look for anyone in the same mode
                let anyPartner = users.find(u => 
                    u.id !== socket.id && 
                    u.status === 'searching' && 
                    u.mode === refreshedUser.mode
                );

                if (anyPartner) {
                    finalizeMatch(refreshedUser, anyPartner);
                }
            }, 5000); // 5-second "Interest Priority" window
        } else {
            finalizeMatch(user, partner);
        }
    });

    function finalizeMatch(u1, u2) {
        u1.status = 'chatting';
        u2.status = 'chatting';
        u1.partner = u2.id;
        u2.partner = u1.id;

        const commonTag = (u1.tags === u2.tags && u1.tags !== "") ? u1.tags : null;

        io.to(u1.id).emit('match-found', { peerId: u2.peerId, commonInterest: commonTag });
        io.to(u2.id).emit('match-found', { peerId: u1.peerId, commonInterest: commonTag });
    }

    // 3. Communication & Disconnects
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

    socket.on('request-call', () => {
        const user = users.find(u => u.id === socket.id);
        if (user && user.partner) io.to(user.partner).emit('incoming-call');
    });

    socket.on('accept-call', () => {
        const user = users.find(u => u.id === socket.id);
        if (user && user.partner) {
            io.to(user.id).emit('call-accepted');
            io.to(user.partner).emit('call-accepted');
        }
    });

    socket.on('leave-chat', () => disconnectUser(socket.id));
    socket.on('disconnect', () => disconnectUser(socket.id));

    function disconnectUser(id) {
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            const user = users[userIndex];
            if (user.partner) {
                io.to(user.partner).emit('stranger-left');
                const partner = users.find(u => u.id === user.partner);
                if (partner) partner.status = 'idle';
            }
            users.splice(userIndex, 1);
            io.emit('update-count', users.length);
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

