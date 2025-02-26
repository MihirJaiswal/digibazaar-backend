// routes/productRoutes.js
import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const router = express.Router();

// Create a new product
router.post('/', createProduct);

// Retrieve all products (including related category and seller details)
router.get('/', getAllProducts);

// Retrieve a single product by its ID
router.get('/:id', getProductById);

// Update an existing product by its ID
router.put('/:id', updateProduct);

// Delete a product by its ID
router.delete('/:id', deleteProduct);

export default router;
