const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

app.use(express.static(__dirname));

let users = [];

io.on('connection', (socket) => {
    console.log('Node connected:', socket.id);

    // 1. Initial Authentication
    socket.on('authenticate', (data) => {
        // Clean old sessions for the same socket ID
        users = users.filter(u => u.id !== socket.id); 
        users.push({ 
            id: socket.id, 
            peerId: data.peerId, 
            status: 'idle', 
            partner: null,
            mode: null 
        });
        io.emit('update-count', users.length);
    });

    // 2. The Matching Logic
    socket.on('find-match', (data) => {
        const user = users.find(u => u.id === socket.id);
        if (!user) return;

        user.status = 'searching';
        user.mode = data.mode; // 'text', 'voice', or 'video'

        // Find someone else who is 'searching' in the SAME 'mode'
        let partner = users.find(p => 
            p.id !== socket.id && 
            p.status === 'searching' && 
            p.mode === user.mode
        );

        if (partner) {
            user.status = partner.status = 'chatting';
            user.partner = partner.id;
            partner.partner = user.id;

            // Signal both users that a match is found
            // We send the partner's PeerId so WebRTC can begin
            io.to(user.id).emit('match-found', { peerId: partner.peerId, mode: user.mode });
            io.to(partner.id).emit('match-found', { peerId: user.peerId, mode: partner.mode });
        }
    });

    // 3. Text Messaging
    socket.on('send-msg', (msg) => {
        const u = users.find(u => u.id === socket.id);
        if (u && u.partner) {
            io.to(u.partner).emit('receive-msg', msg);
        }
    });

    // 4. WebRTC Signaling (The Handshake for Voice/Video)
    // This passes the SDP and ICE candidates between the two peers
    socket.on('webrtc-signal', (data) => {
        const u = users.find(u => u.id === socket.id);
        if (u && u.partner) {
            io.to(u.partner).emit('webrtc-signal', data);
        }
    });

    // 5. Video Call Handshake (Accept/Deny Logic)
    socket.on('video-request', () => {
        const u = users.find(usr => usr.id === socket.id);
        if (u && u.partner) io.to(u.partner).emit('video-request-received');
    });

    socket.on('video-accepted', () => {
        const u = users.find(usr => usr.id === socket.id);
        if (u && u.partner) {
            io.to(u.partner).emit('start-peer-video');
            io.to(u.id).emit('start-peer-video');
        }
    });

    socket.on('video-denied', () => {
        const u = users.find(usr => usr.id === socket.id);
        if (u && u.partner) io.to(u.partner).emit('video-denied-notify');
    });

    // 6. Skipping / Disconnecting
    const handleDisconnect = () => {
        const idx = users.findIndex(u => u.id === socket.id);
        if (idx !== -1) {
            const user = users[idx];
            if (user.partner) {
                // Tell the partner you left
                io.to(user.partner).emit('stranger-left');
                const partner = users.find(p => p.id === user.partner);
                if (partner) { 
                    partner.status = 'idle'; 
                    partner.partner = null; 
                }
            }
            users.splice(idx, 1);
            io.emit('update-count', users.length);
        }
    };

    socket.on('leave-chat', handleDisconnect);
    socket.on('disconnect', handleDisconnect);
});

// Render dynamic port selection
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`GUPPY Mesh active on port ${PORT}`);
});
