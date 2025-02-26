// follow.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Follow a user
export const followUser = async (req, res, next) => {
  const { followingId } = req.body;
  if (!followingId) {
    return next(createError(400, 'Missing required field: followingId'));
  }
  if (followingId === req.userId) {
    return next(createError(400, 'You cannot follow yourself'));
  }

  try {
    // Check if the follow relationship already exists
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: req.userId, followingId },
      },
    });
    if (existingFollow) {
      return next(createError(400, 'You are already following this user'));
    }

    const newFollow = await prisma.follow.create({
      data: {
        followerId: req.userId,
        followingId,
      },
    });
    res.status(201).json(newFollow);
  } catch (error) {
    next(createError(500, 'Failed to follow user', { details: error.message }));
  }
};

// Unfollow a user
export const unfollowUser = async (req, res, next) => {
  const { followingId } = req.body;
  if (!followingId) {
    return next(createError(400, 'Missing required field: followingId'));
  }

  try {
    // Check if the follow relationship exists
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: req.userId, followingId },
      },
    });
    if (!existingFollow) {
      return next(createError(404, 'Follow relationship not found'));
    }

    await prisma.follow.delete({
      where: { id: existingFollow.id },
    });
    res.status(200).json({ message: 'Unfollowed successfully' });
  } catch (error) {
    next(createError(500, 'Failed to unfollow user', { details: error.message }));
  }
};

// Get list of followers for a given user
export const getFollowers = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: true },
    });
    res.status(200).json(followers);
  } catch (error) {
    next(createError(500, 'Failed to fetch followers', { details: error.message }));
  }
};

// Get list of users a given user is following
export const getFollowing = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: true },
    });
    res.status(200).json(following);
  } catch (error) {
    next(createError(500, 'Failed to fetch following', { details: error.message }));
  }
};
