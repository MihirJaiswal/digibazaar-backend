// routes/conversationRoutes.js
import express from 'express';
import {
  createConversation,
  updateConversation,
  getSingleConversation,
  getConversations,
} from '../controllers/conversationController.js';

const router = express.Router();

// Create a new conversation
router.post('/', createConversation);

// Update a conversation (mark as read by seller or buyer)
router.put('/:id', updateConversation);

// Get a single conversation by ID 
router.get('/:id', getSingleConversation);

// Get all conversations for the authenticated user
router.get('/', getConversations);

export default router;
