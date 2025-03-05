import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import createError  from "../../utils/createError.js";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_KEY; // Replace with your actual secret

// ✅ Function to verify JWT token
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError(401, "Unauthorized: No token provided");
  }

  const token = authHeader.split(" ")[1]; // Extract token
  try {
    return jwt.verify(token, JWT_SECRET); // Verify token
  } catch (err) {
    throw createError(403, "Forbidden: Invalid token");
  }
};

// ✅ 1. Create a new product variant (Protected)
export const createVariant = async (req, res, next) => {
    try {
      verifyToken(req); // Verify user authentication
  
      if (!Array.isArray(req.body)) {
        return next(createError(400, "Request body should be an array of variants."));
      }
  
      const missingFields = req.body.some(
        (variant) => !variant.productId || !variant.name || !variant.value
      );
  
      if (missingFields) {
        return next(createError(400, "Each variant must have a productId, name, and value."));
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
  

// ✅ 2. Get all variants for a specific product (Protected)
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

// ✅ 3. Update a product variant (Protected)
export const updateVariant = async (req, res, next) => {
  try {
    verifyToken(req); // Verify token before updating

    const { id } = req.params;
    const { name, value, price, additionalPrice, stock } = req.body;

    const variant = await prisma.productVariant.update({
      where: { id },
      data: {
        name,
        value,
        price: price ? parseFloat(price) : undefined,
        additionalPrice: additionalPrice ? parseFloat(additionalPrice) : undefined,
        stock: stock ? parseInt(stock, 10) : undefined,
      },
    });

    res.status(200).json(variant);
  } catch (err) {
    next(err);
  }
};

// ✅ 4. Delete a product variant (Protected)
export const deleteVariant = async (req, res, next) => {
  try {
    verifyToken(req); // Verify token before deleting

    const { id } = req.params;

    await prisma.productVariant.delete({
      where: { id },
    });

    res.status(200).json({ message: "Variant deleted successfully" });
  } catch (err) {
    next(err);
  }
};
