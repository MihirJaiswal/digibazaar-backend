// routes/gigRoutes.js
import express from 'express';
import { createGig, deleteGig, getGig, getGigs, updateGig } from '../../controllers/gig/gigController.js';

const router = express.Router();

// Create a new gig (only sellers can create)
router.post('/', createGig);

// Get multiple gigs with optional filters (e.g., userId, categoryId, price range, search, sort)
router.get('/', getGigs);

// Get a single gig by its ID (with related category and seller details)
router.get('/:id', getGig);

// Delete a gig by its ID (only allowed if the gig belongs to the authenticated user)
router.delete('/:id', deleteGig);

// Update a gig by its ID (only allowed if the gig belongs to the authenticated user)
router.put('/:id', updateGig);  

export default router;
