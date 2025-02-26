// routes/productCommentRoutes.js
import express from 'express';
import { createProductComment, updateProductComment, deleteProductComment } from '../controllers/productCommentController.js';

const router = express.Router();

// Create a new product comment
router.post('/', createProductComment);

// Update an existing product comment by its ID
router.put('/:id', updateProductComment);

// Delete a product comment by its ID
router.delete('/:id', deleteProductComment);

export default router;
