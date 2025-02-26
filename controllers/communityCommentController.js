// communityComment.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new comment on a community post
export const createCommunityComment = async (req, res, next) => {
  const { postId, content } = req.body;
  if (!postId || !content) {
    return next(createError(400, 'Missing required fields: postId and content'));
  }
  try {
    const newComment = await prisma.communityComment.create({
      data: {
        postId,
        userId: req.userId,
        content,
      },
    });
    res.status(201).json(newComment);
  } catch (error) {
    next(createError(500, 'Failed to create community comment', { details: error.message }));
  }
};

// Update a community comment (only allowed by the comment creator)
export const updateCommunityComment = async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const comment = await prisma.communityComment.findUnique({ where: { id } });
    if (!comment) return next(createError(404, 'Community comment not found'));
    if (comment.userId !== req.userId)
      return next(createError(403, 'You can update only your own comment'));

    const updatedComment = await prisma.communityComment.update({
      where: { id },
      data: {
        content: content || comment.content,
      },
    });
    res.status(200).json(updatedComment);
  } catch (error) {
    next(createError(500, 'Failed to update community comment', { details: error.message }));
  }
};

// Delete a community comment (only allowed by the comment creator)
export const deleteCommunityComment = async (req, res, next) => {
  const { id } = req.params;
  try {
    const comment = await prisma.communityComment.findUnique({ where: { id } });
    if (!comment) return next(createError(404, 'Community comment not found'));
    if (comment.userId !== req.userId)
      return next(createError(403, 'You can delete only your own comment'));

    await prisma.communityComment.delete({ where: { id } });
    res.status(200).json({ message: 'Community comment deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete community comment', { details: error.message }));
  }
};
