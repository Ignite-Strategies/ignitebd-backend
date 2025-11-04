import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import prisma from '../db.js';

/**
 * Socket.io Event Logic for Real-time Messaging
 *
 * Rooms: group-{groupId}
 * Events:
 *   - message:send → create message, emit message:new to room
 *   - join:group → join room for groupId
 *   - leave:group → leave room for groupId
 */

export function initializeSocket(server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: ['http://localhost:5173', 'https://ignitebd-frontend.vercel.app', 'https://ignitestrategies.co'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Socket client connected: ${socket.id}`);

    // Join a group room
    socket.on('join:group', async (data) => {
      const { groupId } = data;
      if (!groupId) {
        socket.emit('error', { message: 'groupId is required' });
        return;
      }

      const room = `group-${groupId}`;
      socket.join(room);
      console.log(`📨 Socket ${socket.id} joined room: ${room}`);
      socket.emit('joined:group', { groupId, room });
    });

    // Leave a group room
    socket.on('leave:group', (data) => {
      const { groupId } = data;
      if (!groupId) return;

      const room = `group-${groupId}`;
      socket.leave(room);
      console.log(`👋 Socket ${socket.id} left room: ${room}`);
    });

    // Send a new message
    socket.on('message:send', async (data) => {
      const { groupId, authorId, author, content } = data;

      // Validate input
      if (!groupId || !authorId || !author || !content) {
        socket.emit('error', { message: 'groupId, authorId, author, and content are required' });
        return;
      }

      try {
        // Create message in database
        // Note: You'll need to add a Message model to your Prisma schema if it doesn't exist
        const message = await prisma.message.create({
          data: {
            groupId,
            authorId,
            author,
            content
          }
        });

        console.log(`💬 Message created: ${message.id} for group ${groupId}`);

        // Broadcast to all clients in the group room
        const room = `group-${groupId}`;
        io.to(room).emit('message:new', {
          id: message.id,
          groupId: message.groupId,
          authorId: message.authorId,
          author: message.author,
          content: message.content,
          createdAt: message.createdAt
        });

        // Confirm to sender
        socket.emit('message:sent', { id: message.id });
      } catch (error) {
        console.error('❌ Error creating message:', error);
        socket.emit('error', { message: error.message || 'Failed to create message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`👋 Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}
