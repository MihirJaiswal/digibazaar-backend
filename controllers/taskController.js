// task.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new task for a project
export const createTask = async (req, res, next) => {
  const { projectId, assignedTo, title, description, status, dueDate } = req.body;
  if (!projectId || !title) {
    return next(createError(400, 'Missing required fields: projectId and title'));
  }
  try {
    const newTask = await prisma.task.create({
      data: {
        projectId,
        assignedTo: assignedTo || null,
        title,
        description: description || null,
        status: status || "Pending",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    res.status(201).json(newTask);
  } catch (error) {
    next(createError(500, 'Failed to create task', { details: error.message }));
  }
};

// Update an existing task (authorization checks can be added as needed)
export const updateTask = async (req, res, next) => {
  const { id } = req.params;
  const { assignedTo, title, description, status, dueDate } = req.body;
  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return next(createError(404, 'Task not found'));
    
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        assignedTo: assignedTo !== undefined ? assignedTo : task.assignedTo,
        title: title || task.title,
        description: description !== undefined ? description : task.description,
        status: status || task.status,
        dueDate: dueDate ? new Date(dueDate) : task.dueDate,
      },
    });
    res.status(200).json(updatedTask);
  } catch (error) {
    next(createError(500, 'Failed to update task', { details: error.message }));
  }
};

// Delete a task
export const deleteTask = async (req, res, next) => {
  const { id } = req.params;
  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return next(createError(404, 'Task not found'));
    await prisma.task.delete({ where: { id } });
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete task', { details: error.message }));
  }
};

// Get all tasks for a given project
export const getTasksByProject = async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const tasks = await prisma.task.findMany({ where: { projectId } });
    res.status(200).json(tasks);
  } catch (error) {
    next(createError(500, 'Failed to fetch tasks', { details: error.message }));
  }
};
