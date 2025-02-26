// subCategory.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new subcategory
export const createSubcategory = async (req, res, next) => {
  const { name, categoryId } = req.body;
  if (!name || !categoryId) {
    return next(createError(400, 'Missing required fields: name and categoryId'));
  }
  try {
    const newSubcategory = await prisma.subcategory.create({
      data: { name, categoryId },
    });
    res.status(201).json(newSubcategory);
  } catch (error) {
    next(createError(500, 'Failed to create subcategory', { details: error.message }));
  }
};

// Get all subcategories with their parent category details
export const getAllSubcategories = async (req, res, next) => {
  try {
    const subcategories = await prisma.subcategory.findMany({
      include: { category: true },
    });
    res.status(200).json(subcategories);
  } catch (error) {
    next(createError(500, 'Failed to fetch subcategories', { details: error.message }));
  }
};

// Get a single subcategory by ID
export const getSubcategoryById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!subcategory) return next(createError(404, 'Subcategory not found'));
    res.status(200).json(subcategory);
  } catch (error) {
    next(createError(500, 'Failed to fetch subcategory', { details: error.message }));
  }
};

// Update an existing subcategory
export const updateSubcategory = async (req, res, next) => {
  const { id } = req.params;
  const { name, categoryId } = req.body;
  try {
    const subcategory = await prisma.subcategory.findUnique({ where: { id } });
    if (!subcategory) return next(createError(404, 'Subcategory not found'));
    const updatedSubcategory = await prisma.subcategory.update({
      where: { id },
      data: { name, categoryId },
    });
    res.status(200).json(updatedSubcategory);
  } catch (error) {
    next(createError(500, 'Failed to update subcategory', { details: error.message }));
  }
};

// Delete a subcategory
export const deleteSubcategory = async (req, res, next) => {
  const { id } = req.params;
  try {
    const subcategory = await prisma.subcategory.findUnique({ where: { id } });
    if (!subcategory) return next(createError(404, 'Subcategory not found'));
    await prisma.subcategory.delete({ where: { id } });
    res.status(200).json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete subcategory', { details: error.message }));
  }
};
