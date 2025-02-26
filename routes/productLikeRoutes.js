// routes/productLikeRoutes.js
import express from 'express';
import { toggleProductLike } from '../controllers/productLikeController.js';

const router = express.Router();

// Toggle like for a product (if already liked, it will remove the like; otherwise, it will add a like)
router.post('/', toggleProductLike);

export default router;
