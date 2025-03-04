// gigReview.controller.js
import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * Create a new gig review.
 */
export const createGigReview = async (req, res, next) => {
  const { gigId, star, content } = req.body;
  const authHeader = req.headers.authorization;

  if (!gigId || star === undefined || !content) {
    return next(createError(400, "Missing required fields: gigId, star, and content"));
  }
  // Validate star value (e.g., must be a number between 1 and 5)
  const starValue = parseInt(star);
  if (isNaN(starValue) || starValue < 1 || starValue > 5) {
    return next(createError(400, "Invalid star value; it must be a number between 1 and 5"));
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError(401, "Unauthorized: Missing token"));
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded?.id;
    if (!userId) {
      return next(createError(401, "Unauthorized: Invalid token"));
    }

    const review = await prisma.gigReview.create({
      data: {
        star: starValue,
        content,
        user: { connect: { id: userId } },
        gig: { connect: { id: gigId } },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePic: true,
          },
        },
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("[createGigReview] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};

/**
 * Update an existing gig review.
 */
export const updateGigReview = async (req, res, next) => {
  const { id } = req.params;
  const { star, content } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError(401, "Unauthorized: Missing token"));
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded?.id;
    if (!userId) {
      return next(createError(401, "Unauthorized: Invalid token"));
    }

    const review = await prisma.gigReview.findUnique({ where: { id } });
    if (!review) return next(createError(404, "Review not found"));
    if (review.userId !== userId) {
      return next(createError(403, "You can update only your own review"));
    }

    // Optionally validate star if provided
    let newStar = review.star;
    if (star !== undefined) {
      newStar = parseInt(star);
      if (isNaN(newStar) || newStar < 1 || newStar > 5) {
        return next(createError(400, "Invalid star value; it must be a number between 1 and 5"));
      }
    }

    const updatedReview = await prisma.gigReview.update({
      where: { id },
      data: {
        star: newStar,
        content: content || review.content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePic: true,
          },
        },
      },
    });

    res.status(200).json(updatedReview);
  } catch (error) {
    console.error("[updateGigReview] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};

/**
 * Delete a gig review.
 */
export const deleteGigReview = async (req, res, next) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError(401, "Unauthorized: Missing token"));
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded?.id;
    if (!userId) {
      return next(createError(401, "Unauthorized: Invalid token"));
    }

    const review = await prisma.gigReview.findUnique({ where: { id } });
    if (!review) return next(createError(404, "Review not found"));
    if (review.userId !== userId) {
      return next(createError(403, "You can delete only your own review"));
    }

    await prisma.gigReview.delete({ where: { id } });
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("[deleteGigReview] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};

/**
 * Get all reviews for a gig.
 */
export const getGigReviews = async (req, res, next) => {
  const { gigId } = req.params;
  if (!gigId) {
    return next(createError(400, "Missing required field: gigId"));
  }
  try {
    const reviews = await prisma.gigReview.findMany({
      where: { gigId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePic: true,
          },
        },
      },
    });
    res.status(200).json(reviews);
  } catch (error) {
    console.error("[getGigReviews] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};

/**
 * Get all reviews for a user.
 */
export const getReviewsForUser = async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(createError(400, "Missing required field: userId"));
  }
  try {
    const reviews = await prisma.gigReview.findMany({
      where: { userId },
      include: {
        gig: true,
      },
    });
    res.status(200).json(reviews);
  } catch (error) {
    console.error("[getReviewsForUser] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};
