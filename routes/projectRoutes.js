// routes/projectRoutes.js
import express from 'express';
import { 
  createProject, 
  getProjectById, 
  getAllProjects, 
  updateProject, 
  deleteProject 
} from '../controllers/projectController.js';

const router = express.Router();

// Create a new project
router.post('/', createProject);

// Retrieve all projects (including owner and members details)
router.get('/', getAllProjects);

// Retrieve a single project by its ID (including owner, members, and tasks)
router.get('/:id', getProjectById);

// Update an existing project (only allowed by the project owner)
router.put('/:id', updateProject);

// Delete a project (only allowed by the project owner)
router.delete('/:id', deleteProject);

export default router;
