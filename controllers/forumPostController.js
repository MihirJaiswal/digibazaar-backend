// forumPost.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new forum post
export const createForumPost = async (req, res, next) => {
  const { title, content, category } = req.body;
  if (!title || !content || !category) {
    return next(createError(400, 'Missing required fields: title, content, and category'));
  }
  try {
    const newPost = await prisma.forumPost.create({
      data: {
        userId: req.userId, // The authenticated user creates the post
        title,
        content,
        category,
      },
    });
    res.status(201).json(newPost);
  } catch (error) {
    next(createError(500, 'Failed to create forum post', { details: error.message }));
  }
};

// Retrieve all forum posts (optionally including user details and comments)
export const getAllForumPosts = async (req, res, next) => {
  try {
    const posts = await prisma.forumPost.findMany({
      include: {
        user: true,
        comments: true,
      },
    });
    res.status(200).json(posts);
  } catch (error) {
    next(createError(500, 'Failed to fetch forum posts', { details: error.message }));
  }
};

// Get a single forum post by its ID
export const getForumPostById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        user: true,
        comments: { include: { user: true } },
      },
    });
    if (!post) return next(createError(404, 'Forum post not found'));
    res.status(200).json(post);
  } catch (error) {
    next(createError(500, 'Failed to fetch forum post', { details: error.message }));
  }
};

// Update a forum post (only the owner is allowed to update)
export const updateForumPost = async (req, res, next) => {
  const { id } = req.params;
  const { title, content, category } = req.body;
  try {
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return next(createError(404, 'Forum post not found'));
    if (post.userId !== req.userId)
      return next(createError(403, 'You can update only your own forum post'));
    
    const updatedPost = await prisma.forumPost.update({
      where: { id },
      data: {
        title: title || post.title,
        content: content || post.content,
        category: category || post.category,
      },
    });
    res.status(200).json(updatedPost);
  } catch (error) {
    next(createError(500, 'Failed to update forum post', { details: error.message }));
  }
};

// Delete a forum post (only the owner is allowed to delete)
export const deleteForumPost = async (req, res, next) => {
  const { id } = req.params;
  try {
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return next(createError(404, 'Forum post not found'));
    if (post.userId !== req.userId)
      return next(createError(403, 'You can delete only your own forum post'));
    
    await prisma.forumPost.delete({ where: { id } });
    res.status(200).json({ message: 'Forum post deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete forum post', { details: error.message }));
  }
};
