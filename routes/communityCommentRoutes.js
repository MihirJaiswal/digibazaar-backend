// routes/communityCommentRoutes.js
import express from 'express';
import { 
  createCommunityComment, 
  updateCommunityComment, 
  deleteCommunityComment 
} from '../controllers/communityCommentController.js';

const router = express.Router();

// Create a new community comment
router.post('/', createCommunityComment);

// Update an existing community comment by ID
router.put('/:id', updateCommunityComment);

// Delete a community comment by ID
router.delete('/:id', deleteCommunityComment);

export default router;
