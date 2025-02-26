// routes/projectMemberRoutes.js
import express from 'express';
import { 
  addProjectMember, 
  getProjectMembers, 
  updateProjectMemberRole, 
  deleteProjectMember 
} from '../controllers/projectMemberController.js';

const router = express.Router();

// Add a new member to a project (only allowed by the project owner)
router.post('/', addProjectMember);

// Get all members of a specific project (projectId passed as URL parameter)
router.get('/:projectId', getProjectMembers);

// Update a project member's role (only allowed by the project owner)
// The membership record ID is passed as a URL parameter
router.put('/:id', updateProjectMemberRole);

// Delete a project member (only allowed by the project owner)
// The membership record ID is passed as a URL parameter
router.delete('/:id', deleteProjectMember);

export default router;
