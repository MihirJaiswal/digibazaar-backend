// routes/communityRoutes.js
import express from 'express';
import { 
  createCommunity, 
  getCommunityById, 
  getAllCommunities, 
  updateCommunity, 
  deleteCommunity,
  getAllCommunitiesByUser,
  getAllCommunitiesJoinedByUser,
  uploadCommunityImage
} from '../../controllers/community/communityController.js';
import { verifyToken } from '../../middleware/jwt.js';

const router = express.Router();

// Create a new community
router.post('/', verifyToken, uploadCommunityImage, createCommunity);

// Get all communities (with related creator, members, and posts)
router.get('/', getAllCommunities);

// Get a single community by ID
router.get('/:id', getCommunityById);

// Update an existing community by ID (only allowed by the creator)
router.put('/:id', verifyToken, updateCommunity);

// Delete a community by ID (only allowed by the creator)
router.delete('/:id', deleteCommunity);

// Get all communities by user
router.get('/user/:userId', getAllCommunitiesByUser);

// Get all communities joined by user
router.get('/user/:userId/joined', getAllCommunitiesJoinedByUser);


export default router;
