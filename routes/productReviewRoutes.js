// routes/productReviewRoutes.js
import express from 'express';
import { createProductReview, updateProductReview, deleteProductReview } from '../controllers/productReviewController.js';

const router = express.Router();

// Create a new product review
router.post('/', createProductReview);

// Update an existing product review by its ID
router.put('/:id', updateProductReview);

// Delete a product review by its ID
router.delete('/:id', deleteProductReview);

export default router;
