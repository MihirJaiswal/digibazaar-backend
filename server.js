// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).send({ message: 'Server is healthy' });
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
import forumCommentRoutes from './routes/forumCommentRoutes.js';
import forumPostRoutes from './routes/forumPostRoutes.js';
import gigBookmarkRoutes from './routes/gigBookmarkRoutes.js';
import gigCommentRoutes from './routes/gigCommentRoutes.js';
import gigLikeRoutes from './routes/gigLikeRoutes.js';
import gigOrderRoutes from './routes/gigOrderRoutes.js';
import gigReviewRoutes from './routes/gigReviewRoutes.js';
import gigRoutes from './routes/gigRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import productBookmarkRoutes from './routes/productBookmarkRoutes.js';
import productCommentRoutes from './routes/productCommentRoutes.js';
import productLikeRoutes from './routes/productLikeRoutes.js';
import productOrderRoutes from './routes/productOrderRoutes.js';
import productReviewRoutes from './routes/productReviewRoutes.js';
import productRoutes from './routes/productRoutes.js';
import projectMemberRoutes from './routes/projectMemberRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import subCategoryRoutes from './routes/subCategoryRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/community-comments', communityCommentRoutes);
app.use('/api/community-members', communityMemberRoutes);
app.use('/api/community-posts', communityPostRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/forum-comments', forumCommentRoutes);
app.use('/api/forum-posts', forumPostRoutes);
app.use('/api/gig-bookmarks', gigBookmarkRoutes);
app.use('/api/gig-comments', gigCommentRoutes);
app.use('/api/gig-likes', gigLikeRoutes);
app.use('/api/gig-orders', gigOrderRoutes);
app.use('/api/gig-reviews', gigReviewRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/product-bookmarks', productBookmarkRoutes);
app.use('/api/product-comments', productCommentRoutes);
app.use('/api/product-likes', productLikeRoutes);
app.use('/api/product-orders', productOrderRoutes);
app.use('/api/product-reviews', productReviewRoutes);
app.use('/api/products', productRoutes);
app.use('/api/project-members', projectMemberRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || 'Something went wrong!';
  return res.status(errorStatus).json({ error: errorMessage });
});

const PORT = process.env.PORT || 8800;
app.listen(PORT, async () => {
  console.log(`Backend server is running on port ${PORT}!`);
});
