// category.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new category
export const createCategory = async (req, res, next) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return next(createError(400, 'Missing required fields: name and type'));
  }
  try {
    const newCategory = await prisma.category.create({
      data: { name, type },
    });
    res.status(201).json(newCategory);
  } catch (error) {
    next(createError(500, 'Failed to create category', { details: error.message }));
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { subcategories: true },
    });
    res.status(200).json(categories);
  } catch (error) {
    next(createError(500, 'Failed to fetch categories', { details: error.message }));
  }
};

export const getCategoryById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { subcategories: true },
    });
    if (!category) return next(createError(404, 'Category not found'));
    res.status(200).json(category);
  } catch (error) {
    next(createError(500, 'Failed to fetch category', { details: error.message }));
  }
};

export const updateCategory = async (req, res, next) => {
  const { id } = req.params;
  const { name, type } = req.body;
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return next(createError(404, 'Category not found'));
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name, type },
    });
    res.status(200).json(updatedCategory);
  } catch (error) {
    next(createError(500, 'Failed to update category', { details: error.message }));
  }
};

// Delete a category
export const deleteCategory = async (req, res, next) => {
  const { id } = req.params;
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return next(createError(404, 'Category not found'));
    await prisma.category.delete({ where: { id } });
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete category', { details: error.message }));
  }
};
