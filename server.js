// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './middleware/jwt.js';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const prisma = new PrismaClient();

// CORS and Body Parsers
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.options('*', cors());
app.use(express.json());
app.use(cookieParser());

// Logging Middleware for all incoming requests
app.use((req, res, next) => {
  console.log('🔹 Received Request:');
  console.log('➡️ Method:', req.method);
  console.log('➡️ Path:', req.path);
  console.log('➡️ Headers:', req.headers);
  console.log('➡️ Cookies:', req.cookies);
  console.log('➡️ Body:', req.body);
  next();
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy' });
});

// Import API Routes
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import communityCommentRoutes from './routes/community/communityCommentRoutes.js';
import communityMemberRoutes from './routes/community/communityMemberRoutes.js';
import communityPostRoutes from './routes/community/communityPostRoutes.js';
import communityRoutes from './routes/community/communityRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import followRoutes from './routes/followRoutes.js';
import gigBookmarkRoutes from './routes/gig/gigBookmarkRoutes.js';
import gigLikeRoutes from './routes/gig/gigLikeRoutes.js';
import gigOrderRoutes from './routes/gig/gigOrderRoutes.js';
import gigReviewRoutes from './routes/gig/gigReviewRoutes.js';
import gigRoutes from './routes/gig/gigRoutes.js';
import gigStarsRoutes from './routes/gig/gigStarsRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import gigOrderUpdateRoutes from './routes/gig/gigOrderUpdateRoutes.js';
import gigDeliveryRoutes from './routes/gig/gigDileveryRoutes.js';
import productRoutes from './routes/warehouse/productRoutes.js';
import orderRoutes from './routes/warehouse/orderRoutes.js';
import warehouseRoutes from './routes/warehouse/warehouseRoutes.js';
import stockRoutes from './routes/warehouse/stockRoutes.js';
import reportRoutes from './routes/warehouse/reportRoutes.js';
import storeRoutes from './routes/store/storeRoutes.js';
import variantRoutes from './routes/warehouse/variantRoutes.js';
import shipmentRoutes from './routes/warehouse/shipmentRoutes.js';
import productDisplayRoutes from './routes/warehouse/productDisplayRoutes.js';

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/community-comments', communityCommentRoutes);
app.use('/api/community-members', communityMemberRoutes);
app.use('/api/community-posts', communityPostRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/conversations', verifyToken, conversationRoutes);
app.use('/api/follows', verifyToken, followRoutes);
app.use('/api/gig-bookmarks', verifyToken, gigBookmarkRoutes);
app.use('/api/gig-toggles-likes', gigLikeRoutes);
app.use('/api/gig-orders', gigOrderRoutes);
app.use('/api/gig-reviews', gigReviewRoutes);
app.use('/api/gig-stars', gigStarsRoutes);
app.use('/api/gig-deliveries', gigDeliveryRoutes);
app.use('/api/gig-order-updates', gigOrderUpdateRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/messages', verifyToken, messageRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);
app.use('/api/transactions', verifyToken, transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/product-display', productDisplayRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  const errorStatus = err.status || 500;
  const errorMessage = err.message || 'Something went wrong!';
  res.status(errorStatus).json({ error: errorMessage });
});

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinRoom', (conversationId) => {
    console.log(`Socket ${socket.id} joining room ${conversationId}`);
    socket.join(conversationId);
  });

  socket.on('newMessage', async (data) => {
    // Expected data: { conversationId, message }
    // where message is an object: { id, userId, content, createdAt, status }
    console.log(
      `Socket ${socket.id} new message in ${data.conversationId}:`,
      data.message
    );

    try {
      const { conversationId, message } = data;
      
      // Save only the relevant parts to the database
      const newMessage = await prisma.message.create({
        data: {
          conversationId,
          userId: message.userId,
          content: message.content,
        },
      });

      // Update conversation details like lastMessage and read flags
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (conversation) {
        let updateData = { lastMessage: message.content };
        if (conversation.user1Id === message.userId) {
          updateData.readByUser1 = true;
          updateData.readByUser2 = false;
        } else if (conversation.user2Id === message.userId) {
          updateData.readByUser2 = true;
          updateData.readByUser1 = false;
        }
        await prisma.conversation.update({
          where: { id: conversationId },
          data: updateData,
        });
      }

      // Broadcast the saved message to other clients in the same conversation room
      socket.to(conversationId).emit('messageReceived', newMessage);
    } catch (err) {
      console.error('Error storing message:', err);
      socket.emit('error', 'Error storing message in database');
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Start the server with Socket.IO
const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`Backend server with Socket.IO is running on port ${PORT}!`);
});
