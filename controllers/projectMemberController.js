// projectMember.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Add a new member to a project (only allowed by the project owner)
export const addProjectMember = async (req, res, next) => {
  const { projectId, userId, role } = req.body;
  if (!projectId || !userId || !role) {
    return next(createError(400, 'Missing required fields: projectId, userId, and role'));
  }
  try {
    // Verify the project exists and that the current user is the owner
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return next(createError(404, 'Project not found'));
    if (project.ownerId !== req.userId)
      return next(createError(403, 'Only the project owner can add members'));

    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });
    res.status(201).json(newMember);
  } catch (error) {
    next(createError(500, 'Failed to add project member', { details: error.message }));
  }
};

// Get all members of a specific project
export const getProjectMembers = async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
    });
    res.status(200).json(members);
  } catch (error) {
    next(createError(500, 'Failed to fetch project members', { details: error.message }));
  }
};

// Update a project member's role (only allowed by the project owner)
export const updateProjectMemberRole = async (req, res, next) => {
  const { id } = req.params; // ID of the projectMember record
  const { role } = req.body;
  if (!role) {
    return next(createError(400, 'Missing required field: role'));
  }
  try {
    // Fetch the project member record along with its associated project
    const projectMember = await prisma.projectMember.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!projectMember) return next(createError(404, 'Project member not found'));

    // Only the project owner can update a member's role
    if (projectMember.project.ownerId !== req.userId) {
      return next(createError(403, 'Only the project owner can update member roles'));
    }

    const updatedMember = await prisma.projectMember.update({
      where: { id },
      data: { role },
    });
    res.status(200).json(updatedMember);
  } catch (error) {
    next(createError(500, 'Failed to update project member role', { details: error.message }));
  }
};

// Delete a project member (only allowed by the project owner)
export const deleteProjectMember = async (req, res, next) => {
  const { id } = req.params; // ID of the projectMember record
  try {
    // Fetch the project member record along with its associated project
    const projectMember = await prisma.projectMember.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!projectMember) return next(createError(404, 'Project member not found'));

    // Only the project owner can remove a member
    if (projectMember.project.ownerId !== req.userId) {
      return next(createError(403, 'Only the project owner can remove a member'));
    }

    await prisma.projectMember.delete({ where: { id } });
    res.status(200).json({ message: 'Project member removed successfully' });
  } catch (error) {
    next(createError(500, 'Failed to remove project member', { details: error.message }));
  }
};
