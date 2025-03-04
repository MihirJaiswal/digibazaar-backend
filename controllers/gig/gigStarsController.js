// gigStars.controller.js
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Add a star to a gig.
 */
export const addGigStar = async (req, res, next) => {
  const { gigId, star } = req.body;
  const authHeader = req.headers.authorization;

  // Validate required fields
  if (!gigId || star === undefined) {
    return next(createError(400, "Missing required fields: gigId and star"));
  }
  // Optionally, validate that star is a number between 1 and 5
  const starValue = parseInt(star);
  if (isNaN(starValue) || starValue < 1 || starValue > 5) {
    return next(createError(400, "Invalid star value; it must be a number between 1 and 5"));
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError(401, "Unauthorized: Missing token"));
  }

  try {
    // Extract userId from token
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded?.id;
    if (!userId) {
      return next(createError(401, "Unauthorized: Invalid token"));
    }

    console.log("[addGigStar] Received request for gigId:", gigId, "by userId:", userId);

    const existingStar = await prisma.gigStar.findFirst({ where: { gigId, userId } });
    if (existingStar) {
      return next(createError(400, "User has already starred this gig"));
    }

    const newStar = await prisma.gigStar.create({
      data: {
        gigId,
        userId,
        star: starValue,
      },
    });

    console.log("[addGigStar] New star created:", newStar);
    res.status(201).json({ message: "Gig starred", star: newStar });
  } catch (error) {
    console.error("[addGigStar] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};

/**
 * Remove a star from a gig.
 */
export const removeGigStar = async (req, res, next) => {
  const { gigId } = req.body;
  const authHeader = req.headers.authorization;

  if (!gigId) {
    return next(createError(400, "Missing required field: gigId"));
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

    console.log("[removeGigStar] Received request for gigId:", gigId, "by userId:", userId);

    const existingStar = await prisma.gigStar.findFirst({ where: { gigId, userId } });
    if (!existingStar) {
      return next(createError(400, "User has not starred this gig"));
    }

    await prisma.gigStar.delete({ where: { id: existingStar.id } });
    console.log("[removeGigStar] Star removed for gigId:", gigId);

    res.status(200).json({ message: "Gig unstarred", star: existingStar });
  } catch (error) {
    console.error("[removeGigStar] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};

/**
 * Get all users who starred a specific gig.
 */
export const getGigStars = async (req, res, next) => {
  const { gigId } = req.params;
  if (!gigId) {
    return next(createError(400, "Missing required field: gigId"));
  }

  try {
    const stars = await prisma.gigStar.findMany({
      where: { gigId },
      include: { user: true },
    });
    res.status(200).json(stars);
  } catch (error) {
    console.error("[getGigStars] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};

/**
 * Get total star count for a gig.
 */
export const getGigStarCount = async (req, res, next) => {
  const { gigId } = req.params;
  if (!gigId) {
    return next(createError(400, "Missing required field: gigId"));
  }

  try {
    const starCount = await prisma.gigStar.count({ where: { gigId } });
    res.status(200).json({ starCount });
  } catch (error) {
    console.error("[getGigStarCount] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};
