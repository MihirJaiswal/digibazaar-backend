// gigLike.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Toggle like: if already liked, remove like; if not, create like.
export const toggleGigLike = async (req, res, next) => {
  const { gigId } = req.body;
  if (!gigId) {
    return next(createError(400, "Missing required field: gigId"));
  }
  try {
    const existingLike = await prisma.gigLike.findFirst({
      where: { gigId, userId: req.userId },
    });

    if (existingLike) {
      await prisma.gigLike.delete({ where: { id: existingLike.id } });
      return res.status(200).json({ message: "Gig unliked" });
    } else {
      const newLike = await prisma.gigLike.create({
        data: { gigId, userId: req.userId },
      });
      return res.status(201).json(newLike);
    }
  } catch (error) {
    next(error);
  }
};
