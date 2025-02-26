// communityPost.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new community post
export const createCommunityPost = async (req, res, next) => {
  const { communityId, title, content } = req.body;
  if (!communityId || !title || !content) {
    return next(createError(400, 'Missing required fields: communityId, title, and content'));
  }
  try {
    // Create the post with the authenticated user's ID as the author
    const newPost = await prisma.communityPost.create({
      data: {
        communityId,
        userId: req.userId,
        title,
        content,
      },
    });
    res.status(201).json(newPost);
  } catch (error) {
    next(createError(500, 'Failed to create community post', { details: error.message }));
  }
};

// Get a single community post by its ID (with related comments and user details)
export const getCommunityPostById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const post = await prisma.communityPost.findUnique({
      where: { id },
      include: {
        user: true,
        comments: { include: { user: true } },
      },
    });
    if (!post) return next(createError(404, 'Community post not found'));
    res.status(200).json(post);
  } catch (error) {
    next(createError(500, 'Failed to fetch community post', { details: error.message }));
  }
};

// Get all community posts for a specific community
export const getCommunityPosts = async (req, res, next) => {
  const { communityId } = req.params;
  try {
    const posts = await prisma.communityPost.findMany({
      where: { communityId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(posts);
  } catch (error) {
    next(createError(500, 'Failed to fetch community posts', { details: error.message }));
  }
};

// Update a community post (only allowed by the post creator)
export const updateCommunityPost = async (req, res, next) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) return next(createError(404, 'Community post not found'));
    if (post.userId !== req.userId)
      return next(createError(403, 'You can update only your own community post'));

    const updatedPost = await prisma.communityPost.update({
      where: { id },
      data: {
        title: title || post.title,
        content: content || post.content,
      },
    });
    res.status(200).json(updatedPost);
  } catch (error) {
    next(createError(500, 'Failed to update community post', { details: error.message }));
  }
};

// Delete a community post (only allowed by the post creator)
export const deleteCommunityPost = async (req, res, next) => {
  const { id } = req.params;
  try {
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) return next(createError(404, 'Community post not found'));
    if (post.userId !== req.userId)
      return next(createError(403, 'You can delete only your own community post'));

    await prisma.communityPost.delete({ where: { id } });
    res.status(200).json({ message: 'Community post deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete community post', { details: error.message }));
  }
};
