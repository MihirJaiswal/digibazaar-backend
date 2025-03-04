// routes/communityCommentRoutes.js
import express from 'express';
import { 
  createCommunityComment, 
  updateCommunityComment, 
  deleteCommunityComment,
  likeCommunityComment,
  unlikeCommunityComment,
  getAllCommentsForPost,
  getAllLikesOnComment
} from '../../controllers/community/communityCommentController.js';

const router = express.Router();

// Create a new community comment
router.post('/', createCommunityComment);

// Update an existing community comment by ID
router.put('/:id', updateCommunityComment);

// Delete a community comment by ID
router.delete('/:id', deleteCommunityComment);

// Like a community comment
router.post('/:id/like', likeCommunityComment);

// Unlike a community comment
router.post('/:id/unlike', unlikeCommunityComment);

// Get all comments for a post
router.get('/:postId/comments', getAllCommentsForPost);

// Get all likes on a comment
router.get('/:commentId/likes', getAllLikesOnComment);

export default router;
