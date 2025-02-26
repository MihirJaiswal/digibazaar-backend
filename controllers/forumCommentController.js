// forumComment.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new comment on a forum post
export const createForumComment = async (req, res, next) => {
  const { postId, content } = req.body;
  if (!postId || !content) {
    return next(createError(400, 'Missing required fields: postId and content'));
  }
  try {
    const newComment = await prisma.forumComment.create({
      data: {
        postId,
        userId: req.userId, // The authenticated user creates the comment
        content,
      },
    });
    res.status(201).json(newComment);
  } catch (error) {
    next(createError(500, 'Failed to create forum comment', { details: error.message }));
  }
};

// Update an existing forum comment (only allowed by the comment owner)
export const updateForumComment = async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const comment = await prisma.forumComment.findUnique({ where: { id } });
    if (!comment) return next(createError(404, 'Forum comment not found'));
    if (comment.userId !== req.userId)
      return next(createError(403, 'You can update only your own comment'));
    
    const updatedComment = await prisma.forumComment.update({
      where: { id },
      data: { content: content || comment.content },
    });
    res.status(200).json(updatedComment);
  } catch (error) {
    next(createError(500, 'Failed to update forum comment', { details: error.message }));
  }
};

// Delete a forum comment (only allowed by the comment owner)
export const deleteForumComment = async (req, res, next) => {
  const { id } = req.params;
  try {
    const comment = await prisma.forumComment.findUnique({ where: { id } });
    if (!comment) return next(createError(404, 'Forum comment not found'));
    if (comment.userId !== req.userId)
      return next(createError(403, 'You can delete only your own comment'));
    
    await prisma.forumComment.delete({ where: { id } });
    res.status(200).json({ message: 'Forum comment deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete forum comment', { details: error.message }));
  }
};
