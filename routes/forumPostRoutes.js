// routes/forumPostRoutes.js
import express from 'express';
import { 
  createForumPost, 
  getAllForumPosts, 
  getForumPostById, 
  updateForumPost, 
  deleteForumPost 
} from '../controllers/forumPostController.js';

const router = express.Router();

// Create a new forum post
router.post('/', createForumPost);

// Retrieve all forum posts (including user and comment details)
router.get('/', getAllForumPosts);

// Get a single forum post by its ID (with user and detailed comment info)
router.get('/:id', getForumPostById);

// Update a forum post (only allowed by the post creator)
router.put('/:id', updateForumPost);

// Delete a forum post (only allowed by the post creator)
router.delete('/:id', deleteForumPost);

export default router;
