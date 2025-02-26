// routes/taskRoutes.js
import express from 'express';
import { createTask, updateTask, deleteTask, getTasksByProject } from '../controllers/taskController.js';

const router = express.Router();

// Create a new task for a project
router.post('/', createTask);

// Update an existing task by its ID
router.put('/:id', updateTask);

// Delete a task by its ID
router.delete('/:id', deleteTask);

// Get all tasks for a specific project (projectId passed as a URL parameter)
router.get('/project/:projectId', getTasksByProject);

export default router;
