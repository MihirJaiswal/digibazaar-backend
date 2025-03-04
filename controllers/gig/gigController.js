// gig.controller.js
import { PrismaClient, CategoryEnum } from '@prisma/client';
import createError from '../../utils/createError.js';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

/**
 * Create a new gig.
 */
export const createGig = async (req, res, next) => {
  try {
    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Unauthorized! Token missing"));

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;
    const isSeller = decoded.isSeller;
    if (!isSeller) return next(createError(403, "Only sellers can create a gig!"));

    // Validate category
    const validCategories = Object.values(CategoryEnum);
    if (!validCategories.includes(req.body.categoryId)) {
      return next(createError(400, "Invalid category!"));
    }

    const newGig = await prisma.gig.create({
      data: {
        user: { connect: { id: userId } },
        title: req.body.title,
        category: req.body.categoryId, // ENUM value
        desc: req.body.desc,
        price: parseInt(req.body.price, 10),
        cover: req.body.cover,
        images: req.body.images,
        shortDesc: req.body.shortDesc,
        resume: req.body.resume,
        yearsOfExp: parseInt(req.body.yearsOfExp, 10),
        deliveryTime: parseInt(req.body.deliveryTime, 10),
        revisionNumber: parseInt(req.body.revisionNumber, 10),
        features: req.body.features,
      },
    });

    res.status(201).json(newGig);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a gig.
 * This controller now follows the same token extraction and seller validation as createGig.
 */
export const deleteGig = async (req, res, next) => {
  try {
    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Unauthorized! Token missing"));

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;
    const isSeller = decoded.isSeller;
    if (!isSeller) return next(createError(403, "Only sellers can delete a gig!"));

    // Find the gig by id
    const gig = await prisma.gig.findUnique({
      where: { id: req.params.id },
    });
    if (!gig) return next(createError(404, "Gig not found!"));
    if (gig.userId !== userId) {
      return next(createError(403, "You can delete only your own gig!"));
    }

    await prisma.gig.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Gig has been deleted!" });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing gig.
 * Only sellers can update their own gigs.
 */
export const updateGig = async (req, res, next) => {
  try {
    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Unauthorized! Token missing"));

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;
    const isSeller = decoded.isSeller;
    if (!isSeller) return next(createError(403, "Only sellers can update a gig!"));

    // Find the gig to update
    const gig = await prisma.gig.findUnique({
      where: { id: req.params.id },
    });
    if (!gig) return next(createError(404, "Gig not found!"));
    if (gig.userId !== userId) {
      return next(createError(403, "You can update only your own gig!"));
    }

    // If category is provided, validate it
    const { categoryId } = req.body;
    if (categoryId) {
      const validCategories = Object.values(CategoryEnum);
      if (!validCategories.includes(categoryId)) {
        return next(createError(400, "Invalid category!"));
      }
    }

    // Build the update data; if a field is not provided, keep the current value
    const updatedData = {
      title: req.body.title !== undefined ? req.body.title : gig.title,
      category: req.body.categoryId !== undefined ? req.body.categoryId : gig.category,
      desc: req.body.desc !== undefined ? req.body.desc : gig.desc,
      price: req.body.price !== undefined ? parseInt(req.body.price, 10) : gig.price,
      cover: req.body.cover !== undefined ? req.body.cover : gig.cover,
      images: req.body.images !== undefined ? req.body.images : gig.images,
      shortDesc: req.body.shortDesc !== undefined ? req.body.shortDesc : gig.shortDesc,
      resume: req.body.resume !== undefined ? req.body.resume : gig.resume,
      yearsOfExp: req.body.yearsOfExp !== undefined ? parseInt(req.body.yearsOfExp, 10) : gig.yearsOfExp,
      deliveryTime: req.body.deliveryTime !== undefined ? parseInt(req.body.deliveryTime, 10) : gig.deliveryTime,
      revisionNumber: req.body.revisionNumber !== undefined ? parseInt(req.body.revisionNumber, 10) : gig.revisionNumber,
      features: req.body.features !== undefined ? req.body.features : gig.features,
    };

    const updatedGig = await prisma.gig.update({
      where: { id: req.params.id },
      data: updatedData,
    });

    res.status(200).json(updatedGig);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single gig by id.
 */
export const getGig = async (req, res, next) => {
  try {
    const gig = await prisma.gig.findUnique({
      where: { id: req.params.id },
      include: { user: true }, // Include seller details if needed
    });
    if (!gig) return next(createError(404, "Gig not found!"));
    res.status(200).json(gig);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all gigs with optional filtering.
 */
export const getGigs = async (req, res, next) => {
  const { userId, categoryId, min, max, search, sort } = req.query;
  try {
    const gigs = await prisma.gig.findMany({
      where: {
        ...(userId && { userId }),
        ...(categoryId && { categoryId }),
        ...((min || max) && {
          price: {
            ...(min && { gte: parseInt(min, 10) }),
            ...(max && { lte: parseInt(max, 10) }),
          },
        }),
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
      },
      orderBy: sort ? { [sort]: 'desc' } : undefined,
    });
    res.status(200).json(gigs);
  } catch (err) {
    next(err);
  }
};
