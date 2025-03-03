import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Toggle like for a gig: if already liked, remove it; if not, add it.
 */
export const toggleGigLike = async (req, res, next) => {
  const { gigId } = req.body;
  const authHeader = req.headers.authorization;

  if (!gigId) {
    return next(createError(400, "Missing required field: gigId"));
  }
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError(401, "Unauthorized: Missing token"));
  }

  try {
    // Decode JWT token to get userId
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded?.id;

    if (!userId) {
      return next(createError(401, "Unauthorized: Invalid token"));
    }

    console.log("[toggleGigLike] Received request for gigId:", gigId, "by userId:", userId);

    await prisma.$transaction(async (tx) => {
      const existingLike = await tx.gigLike.findFirst({ where: { gigId, userId } });

      if (existingLike) {
        await tx.gigLike.delete({ where: { id: existingLike.id } });
        console.log("[toggleGigLike] Like removed for gigId:", gigId);
        return res.status(200).json({ message: "Gig unliked" });
      }

      const newLike = await tx.gigLike.create({ data: { gigId, userId } });
      console.log("[toggleGigLike] New like created:", newLike);
      return res.status(201).json({ message: "Gig liked", like: newLike });
    });
  } catch (error) {
    console.error("[toggleGigLike] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};

/**
 * Fetch gigs and include `isLiked` field for the current user.
 */
export const getGigs = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let userId = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      userId = decoded?.id;
    } catch (error) {
      console.error("[getGigs] Invalid token:", error);
    }
  }

  console.log("[getGigs] Called by userId:", userId);

  try {
    const gigs = await prisma.gig.findMany({
      include: {
        user: true,
        likes: userId ? { where: { userId }, select: { id: true } } : false,
      },
    });

    console.log("[getGigs] Gigs fetched from DB:", gigs);

    const gigsWithIsLiked = gigs.map((gig) => ({
      ...gig,
      isLiked: gig.likes && gig.likes.length > 0,
    }));

    console.log("[getGigs] Gigs with isLiked:", gigsWithIsLiked);
    res.status(200).json(gigsWithIsLiked);
  } catch (error) {
    console.error("[getGigs] Error:", error);
    next(createError(500, "Internal Server Error"));
  }
};
