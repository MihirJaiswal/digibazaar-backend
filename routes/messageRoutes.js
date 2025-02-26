// routes/messageRoutes.js
import express from 'express';
import { createMessage, getMessages } from '../controllers/messageController.js';

const router = express.Router();

// Create a new message in a conversation
router.post('/', createMessage);

// Get all messages for a specific conversation (using the conversation ID as a route parameter)
router.get('/:id', getMessages);

export default router;
