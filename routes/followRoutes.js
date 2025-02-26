// routes/followRoutes.js
import express from 'express';
import { followUser, unfollowUser, getFollowers, getFollowing } from '../controllers/followController.js';

const router = express.Router();

// Follow a user
router.post('/follow', followUser);

// Unfollow a user
router.post('/unfollow', unfollowUser);

// Get list of followers for a given user
router.get('/followers/:userId', getFollowers);

// Get list of users a given user is following
router.get('/following/:userId', getFollowing);

export default router;
