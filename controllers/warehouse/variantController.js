import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Function to verify the JWT token and get user details
 */
const verifyToken = (req) => {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token && req.cookies?.__session) {
    token = req.cookies.__session;
  }
  if (!token) throw createError(401, "Access denied. No token provided.");
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    return decoded.id;
  } catch (error) {
    console.log(error);
    console.log(token);
    throw createError(403, "Invalid token");
  }
};


/**
 * Create a new product variant (Only store owners)
 */
export const createVariant = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    if (!Array.isArray(req.body)) {
      return next(createError(400, "Request body should be an array of variants."));
    }

    const missingFields = req.body.some(
      (variant) => !variant.productId || !variant.name || !variant.value
    );

    if (missingFields) {
      return next(createError(400, "Each variant must have a productId, name, and value."));
    }

    // Check if the user owns the product
    const product = await prisma.product.findUnique({
      where: { id: req.body[0].productId }, // Assuming all variants belong to the same product
      include: { Store: true },
    });

    if (!product) return next(createError(404, "Product not found"));
    if (product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to create variants for this product."));
    }

    // Convert price, additionalPrice, and stock to proper data types
    const formattedVariants = req.body.map((variant) => ({
      productId: variant.productId,
      name: variant.name,
      value: variant.value,
      price: variant.price ? parseFloat(variant.price) : null,
      additionalPrice: variant.additionalPrice ? parseFloat(variant.additionalPrice) : 0,
      stock: variant.stock ? parseInt(variant.stock, 10) : 0,
    }));

    // Insert multiple variants at once
    const createdVariants = await prisma.productVariant.createMany({
      data: formattedVariants,
    });

    res.status(201).json({
      message: "Variants created successfully!",
      count: createdVariants.count,
    });
  } catch (err) {
    next(err);
  }
};


/**
 * Get all variants for a specific product (Public Access)
 */
export const getVariantsByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!productId) return next(createError(400, "Product ID is required"));

    const variants = await prisma.productVariant.findMany({
      where: { productId },
    });

    res.status(200).json(variants);
  } catch (err) {
    next(err);
  }
};


/**
 * Update a product variant (Only store owners)
 */
export const updateVariant = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user // Get the user ID from the token
    const { id } = req.params;
    const { name, value, price, additionalPrice, stock } = req.body;

    // Check if the variant exists and belongs to the user's store
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: { include: { Store: true } } },
    });

    if (!variant) return next(createError(404, "Variant not found"));
    if (variant.product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to update this variant"));
    }

    const updatedVariant = await prisma.productVariant.update({
      where: { id },
      data: {
        name,
        value,
        price: price ? parseFloat(price) : undefined,
        additionalPrice: additionalPrice ? parseFloat(additionalPrice) : undefined,
        stock: stock ? parseInt(stock, 10) : undefined,
      },
    });

    res.status(200).json(updatedVariant);
  } catch (err) {
    next(err);
  }
};


/**
 * Delete a product variant (Only store owners)
 */
export const deleteVariant = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token
    const { id } = req.params;

    // Check if the variant exists and belongs to the user's store
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: { include: { Store: true } } },
    });

    if (!variant) return next(createError(404, "Variant not found"));
    if (variant.product.Store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to delete this variant"));
    }

    await prisma.productVariant.delete({ where: { id } });

    res.status(200).json({ message: "Variant deleted successfully" });
  } catch (err) {
    next(err);
  }
};
