const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Render fix: Look in the root folder for index.html
app.use(express.static(__dirname));

// --- MODERATION DATA ---
const bannedIPs = new Map(); 
const userStrikes = new Map(); 
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

    if (bannedIPs.has(userIP) && bannedIPs.get(userIP) > Date.now()) {
        socket.emit('system-msg', 'You are currently banned for 1 hour.');
        socket.disconnect();
        return;
    }

    onlineCount++;
    io.emit('update-count', onlineCount);

    socket.on('authenticate', (data) => {
        socket.uuid = data.uuid;
        socket.peerId = data.peerId;
    });

    // --- MATCHMAKING ---
    socket.on('find-match', (data) => {
        socket.interest = (data && data.tags) ? data.tags.toLowerCase().trim() : "";
        socket.mode = data.mode; // 'text' or 'voice'
        
        // Find someone with same mode, and either same tag or no tag preference
        let matchIndex = waitingUsers.findIndex(u => 
            u.id !== socket.id && 
            u.mode === socket.mode &&
            (u.interest === socket.interest || !socket.interest || !u.interest)
        );
        
        if (matchIndex !== -1) {
            let match = waitingUsers.splice(matchIndex, 1)[0];
            const roomName = `room-${socket.id}-${match.id}`;
            
            socket.join(roomName);
            match.join(roomName);
            socket.room = roomName;
            match.room = roomName;
            socket.partnerUUID = match.uuid;
            match.partnerUUID = socket.uuid;

            // Send each other's PeerJS IDs for voice calls
            socket.emit('match-found', { peerId: match.peerId });
            match.emit('match-found', { peerId: socket.peerId });
        } else {
            waitingUsers.push(socket);
        }
    });

    // --- CHAT & MODERATION ---
    socket.on('send-msg', (msg) => {
        if (!socket.room) return;
        
        const lowerMsg = msg.toLowerCase();
        const containsSlur = badWords.some(word => lowerMsg.includes(word));
        const containsLink = lowerMsg.includes('.com') || lowerMsg.includes('http');
        
        if (containsSlur || containsLink) {
            const strikes = getStrikes(socket.uuid);
            strikes.slurs += 1;
            
            if (strikes.slurs === 5) {
                socket.emit('show-warning', 'daddy chill!, or else you will get banned');
            } else if (strikes.slurs >= 6) {
                bannedIPs.set(socket.ip, Date.now() + 3600000); // 1 Hour Ban
                socket.disconnect();
                return;
            }
        }
        socket.to(socket.room).emit('receive-msg', msg);
    });

    socket.on('typing', () => {
        if (socket.room) socket.to(socket.room).emit('stranger-typing');
    });

    // --- CALL SIGNALING ---
    socket.on('request-call', () => {
        if (socket.room) socket.to(socket.room).emit('incoming-call');
    });

    // --- REPORTING ---
    socket.on('report-user', () => {
        if (!socket.room || !socket.partnerUUID) return;
        const strikes = getStrikes(socket.partnerUUID);
        strikes.reporters.add(socket.uuid);
        
        const room = io.sockets.adapter.rooms.get(socket.room);
        if (room) {
            const partnerId = [...room].find(id => id !== socket.id);
            const partner = io.sockets.sockets.get(partnerId);
            if (partner) {
                if (strikes.reporters.size === 5) {
                    partner.emit('show-warning', 'daddy chill!, or else you will get banned');
                } else if (strikes.reporters.size >= 6) {
                    bannedIPs.set(partner.ip, Date.now() + 3600000);
                    partner.disconnect();
                }
            }
        }
    });

    // --- SMART SKIP & DISCONNECT ---
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
server.listen(PORT, '0.0.0.0', () => console.log(`Guppy server live on ${PORT}`));
