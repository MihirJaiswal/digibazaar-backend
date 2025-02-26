// routes/gigReviewRoutes.js
import express from 'express';
import { createGigReview, updateGigReview, deleteGigReview } from '../controllers/gigReviewController.js';

const router = express.Router();

// Create a new gig review
router.post('/', createGigReview);

// Update an existing gig review by its ID
router.put('/:id', updateGigReview);

// Delete a gig review by its ID
router.delete('/:id', deleteGigReview);

export default router;
