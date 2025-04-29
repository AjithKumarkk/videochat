const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const cors = require('cors');

app.use(cors());

const io = new Server(server, {
    cors: {
        origin: "*",  // Allow all origins
        methods: ["GET", "POST"]
    }
});

// Track connected users and last activity time
const connectedUsers = new Map();
let lastActivityTime = Date.now();
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Check for inactivity every minute
setInterval(() => {
    const currentTime = Date.now();
    if (currentTime - lastActivityTime > INACTIVITY_TIMEOUT) {
        // Clear all users and reset chat if inactive for 5 minutes
        if (connectedUsers.size > 0) {
            io.emit('chat message', {
                type: 'system',
                content: 'Chat has been cleared due to inactivity',
                timestamp: new Date().toISOString()
            });
            io.emit('clear chat');
            connectedUsers.clear();
        }
    }
}, 60000); // Check every minute

io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Update activity timestamp on connection
    lastActivityTime = Date.now();
    
    // Handle user joining with username and profile pic
    // Update the user join event handler
    socket.on('user join', (username) => {
        // Store user information
        connectedUsers.set(socket.id, { 
            username, 
            joinTime: Date.now(),
        });
        
        // Announce user joined with timestamp
        io.emit('chat message', {
            type: 'system',
            content: `${username} joined conversation`,
            timestamp: new Date().toISOString()
        });
    });
    
    // Update the disconnect event handler
    socket.on('disconnect', () => {
        console.log('User disconnected');
        
        // Get the username of the disconnected user
        const userData = connectedUsers.get(socket.id);
        if (userData) {
            const { username } = userData;
            
            // Announce user left with timestamp
            io.emit('chat message', {
                type: 'system',
                content: `${username} left conversation`,
                timestamp: new Date().toISOString()
            });
            
            // Remove user from connected users
            connectedUsers.delete(socket.id);
        }
    });
    socket.on('chat message', (data) => {
        // Update activity timestamp
        lastActivityTime = Date.now();
        
        // Add timestamp if not present
        if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
        }
        
        // Update user profile pic in connected users if available
        if (data.sender && data.senderProfilePic && connectedUsers.has(socket.id)) {
            const userData = connectedUsers.get(socket.id);
            userData.profilePic = data.senderProfilePic;
            connectedUsers.set(socket.id, userData);
        }
        
        // Broadcast the message to all connected clients
        io.emit('chat message', data);
    });
    // Add this inside your socket.on('connection') handler
    socket.on('ping', () => {
      console.log('Received ping from client');
      socket.emit('pong');
    });
});

server.listen(3001, '0.0.0.0', () => {
    console.log('Server running on port 3001');
});