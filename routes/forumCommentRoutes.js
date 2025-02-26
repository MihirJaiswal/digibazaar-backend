// routes/forumCommentRoutes.js
import express from 'express';
import { createForumComment, updateForumComment, deleteForumComment } from '../controllers/forumCommentController.js';

const router = express.Router();

// Create a new forum comment
router.post('/', createForumComment);

// Update an existing forum comment by ID
router.put('/:id', updateForumComment);

// Delete a forum comment by ID
router.delete('/:id', deleteForumComment);

export default router;
