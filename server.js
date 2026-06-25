const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Handle creating a room
    socket.on('createRoom', (playerName) => {
        const roomId = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit room code
        rooms[roomId] = {
            players: [{ id: socket.id, name: playerName, cards: [] }],
            deck: [],
            discardPile: [],
            currentTurn: 0,
            gameStarted: false
        };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, players: rooms[roomId].players });
        console.log(`Room ${roomId} created by ${playerName}`);
    });

    // Handle joining a room
    socket.on('joinRoom', ({ roomId, playerName }) => {
        if (rooms[roomId]) {
            if (rooms[roomId].players.length < 4 && !rooms[roomId].gameStarted) {
                rooms[roomId].players.push({ id: socket.id, name: playerName, cards: [] });
                socket.join(roomId);
                io.to(roomId).emit('playerJoined', { players: rooms[roomId].players });
                console.log(`${playerName} joined Room ${roomId}`);
            } else {
                socket.emit('error', 'Room is full or game already started.');
            }
        } else {
            socket.emit('error', 'Room not found.');
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        // Clean up rooms if empty
        for (let roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            } else {
                io.to(roomId).emit('playerJoined', { players: rooms[roomId].players });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
