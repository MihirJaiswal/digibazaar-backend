// routes/communityMemberRoutes.js
import express from 'express';
import {
  joinCommunity,
  getCommunityMembers,
  updateCommunityMemberRole,
  removeCommunityMember,
  leaveCommunity,
} from '../controllers/communityMemberController.js';

const router = express.Router();

// Endpoint for a user to join a community
router.post('/join', joinCommunity);

// Endpoint for a user to leave a community
router.post('/leave', leaveCommunity);

// Endpoint to get all members of a specific community
// The communityId is passed as a URL parameter
router.get('/:communityId', getCommunityMembers);

// Endpoint to update a community member's role (only allowed by the community creator)
// The community member record's id is passed as a URL parameter
router.put('/:id', updateCommunityMemberRole);

// Endpoint to remove a community member (either self-removal or by the community creator)
// The community member record's id is passed as a URL parameter
router.delete('/:id', removeCommunityMember);

export default router;
