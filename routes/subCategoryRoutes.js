// routes/subCategoryRoutes.js
import express from 'express';
import {
  createSubcategory,
  getAllSubcategories,
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory,
} from '../controllers/subCategoryController.js';

const router = express.Router();

// Create a new subcategory
router.post('/', createSubcategory);

// Get all subcategories (including parent category details)
router.get('/', getAllSubcategories);

// Get a single subcategory by its ID
router.get('/:id', getSubcategoryById);

// Update an existing subcategory by its ID
router.put('/:id', updateSubcategory);

// Delete a subcategory by its ID
router.delete('/:id', deleteSubcategory);

export default router;
