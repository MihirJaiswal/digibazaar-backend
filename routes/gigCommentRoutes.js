// routes/gigCommentRoutes.js
import express from 'express';
import { createGigComment, updateGigComment, deleteGigComment } from '../controllers/gigCommentController.js';

const router = express.Router();

// Create a new gig comment
router.post('/', createGigComment);

// Update an existing gig comment by its ID
router.put('/:id', updateGigComment);

// Delete a gig comment by its ID
router.delete('/:id', deleteGigComment);

export default router;
