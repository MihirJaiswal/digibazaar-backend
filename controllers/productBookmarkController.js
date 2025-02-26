// productBookmark.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Toggle bookmark: if already bookmarked, remove bookmark; otherwise, create bookmark.
export const toggleProductBookmark = async (req, res, next) => {
  const { productId } = req.body;
  if (!productId) {
    return next(createError(400, "Missing required field: productId"));
  }
  try {
    const existingBookmark = await prisma.productBookmark.findFirst({
      where: { productId, userId: req.userId },
    });
    if (existingBookmark) {
      await prisma.productBookmark.delete({ where: { id: existingBookmark.id } });
      return res.status(200).json({ message: "Product removed from bookmarks" });
    } else {
      const bookmark = await prisma.productBookmark.create({
        data: { productId, userId: req.userId },
      });
      return res.status(201).json(bookmark);
    }
  } catch (error) {
    next(error);
  }
};
