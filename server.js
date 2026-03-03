const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// --- MODERATION DATA ---
const bannedIPs = new Map(); 
const userStrikes = new Map(); 
// You can add more words to this list below
const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'pussy', 'dick']; 

let waitingUsers = []; 
let onlineCount = 0;

function getStrikes(uuid) {
    if (!userStrikes.has(uuid)) {
        userStrikes.set(uuid, { slurs: 0, reporters: new Set() });
    }
    return userStrikes.get(uuid);
}

io.on('connection', (socket) => {
    const userIP = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    socket.ip = userIP;

    // Check if IP is currently banned
    if (bannedIPs.has(userIP) && bannedIPs.get(userIP) > Date.now()) {
        socket.emit('system-msg', 'You are currently banned for 1 hour.');
        socket.disconnect();
        return;
    }

    onlineCount++;
    io.emit('update-count', onlineCount);

    socket.on('authenticate', (uuid) => { socket.uuid = uuid; });

    socket.on('find-match', (data) => {
        socket.interest = data.tags ? data.tags.toLowerCase() : "";
        let match = waitingUsers.find(u => u.id !== socket.id && (u.interest === socket.interest || !socket.interest));
        
        if (match) {
            waitingUsers = waitingUsers.filter(u => u.id !== match.id);
            const roomName = `room-${socket.id}-${match.id}`;
            socket.join(roomName);
            match.join(roomName);
            socket.room = roomName;
            match.room = roomName;
            socket.partnerUUID = match.uuid;
            match.partnerUUID = socket.uuid;
            io.to(roomName).emit('match-found');
        } else {
            waitingUsers.push(socket);
        }
    });

    socket.on('send-msg', (msg) => {
        if (!socket.room) return;
        const lowerMsg = msg.toLowerCase();
        const containsSlur = badWords.some(word => lowerMsg.includes(word));
        
        if (containsSlur) {
            const strikes = getStrikes(socket.uuid);
            strikes.slurs += 1;
            if (strikes.slurs === 5) {
                socket.emit('show-warning', 'daddy chill, or else you will get banned');
            } else if (strikes.slurs >= 6) {
                bannedIPs.set(socket.ip, Date.now() + 3600000); // 1 hour
                socket.disconnect();
                return;
            }
        }
        socket.to(socket.room).emit('receive-msg', msg);
    });

    socket.on('report-user', () => {
        if (!socket.room || !socket.partnerUUID) return;
        const strikes = getStrikes(socket.partnerUUID);
        strikes.reporters.add(socket.uuid);
        
        const partnerId = [...io.sockets.adapter.rooms.get(socket.room)].find(id => id !== socket.id);
        const partner = io.sockets.sockets.get(partnerId);

        if (strikes.reporters.size === 5 && partner) {
            partner.emit('show-warning', 'daddy chill, or else you will get banned');
        } else if (strikes.reporters.size >= 6 && partner) {
            bannedIPs.set(partner.ip, Date.now() + 3600000);
            partner.disconnect();
        }
    });

    socket.on('leave-chat', () => {
        if (socket.room) {
            socket.to(socket.room).emit('stranger-left');
            socket.leave(socket.room);
            socket.room = null;
        }
    });

    socket.on('disconnect', () => {
        onlineCount--;
        io.emit('update-count', onlineCount);
        if (socket.room) socket.to(socket.room).emit('stranger-left');
        waitingUsers = waitingUsers.filter(u => u.id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Guppy running on ${PORT}`));

// CRITICAL FOR DEPLOYMENT: Listen on the Port provided by the host
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Guppy deployed on port ${PORT}`);
});
