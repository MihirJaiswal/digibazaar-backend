import express from 'express';
import { uploadGigDelivery, acceptGigDelivery, getGigDeliveryByOrder } from '../controllers/gigDileveryController.js';

const router = express.Router();

// Upload a delivery for a gig order (seller)
router.post('/upload', uploadGigDelivery);

// Accept a delivery (buyer)
router.patch('/:deliveryId/accept', acceptGigDelivery);

// Get delivery by gig order ID
router.get('/order/:gigOrderId', getGigDeliveryByOrder);

export default router;
