// productLike.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Toggle like: if already liked, remove like; if not, create like.
export const toggleProductLike = async (req, res, next) => {
  const { productId } = req.body;
  if (!productId) {
    return next(createError(400, "Missing required field: productId"));
  }
  try {
    const existingLike = await prisma.productLike.findFirst({
      where: { productId, userId: req.userId },
    });

    if (existingLike) {
      await prisma.productLike.delete({ where: { id: existingLike.id } });
      return res.status(200).json({ message: "Product unliked" });
    } else {
      const newLike = await prisma.productLike.create({
        data: { productId, userId: req.userId },
      });
      return res.status(201).json(newLike);
    }
  } catch (error) {
    next(error);
  }
};
