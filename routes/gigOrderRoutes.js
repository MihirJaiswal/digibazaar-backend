// routes/gigOrderRoutes.js
import express from 'express';
import { createGigOrder, getGigOrder, updateGigOrderStatus, getOrdersForUser, createPaymentIntent } from '../controllers/gigOrderController.js';

const router = express.Router();

// Create a new gig order
router.post('/', createGigOrder);

// Get a specific gig order by its ID
router.get('/:id', getGigOrder);

// Update gig order status (only allowed by the seller)
router.patch('/:id', updateGigOrderStatus);

// Get all orders for a user
router.get('/user/:userId', getOrdersForUser);

//get create payment intent
router.post('/create-payment-intent', createPaymentIntent);


export default router;
