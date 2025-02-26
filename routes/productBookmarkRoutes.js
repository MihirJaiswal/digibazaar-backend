// routes/productBookmarkRoutes.js
import express from 'express';
import { toggleProductBookmark } from '../controllers/productBookmarkController.js';

const router = express.Router();

// Toggle a bookmark for a product (if bookmarked, it will remove it; if not, it will create it)
router.post('/', toggleProductBookmark);

export default router;
