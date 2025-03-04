// routes/gigLikeRoutes.js
import express from 'express';
import { toggleGigLike, getGigs } from '../../controllers/gig/gigLikeController.js';

const router = express.Router();

// Toggle like for a gig (if liked, it will unlike; if not, it will like)
router.post('/', toggleGigLike);

// Get all likes for a gig
router.get('/gigs', getGigs);

export default router;
