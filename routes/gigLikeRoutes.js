// routes/gigLikeRoutes.js
import express from 'express';
import { toggleGigLike } from '../controllers/gigLikeController.js';

const router = express.Router();

// Toggle like for a gig (if liked, it will unlike; if not, it will like)
router.post('/', toggleGigLike);

export default router;
