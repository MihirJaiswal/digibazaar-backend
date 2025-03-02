// routes/communityPostRoutes.js
import express from 'express';
import {
  createCommunityPost,
  getCommunityPostById,
  getCommunityPosts,
  updateCommunityPost,
  deleteCommunityPost,
  likeCommunityPost,
  unlikeCommunityPost,
  getLikesForPost,
  getAllPosts,
  getAllPostsByUser,
} from '../controllers/communityPostController.js';

const router = express.Router();

// Create a new community post
router.post('/', createCommunityPost);


// Get all community posts for a specific community
// Note: Using a distinct route path to avoid conflicts with get-by-ID
router.get('/community/:communityId', getCommunityPosts);

// Get a single community post by its ID
router.get('/:id', getCommunityPostById);

// Update an existing community post (only allowed by the post creator)
router.put('/:id', updateCommunityPost);

// Delete a community post (only allowed by the post creator)
router.delete('/:id', deleteCommunityPost);

// Like a community post
router.post('/:id/like', likeCommunityPost);

// Unlike a community post
router.post('/:id/unlike', unlikeCommunityPost);

// Get likes for a community post
router.get('/:id/likes', getLikesForPost);

// Get all posts
router.get('/', getAllPosts);

// Get all posts by user
router.get('/user/:userId', getAllPostsByUser);

export default router;
