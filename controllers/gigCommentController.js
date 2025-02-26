// gigComment.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

export const createGigComment = async (req, res, next) => {
  const { gigId, content } = req.body;
  if (!gigId || !content) {
    return next(createError(400, "Missing required fields: gigId and content"));
  }
  try {
    const comment = await prisma.gigComment.create({
      data: { gigId, userId: req.userId, content },
    });
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

export const updateGigComment = async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const comment = await prisma.gigComment.findUnique({ where: { id } });
    if (!comment) return next(createError(404, "Comment not found"));
    if (comment.userId !== req.userId)
      return next(createError(403, "You can update only your own comment"));

    const updatedComment = await prisma.gigComment.update({
      where: { id },
      data: { content: content || comment.content },
    });
    res.status(200).json(updatedComment);
  } catch (error) {
    next(error);
  }
};

export const deleteGigComment = async (req, res, next) => {
  const { id } = req.params;
  try {
    const comment = await prisma.gigComment.findUnique({ where: { id } });
    if (!comment) return next(createError(404, "Comment not found"));
    if (comment.userId !== req.userId)
      return next(createError(403, "You can delete only your own comment"));

    await prisma.gigComment.delete({ where: { id } });
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
