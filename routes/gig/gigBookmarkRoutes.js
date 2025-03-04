// routes/gigBookmarkRoutes.js
import express from 'express';
import { toggleGigBookmark } from '../../controllers/gig/gigBookmarkController.js';

const router = express.Router();

// Toggle a bookmark for a gig (if bookmarked, it will remove it; otherwise, it creates a new bookmark)
router.post('/', toggleGigBookmark);

export default router;
