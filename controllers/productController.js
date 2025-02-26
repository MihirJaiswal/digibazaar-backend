// product.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

export const createProduct = async (req, res, next) => {
  const { title, price, description, summary, images, tags, licenseType, formats, productFile, categoryId } = req.body;
  
  // Validate required fields
  if (!title || !price || !description || !categoryId) {
    return next(createError(400, "Missing required fields: title, price, description, categoryId"));
  }
  
  try {
    const product = await prisma.product.create({
      data: {
        title,
        price: parseInt(price),
        description,
        summary,
        images,
        tags,
        licenseType,
        formats,
        productFile,
        categoryId,
        userId: req.userId, // Use the authenticated user ID
      },
    });

    return res.status(201).json(product);
  } catch (error) {
    return next(createError(500, "Failed to create product", { details: error.message }));
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true, // Include category details
        user: true,     // Include seller details
      },
    });
    return res.status(200).json(products);
  } catch (error) {
    return next(createError(500, "Failed to fetch products", { details: error.message }));
  }
};

export const getProductById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
      },
    });

    if (!product) return next(createError(404, "Product not found"));

    return res.status(200).json(product);
  } catch (error) {
    return next(createError(500, "Failed to fetch product", { details: error.message }));
  }
};

export const updateProduct = async (req, res, next) => {
  const { id } = req.params;
  const { title, price, description, summary, images, tags, licenseType, formats, productFile, categoryId } = req.body;

  try {
    // Check if the product exists and if the authenticated user is the owner
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) return next(createError(404, "Product not found"));
    if (existingProduct.userId !== req.userId)
      return next(createError(403, "You can update only your own product"));

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        title,
        price: price !== undefined ? parseInt(price) : undefined,
        description,
        summary,
        images,
        tags,
        licenseType,
        formats,
        productFile,
        categoryId,
      },
    });

    return res.status(200).json(updatedProduct);
  } catch (error) {
    return next(createError(500, "Failed to update product", { details: error.message }));
  }
};

export const deleteProduct = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Check if the product exists and if the authenticated user is the owner
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) return next(createError(404, "Product not found"));
    if (existingProduct.userId !== req.userId)
      return next(createError(403, "You can delete only your own product"));

    await prisma.product.delete({ where: { id } });
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    return next(createError(500, "Failed to delete product", { details: error.message }));
  }
};
