// routes/productOrderRoutes.js
import express from 'express';
import { createProductOrder, getProductOrder, updateProductOrderStatus } from '../controllers/productOrderController.js';

const router = express.Router();

// Create a new product order
router.post('/', createProductOrder);

// Get a specific product order by its ID
router.get('/:id', getProductOrder);

// Update product order status (only allowed by the seller)
router.patch('/:id', updateProductOrderStatus);

export default router;
