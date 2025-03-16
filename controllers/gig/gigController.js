// gig.controller.js
import { PrismaClient, StoreCategory } from '@prisma/client';
import createError from '../../utils/createError.js';
import jwt from 'jsonwebtoken';
import { gigUpload } from '../../config/cloudinary.config.js';

const prisma = new PrismaClient();

/**
 * Create a new gig (Supplier Listing).
 */
export const uploadGigImage = gigUpload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

export const createGig = async (req, res, next) => {
  try {
    // Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Unauthorized! Token missing"));

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;
    const isSeller = decoded.isSeller;
    if (!isSeller) return next(createError(403, "Only sellers can create a gig!"));

    // Validate category against new StoreCategory enum
    const validCategories = Object.values(StoreCategory);
    if (!validCategories.includes(req.body.categoryId)) {
      return next(createError(400, "Invalid category!"));
    }

    // Process file uploads if available
    let coverUrl = req.body.cover;
    let imagesUrls = req.body.images;
    if (req.files) {
      if (req.files.cover && req.files.cover[0]) {
        coverUrl = req.files.cover[0].path;
        console.log("Cover file path:", coverUrl);
      }
      if (req.files.images) {
        imagesUrls = req.files.images.map(file => file.path);
        console.log("Images file paths:", imagesUrls);
      }
    }

    // Create the new gig (supplier listing) using updated fields
    const newGig = await prisma.gig.create({
      data: {
        user: { connect: { id: userId } },
        title: req.body.title,
        category: req.body.categoryId, // Must be a valid StoreCategory value
        description: req.body.description,  // Full product description
        bulkPrice: parseFloat(req.body.bulkPrice),  // Price per unit for bulk orders
        cover: coverUrl,
        images: imagesUrls,
        minOrderQty: parseInt(req.body.minOrderQty, 10), // Minimum Order Quantity
        leadTime: parseInt(req.body.leadTime, 10),  // Fulfillment time in days
        supplyCapacity: req.body.supplyCapacity ? parseInt(req.body.supplyCapacity, 10) : null,  // Optional field
        features: req.body.features, // e.g., available colors, sizes
      },
    });

    res.status(201).json(newGig);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a gig.
 */
export const deleteGig = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Unauthorized! Token missing"));

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;
    const isSeller = decoded.isSeller;
    if (!isSeller) return next(createError(403, "Only sellers can delete a gig!"));

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
 */
export const updateGig = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Unauthorized! Token missing"));

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;
    const isSeller = decoded.isSeller;
    if (!isSeller) return next(createError(403, "Only sellers can update a gig!"));

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
      const validCategories = Object.values(StoreCategory);
      if (!validCategories.includes(categoryId)) {
        return next(createError(400, "Invalid category!"));
      }
    }

    // Build the update data using new supplier listing fields
    const updatedData = {
      title: req.body.title !== undefined ? req.body.title : gig.title,
      category: req.body.categoryId !== undefined ? req.body.categoryId : gig.category,
      description: req.body.description !== undefined ? req.body.description : gig.description,
      bulkPrice: req.body.bulkPrice !== undefined ? parseFloat(req.body.bulkPrice) : gig.bulkPrice,
      cover: req.body.cover !== undefined ? req.body.cover : gig.cover,
      images: req.body.images !== undefined ? req.body.images : gig.images,
      minOrderQty: req.body.minOrderQty !== undefined ? parseInt(req.body.minOrderQty, 10) : gig.minOrderQty,
      leadTime: req.body.leadTime !== undefined ? parseInt(req.body.leadTime, 10) : gig.leadTime,
      supplyCapacity: req.body.supplyCapacity !== undefined ? parseInt(req.body.supplyCapacity, 10) : gig.supplyCapacity,
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
      include: { user: true },
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
        ...(categoryId && { category: categoryId }),
        ...((min || max) && {
          bulkPrice: {
            ...(min && { gte: parseFloat(min) }),
            ...(max && { lte: parseFloat(max) }),
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
