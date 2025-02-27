// community.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new community
export const createCommunity = async (req, res, next) => {
  const { name, description, image, isPublic } = req.body;
  if (!name) {
    return next(createError(400, 'Community name is required'));
  }
  if (!req.userId) {    
    return next(createError(401, 'Authentication required'));
  }
  try {
    const community = await prisma.community.create({
      data: {
        name,
        description,
        image,
        isPublic: isPublic !== undefined ? isPublic : true,
        creator: { connect: { id: req.userId } },
      },
    });
    res.status(201).json(community);
  } catch (error) {
    console
    next(createError(500, 'Failed to create community', { details: error.message }));
  }
};


// Get a single community by ID (including related creator, members, and posts)
export const getCommunityById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        creator: true,
        members: true,
        posts: true,
      },
    });
    if (!community) return next(createError(404, 'Community not found'));
    res.status(200).json(community);
  } catch (error) {
    next(createError(500, 'Failed to fetch community', { details: error.message }));
  }
};

// Get all communities (optionally including related data)
export const getAllCommunities = async (req, res, next) => {
  try {
    const communities = await prisma.community.findMany({
      include: {
        creator: true,
        members: true,
        posts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(communities);
  } catch (error) {
    next(createError(500, 'Failed to fetch communities', { details: error.message }));
  }
};

// Update an existing community (only allowed by the creator)
export const updateCommunity = async (req, res, next) => {
  const { id } = req.params;
  const { name, description, image, isPublic } = req.body;
  try {
    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) return next(createError(404, 'Community not found'));
    if (community.creatorId !== req.userId)
      return next(createError(403, 'You can update only your own community'));

    const updatedCommunity = await prisma.community.update({
      where: { id },
      data: {
        name: name || community.name,
        description: description !== undefined ? description : community.description,
        image: image !== undefined ? image : community.image,
        isPublic: isPublic !== undefined ? isPublic : community.isPublic,
      },
    });
    res.status(200).json(updatedCommunity);
  } catch (error) {
    next(createError(500, 'Failed to update community', { details: error.message }));
  }
};

// Delete a community (only allowed by the creator)
export const deleteCommunity = async (req, res, next) => {
  const { id } = req.params;
  try {
    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) return next(createError(404, 'Community not found'));
    if (community.creatorId !== req.userId)
      return next(createError(403, 'You can delete only your own community'));

    await prisma.community.delete({ where: { id } });
    res.status(200).json({ message: 'Community deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete community', { details: error.message }));
  }
};
