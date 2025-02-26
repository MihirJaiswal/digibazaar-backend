// productReview.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

export const createProductReview = async (req, res, next) => {
  const { productId, star, content } = req.body;
  if (!productId || star === undefined || !content) {
    return next(createError(400, "Missing required fields: productId, star, and content"));
  }
  try {
    const review = await prisma.productReview.create({
      data: {
        productId,
        userId: req.userId,
        star: parseInt(star),
        content,
      },
    });
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

export const updateProductReview = async (req, res, next) => {
  const { id } = req.params;
  const { star, content } = req.body;
  try {
    const review = await prisma.productReview.findUnique({ where: { id } });
    if (!review) return next(createError(404, "Review not found"));
    if (review.userId !== req.userId)
      return next(createError(403, "You can update only your own review"));

    const updatedReview = await prisma.productReview.update({
      where: { id },
      data: {
        star: star !== undefined ? parseInt(star) : review.star,
        content: content || review.content,
      },
    });
    res.status(200).json(updatedReview);
  } catch (error) {
    next(error);
  }
};

export const deleteProductReview = async (req, res, next) => {
  const { id } = req.params;
  try {
    const review = await prisma.productReview.findUnique({ where: { id } });
    if (!review) return next(createError(404, "Review not found"));
    if (review.userId !== req.userId)
      return next(createError(403, "You can delete only your own review"));

    await prisma.productReview.delete({ where: { id } });
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};
