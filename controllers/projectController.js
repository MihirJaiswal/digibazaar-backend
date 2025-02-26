// project.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new project
export const createProject = async (req, res, next) => {
  const { title, description, isPublic } = req.body;
  if (!title || !description) {
    return next(createError(400, 'Missing required fields: title and description'));
  }
  try {
    const newProject = await prisma.project.create({
      data: {
        ownerId: req.userId, // Authenticated user becomes the project owner
        title,
        description,
        isPublic: isPublic || false,
      },
    });
    res.status(201).json(newProject);
  } catch (error) {
    next(createError(500, 'Failed to create project', { details: error.message }));
  }
};

// Get a single project by ID (with owner, members, and tasks)
export const getProjectById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: true,
        members: true,
        tasks: true,
      },
    });
    if (!project) return next(createError(404, 'Project not found'));
    res.status(200).json(project);
  } catch (error) {
    next(createError(500, 'Failed to fetch project', { details: error.message }));
  }
};

// Get all projects (optionally include owner and members)
export const getAllProjects = async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        owner: true,
        members: true,
      },
    });
    res.status(200).json(projects);
  } catch (error) {
    next(createError(500, 'Failed to fetch projects', { details: error.message }));
  }
};

// Update an existing project (only by the owner)
export const updateProject = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, isPublic } = req.body;
  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return next(createError(404, 'Project not found'));
    if (project.ownerId !== req.userId)
      return next(createError(403, 'Only the project owner can update the project'));

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { title, description, isPublic },
    });
    res.status(200).json(updatedProject);
  } catch (error) {
    next(createError(500, 'Failed to update project', { details: error.message }));
  }
};

// Delete a project (only by the owner)
export const deleteProject = async (req, res, next) => {
  const { id } = req.params;
  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return next(createError(404, 'Project not found'));
    if (project.ownerId !== req.userId)
      return next(createError(403, 'Only the project owner can delete the project'));

    await prisma.project.delete({ where: { id } });
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete project', { details: error.message }));
  }
};
