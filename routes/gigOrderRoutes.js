// routes/gigOrderRoutes.js
import express from 'express';
import { createGigOrder, getGigOrder, updateGigOrderStatus } from '../controllers/gigOrderController.js';

const router = express.Router();

// Create a new gig order
router.post('/', createGigOrder);

// Get a specific gig order by its ID
router.get('/:id', getGigOrder);

// Update gig order status (only allowed by the seller)
router.patch('/:id', updateGigOrderStatus);

export default router;
