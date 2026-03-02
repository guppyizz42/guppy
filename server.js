const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let waitingQueue = [];
let onlineCount = 0;
const bans = new Map(); 
const BAN_DURATION = 60 * 60 * 1000; 

const isBanned = (id) => bans.has(id) && Date.now() < bans.get(id);
const banUser = (id) => bans.set(id, Date.now() + BAN_DURATION);

const containsLink = (text) => {
    const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9]+\.[a-zA-Z]{2,})/i;
    return urlPattern.test(text);
};

const hasCommonTag = (tags1, tags2) => {
    if (!tags1.length || !tags2.length) return true; 
    return tags1.some(tag => tags2.includes(tag.toLowerCase()));
};

io.on('connection', (socket) => {
    const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    
    socket.on('authenticate', (uuid) => {
        if (isBanned(clientIP) || isBanned(uuid)) {
            socket.emit('system-msg', 'Access restricted.');
            socket.disconnect(true);
            return;
        }
        socket.uuid = uuid;
        onlineCount++;
        io.emit('update-count', onlineCount);
    });

    socket.on('find-match', (data) => {
        if (data.honeypot) { banUser(clientIP); socket.disconnect(true); return; }
        const userTags = data.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        let partnerIndex = waitingQueue.findIndex(p => p.mode === data.mode && hasCommonTag(userTags, p.tags));
        if (partnerIndex === -1) partnerIndex = waitingQueue.findIndex(p => p.mode === data.mode);

        if (partnerIndex !== -1) {
            const partner = waitingQueue.splice(partnerIndex, 1)[0].socket;
            const roomName = `room-${socket.id}-${partner.id}`;
            socket.join(roomName);
            partner.join(roomName);
            io.to(roomName).emit('match-found', { msg: 'Connected.', mode: data.mode });
        } else {
            waitingQueue.push({ socket, mode: data.mode, tags: userTags });
            socket.emit('status', 'Waiting for a signal...');
        }
    });

    socket.on('send-msg', (text) => {
        if (containsLink(text)) { socket.emit('system-msg', 'Security block: No links.'); return; }
        const room = Array.from(socket.rooms).find(r => r.startsWith('room-'));
        if (room) socket.to(room).emit('receive-msg', text);
    });

    socket.on('typing', () => {
        const room = Array.from(socket.rooms).find(r => r.startsWith('room-'));
        if (room) socket.to(room).emit('stranger-typing');
    });

    socket.on('stop-typing', () => {
        const room = Array.from(socket.rooms).find(r => r.startsWith('room-'));
        if (room) socket.to(room).emit('stranger-stopped-typing');
    });

    socket.on('request-voice', () => {
        const room = Array.from(socket.rooms).find(r => r.startsWith('room-'));
        if (room) socket.to(room).emit('voice-requested');
    });

    socket.on('accept-voice', () => {
        const room = Array.from(socket.rooms).find(r => r.startsWith('room-'));
        if (room) io.to(room).emit('voice-accepted');
    });

    socket.on('send-peer-id', (id) => {
        const room = Array.from(socket.rooms).find(r => r.startsWith('room-'));
        if (room) socket.to(room).emit('receive-peer-id', id);
    });

    socket.on('report-user', () => {
        const room = Array.from(socket.rooms).find(r => r.startsWith('room-'));
        if (room) {
            const partnerSockets = io.sockets.adapter.rooms.get(room);
            for (const clientId of partnerSockets) {
                if (clientId !== socket.id) {
                    const partnerSocket = io.sockets.sockets.get(clientId);
                    if(partnerSocket) {
                        banUser(partnerSocket.handshake.address);
                        if (partnerSocket.uuid) banUser(partnerSocket.uuid);
                        partnerSocket.disconnect(true);
                    }
                }
            }
        }
    });

    const handleLeave = () => {
        const room = Array.from(socket.rooms).find(r => r.startsWith('room-'));
        if (room) { socket.to(room).emit('stranger-left'); socket.leave(room); }
        waitingQueue = waitingQueue.filter(u => u.socket.id !== socket.id);
    };

    socket.on('leave-chat', handleLeave);
    socket.on('disconnect', () => {
        handleLeave();
        if (socket.uuid) { onlineCount = Math.max(0, onlineCount - 1); io.emit('update-count', onlineCount); }
    });
});

// CRITICAL FOR DEPLOYMENT: Listen on the Port provided by the host
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Guppy deployed on port ${PORT}`);
});