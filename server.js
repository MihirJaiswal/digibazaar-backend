import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './middleware/jwt.js';

const app = express();
const prisma = new PrismaClient();

// CORS and Body Parsers
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Logging Middleware for all incoming requests
app.use((req, res, next) => {
  console.log("🔹 Received Request:");
  console.log("➡️ Method:", req.method);
  console.log("➡️ Path:", req.path);
  console.log("➡️ Headers:", req.headers);
  console.log("➡️ Cookies:", req.cookies);
  console.log("➡️ Body:", req.body);
  next();
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy' });
});

// Import API Routes
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import communityCommentRoutes from './routes/communityCommentRoutes.js';
import communityMemberRoutes from './routes/communityMemberRoutes.js';
import communityPostRoutes from './routes/communityPostRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import followRoutes from './routes/followRoutes.js';
import gigBookmarkRoutes from './routes/gigBookmarkRoutes.js';
import gigLikeRoutes from './routes/gigLikeRoutes.js';
import gigOrderRoutes from './routes/gigOrderRoutes.js';
import gigReviewRoutes from './routes/gigReviewRoutes.js';
import gigRoutes from './routes/gigRoutes.js';
import gigStarsRoutes from './routes/gigStarsRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import subCategoryRoutes from './routes/subCategoryRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Mount API Routes
// If a route requires authentication, attach the verifyToken middleware before the route handler.
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/community-comments', communityCommentRoutes);
app.use('/api/community-members',  communityMemberRoutes);
app.use('/api/community-posts', communityPostRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/conversations', verifyToken, conversationRoutes);
app.use('/api/follows', verifyToken, followRoutes);
app.use('/api/gig-bookmarks', verifyToken, gigBookmarkRoutes);
app.use('/api/gig-toggles-likes', gigLikeRoutes);
app.use('/api/gig-orders', verifyToken, gigOrderRoutes);
app.use('/api/gig-reviews',  gigReviewRoutes);
app.use('/api/gig-stars',  gigStarsRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/messages', verifyToken, messageRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);
app.use('/api/subcategories', verifyToken, subCategoryRoutes);
app.use('/api/transactions', verifyToken, transactionRoutes);
app.use('/api/users', userRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  const errorStatus = err.status || 500;
  const errorMessage = err.message || 'Something went wrong!';
  res.status(errorStatus).json({ error: errorMessage });
});

// Start the Server
const PORT = process.env.PORT || 8800;
app.listen(PORT, async () => {
  console.log(`Backend server is running on port ${PORT}!`);
});
