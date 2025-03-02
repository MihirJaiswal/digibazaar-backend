import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Create a new comment on a community post (or reply)
export const createCommunityComment = async (req, res, next) => {
  console.log("----- createCommunityComment called -----");
  console.log("Request body:", req.body);

  const { postId, content, parentId } = req.body;

  // Extract the Authorization token from request headers
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.error("❌ Missing authorization header");
    return next(createError(401, "Missing authorization header"));
  }

  const token = authHeader.split(" ")[1]; // Extract token
  if (!token) {
    console.error("❌ Missing token");
    return next(createError(401, "Missing token"));
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY); // Verify JWT
    userId = decoded.id; // Extract userId from the decoded token
    console.log("✅ User authenticated, userId:", userId);
  } catch (error) {
    console.error("❌ JWT verification failed:", error);
    return next(createError(401, "Invalid or expired token"));
  }

  // Validate required fields
  if (!postId || !content) {
    console.error("❌ Missing required fields:", { postId, content });
    return next(createError(400, "Missing required fields: postId and content"));
  }

  try {
    console.log("📝 Attempting to create comment with data:", {
      postId,
      userId,
      content,
      parentId,
    });

    const newComment = await prisma.communityComment.create({
      data: {
        postId,
        userId,
        content,
        parentId: parentId || null, // allow threaded replies if parentId is provided
      },
    });

    console.log("✅ New comment created successfully:", newComment);
    res.status(201).json(newComment);
  } catch (error) {
    console.error("❌ Error in createCommunityComment:", error);
    next(createError(500, "Failed to create community comment", { details: error.message }));
  }
};

// Update a community comment (only allowed by the comment creator)
export const updateCommunityComment = async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;
  const effectiveUserId = req.userId || req.body.userId;
  
  try {
    const comment = await prisma.communityComment.findUnique({ where: { id } });
    if (!comment) return next(createError(404, 'Community comment not found'));
    
    if (comment.userId !== effectiveUserId) {
      return next(createError(403, 'You can update only your own comment'));
    }
    
    const updatedComment = await prisma.communityComment.update({
      where: { id },
      data: { content: content || comment.content },
    });
    
    res.status(200).json(updatedComment);
  } catch (error) {
    next(createError(500, 'Failed to update community comment', { details: error.message }));
  }
};

// Delete a community comment (only allowed by the comment creator)
export const deleteCommunityComment = async (req, res, next) => {
  const { id } = req.params;
  const effectiveUserId = req.userId || req.body.userId || process.env.TEST_USER_ID;
  
  try {
    const comment = await prisma.communityComment.findUnique({ where: { id } });
    if (!comment) return next(createError(404, 'Community comment not found'));
    
    if (comment.userId !== effectiveUserId) {
      return next(createError(403, 'You can delete only your own comment'));
    }
    
    await prisma.communityComment.delete({ where: { id } });
    res.status(200).json({ message: 'Community comment deleted successfully' });
  } catch (error) {
    next(createError(500, 'Failed to delete community comment', { details: error.message }));
  }
};

// Like a community comment
export const likeCommunityComment = async (req, res, next) => {
  // Debug: log the incoming request parameters and headers
  console.log("Request received in likeCommunityComment");
  console.log("Request Params:", req.params);
  console.log("Request Headers:", req.headers);

  // Extract commentId from route params (assuming route is defined as /:id/like)
  const { id: commentId } = req.params;
  console.log("Extracted commentId:", commentId);

  // Extract and verify the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.error("Missing authorization header");
    return next(createError(401, 'Missing authorization header'));
  }
  console.log("Authorization header found:", authHeader);

  const token = authHeader.split(' ')[1];
  console.log("Extracted token:", token);

  if (!token) {
    console.error("Missing token after splitting header");
    return next(createError(401, 'Missing token'));
  }
  
  let effectiveUserId;
  try {
    // Adjust the secret and payload property (here using `id`) according to your setup
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    effectiveUserId = decoded.id;
    console.log("Decoded token:", decoded);
    console.log("Effective userId:", effectiveUserId);
  } catch (err) {
    console.error("JWT verification failed:", err);
    return next(createError(401, 'Invalid or expired token'));
  }

  console.log("likeCommunityComment called with commentId:", commentId, "and userId:", effectiveUserId);

  if (!commentId) {
    console.error("Comment id is missing in route parameters");
    return next(createError(400, "Missing comment id in route parameters"));
  }
  
  try {
    const comment = await prisma.communityComment.findUnique({ where: { id: commentId } });
    console.log("Comment fetched from database:", comment);
    if (!comment) {
      console.error("Community comment not found");
      return next(createError(404, 'Community comment not found'));
    }
    
    // Check if a like already exists for this user on the comment
    const existingLike = await prisma.vote.findFirst({ where: { commentId, userId: effectiveUserId } });
    console.log("Existing like (if any) for this comment:", existingLike);
    if (existingLike) {
      console.log("Like already exists for commentId:", commentId, "and userId:", effectiveUserId);
      return res.status(200).json({ message: 'Already liked' });
    }
    
    // Create the like record
    const newLike = await prisma.vote.create({
      data: { commentId, userId: effectiveUserId },
    });
    
    console.log("New like created on comment:", newLike);
    res.status(201).json(newLike);
  } catch (error) {
    console.error("Error in likeCommunityComment:", error);
    next(createError(500, 'Failed to like community comment', { details: error.message }));
  }
};


// Unlike a community comment
export const unlikeCommunityComment = async (req, res, next) => {
  // Destructure 'id' from params and rename to commentId
  const { id: commentId } = req.params;
  const effectiveUserId = req.userId || req.body.userId || process.env.TEST_USER_ID;
  
  try {
    const comment = await prisma.communityComment.findUnique({ where: { id: commentId } });
    if (!comment) return next(createError(404, 'Community comment not found'));
    
    const existingLike = await prisma.vote.findFirst({ where: { commentId, userId: effectiveUserId } });
    if (!existingLike) return next(createError(404, 'Like not found'));
    
    await prisma.vote.delete({ where: { id: existingLike.id } });
    res.status(200).json({ message: 'Community comment unliked successfully' });
  } catch (error) {
    next(createError(500, 'Failed to unlike community comment', { details: error.message }));
  }
};

// Get all comments for a post
export const getAllCommentsForPost = async (req, res, next) => {
  const { postId } = req.params;

  try {
    const comments = await prisma.communityComment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            username: true,  // ✅ Fetch only the username
          },
        },
      },
    });

    console.log("Comments fetched:", comments);
    res.status(200).json(comments);
  } catch (error) {
    next(createError(500, "Failed to get all comments for post", { details: error.message }));
  }
};


//get all likes on  a comment 
export const getAllLikesOnComment = async (req, res, next) => {
  try {
    console.log("Fetching likes for comment:", req.params.commentId);
    
    const likes = await prisma.vote.findMany({
      where: { commentId: req.params.commentId },
    });

    console.log("Likes found:", likes.length);
    res.status(200).json(likes);
  } catch (error) {
    console.error("Error fetching likes:", error);
    next(createError(500, 'Failed to fetch likes on comment', { details: error.message }));
  }
};




