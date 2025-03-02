// communityPost.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new community post
export const createCommunityPost = async (req, res, next) => {
  console.log("----- createCommunityPost called -----");
  console.log("Request body:", req.body);
  console.log("Request userId (from middleware):", req.userId);

  const { communityId, title, content, link, image, video, audio } = req.body;
  
  if (!communityId || !title || !content) {
    console.log("Missing required fields:", { communityId, title, content });
    return next(createError(400, 'Missing required fields: communityId, title, and content'));
  }

  // Fallback: if req.userId is undefined, try to use the userId provided in the body.
  const effectiveUserId = req.userId || req.body.userId;
  if (!effectiveUserId) {
    return next(createError(401, 'Authentication required'));
  }
  
  try {
    console.log("Attempting to create post with data:", {
      communityId,
      userId: effectiveUserId,
      title,
      content,
      link,
      image,
      video,
      audio,
    });
    
    const newPost = await prisma.communityPost.create({
      data: {
        // Connect to an existing community using its ID.
        community: { connect: { id: communityId } },
        // Connect to an existing user using effectiveUserId.
        user: { connect: { id: effectiveUserId } },
        title,
        content,
        // Provide defaults if the optional fields are not provided.
        link: link || "",
        image: image || "",
        video: video || "",
        audio: audio || "",
      },
    });
    
    console.log("Post created successfully:", newPost);
    res.status(201).json(newPost);
  } catch (error) {
    console.error("Error in createCommunityPost:", error);
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

// Like a community post
// Like a community post
// Like a community post
export const likeCommunityPost = async (req, res, next) => {
  // Extract the post id from the route, renaming 'id' to postId
  const { id: postId } = req.params;
  // Extract userId from the request body (ideally, this should come from verified JWT middleware)
  const { userId } = req.body;
  
  console.log("likeCommunityPost called with postId:", postId, "and userId:", userId);
  
  if (!postId) {
    return next(createError(400, "Missing post id in route parameters"));
  }
  if (!userId) {
    return next(createError(400, "Missing userId in request body"));
  }
  
  try {
    // Verify that the post exists
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      console.log("Post not found for id:", postId);
      return next(createError(404, 'Community post not found'));
    }
    
    // Check if a like already exists using findFirst for the composite check
    const existingLike = await prisma.postLike.findFirst({
      where: { postId, userId }
    });
    
    if (existingLike) {
      console.log("Like already exists for postId:", postId, "and userId:", userId);
      return res.status(200).json({ message: 'Already liked' });
    }
    
    // Create a new like record
    const newLike = await prisma.postLike.create({
      data: { postId, userId },
    });
    
    console.log("New like created:", newLike);
    res.status(201).json(newLike);
  } catch (error) {
    console.error("Error in likeCommunityPost:", error);
    next(createError(500, 'Failed to like community post', { details: error.message }));
  }
};

// Unlike (dislike) a community post
export const unlikeCommunityPost = async (req, res, next) => {
  // Extract the post id from the route (rename 'id' to postId)
  const { id: postId } = req.params;
  // Extract userId from the request body
  const { userId } = req.body;
  
  console.log("unlikeCommunityPost called with postId:", postId, "and userId:", userId);
  
  if (!postId) {
    return next(createError(400, "Missing post id in route parameters"));
  }
  if (!userId) {
    return next(createError(400, "Missing userId in request body"));
  }
  
  try {
    // Verify that the post exists
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      console.log("Post not found for id:", postId);
      return next(createError(404, 'Community post not found'));
    }
    
    // Find the existing like record using findFirst (composite key check)
    const existingLike = await prisma.postLike.findFirst({
      where: { postId, userId }
    });
    if (!existingLike) {
      console.log("No existing like found for postId:", postId, "and userId:", userId);
      return next(createError(404, 'Like not found'));
    }
    
    // Delete the like record
    await prisma.postLike.delete({ where: { id: existingLike.id } });
    res.status(200).json({ message: 'Community post unliked successfully' });
  } catch (error) {
    console.error("Error in unlikeCommunityPost:", error);
    next(createError(500, 'Failed to unlike community post', { details: error.message }));
  }
};



export const getLikesForPost = async (req, res, next) => {
  const { id: postId } = req.params;
  if (!postId) {
    return next(createError(400, "Missing post id in route parameters"));
  }
  try {
    const likes = await prisma.postLike.findMany({
      where: { postId },
    });
    res.status(200).json(likes);
  } catch (error) {
    console.error("Error in getLikesForPost:", error);
    next(createError(500, "Failed to retrieve likes for community post", { details: error.message }));
  }
};
