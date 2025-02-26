// routes/communityRoutes.js
import express from 'express';
import { 
  createCommunity, 
  getCommunityById, 
  getAllCommunities, 
  updateCommunity, 
  deleteCommunity 
} from '../controllers/communityController.js';

const router = express.Router();

// Create a new community
router.post('/', createCommunity);

// Get all communities (with related creator, members, and posts)
router.get('/', getAllCommunities);

// Get a single community by ID
router.get('/:id', getCommunityById);

// Update an existing community by ID (only allowed by the creator)
router.put('/:id', updateCommunity);

// Delete a community by ID (only allowed by the creator)
router.delete('/:id', deleteCommunity);

export default router;
