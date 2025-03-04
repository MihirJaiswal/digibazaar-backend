import express from 'express';
import { updateGigOrderStatus, createGigOrderUpdate, deleteGigOrderUpdate, getGigOrderUpdates } from '../controllers/gigOrderUpdateController.js';

const router = express.Router();

// Update gig order status (IN_PROGRESS, COMPLETED, DELIVERED)
router.put('/status/:id', updateGigOrderStatus);

// Create a new update for a gig order
router.post('/:gigOrderId', createGigOrderUpdate);

// Delete an update from a gig order
router.delete('/:id', deleteGigOrderUpdate);

// Get all updates for a gig order
router.get('/:gigOrderId', getGigOrderUpdates);

export default router;
