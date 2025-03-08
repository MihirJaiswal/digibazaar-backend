// community.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../../utils/createError.js';
import { communityUpload } from '../../config/cloudinary.config.js';

const prisma = new PrismaClient();

export const uploadCommunityImage = communityUpload.fields([
  {name: 'image', maxCount: 1},
  {name: 'coverImage', maxCount: 1}
])

// Create a new community
export const createCommunity = async (req, res, next) => {
  console.log("=== Incoming createCommunity Request ===");
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);
  console.log("req.userId:", req.userId);

  const { name, description, isPublic, rules, tags, allowNSFW } = req.body;
  let imageUrl = null;
  let coverImageUrl = null;

  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      imageUrl = req.files.image[0].path;
      console.log("Image file path:", imageUrl);
    }
    if (req.files.coverImage && req.files.coverImage[0]) {
      coverImageUrl = req.files.coverImage[0].path;
      console.log("Cover image file path:", coverImageUrl);
    }
  }

  if (!name) {
    console.log("Error: Community name is missing in req.body");
    return next(createError(400, 'Community name is required'));
  }

  if (!req.userId) {    
    console.log("Error: Authentication failed, req.userId is missing");
    return next(createError(401, 'Authentication required'));
  }

  // Convert string booleans to actual booleans
  const isPublicBoolean = isPublic === 'true';
  const allowNSFWBoolean = allowNSFW === 'true';

  try {
    const communityData = {
      name,
      description,
      image: imageUrl,
      isPublic: isPublic !== undefined ? isPublicBoolean : true,
      creator: { connect: { id: req.userId } },
      rules,
      tags,
      coverImage: coverImageUrl,
      allowNSFW: allowNSFW !== undefined ? allowNSFWBoolean : false
    };

    console.log("Creating community with data:", communityData);

    const community = await prisma.community.create({
      data: communityData,
    });

    console.log("Community created successfully:", community);
    res.status(201).json(community);
  } catch (error) {
    console.error("Error in createCommunity:", error);
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

//get all communities by user
export const getAllCommunitiesByUser = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const communities = await prisma.community.findMany({
      where: { creatorId: userId },
      include: {
        creator: true,
        members: true,
        posts: true,
      },
    });
    res.status(200).json(communities);
  } catch (error) {
    next(createError(500, 'Failed to get all communities by user', { details: error.message }));
  }
};


//get all communities joined by user
export const getAllCommunitiesJoinedByUser = async (req, res, next) => {
  const { userId } = req.params; // userId comes as a string from req.params

  try {
    const communities = await prisma.community.findMany({
      where: {
        members: {
          some: {
            userId: userId, // ✅ Correct way to filter user's joined communities
          },
        },
      },
      include: {
        creator: true,
        members: true,
        posts: true,
      },
    });

    console.log(communities); // Debugging output
    res.status(200).json(communities);
  } catch (error) {
    next(createError(500, "Failed to get all communities joined by user", { details: error.message }));
  }
};



