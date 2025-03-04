// gigBookmark.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../../utils/createError.js';

const prisma = new PrismaClient();

// Toggle bookmark: if already bookmarked, remove bookmark; otherwise, create bookmark.
export const toggleGigBookmark = async (req, res, next) => {
  const { gigId } = req.body;
  if (!gigId) {
    return next(createError(400, "Missing required field: gigId"));
  }
  try {
    const existingBookmark = await prisma.gigBookmark.findFirst({
      where: { gigId, userId: req.userId },
    });
    if (existingBookmark) {
      await prisma.gigBookmark.delete({ where: { id: existingBookmark.id } });
      return res.status(200).json({ message: "Gig removed from bookmarks" });
    } else {
      const bookmark = await prisma.gigBookmark.create({
        data: { gigId, userId: req.userId },
      });
      return res.status(201).json(bookmark);
    }
  } catch (error) {
    next(error);
  }
};
