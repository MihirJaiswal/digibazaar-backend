// gigOrder.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new Gig Order
export const createGigOrder = async (req, res, next) => {
  const { gigId, price, paymentIntent } = req.body;

  if (!gigId || !price) {
    return next(createError(400, "Missing required fields: gigId and price"));
  }

  try {
    // Retrieve the gig to get the seller's ID
    const gig = await prisma.gig.findUnique({
      where: { id: gigId },
    });

    if (!gig) return next(createError(404, "Gig not found"));

    const newGigOrder = await prisma.gigOrder.create({
      data: {
        gigId,
        buyerId: req.userId,    // Authenticated user as buyer
        sellerId: gig.userId,     // Seller is the owner of the gig
        price: parseInt(price),
        paymentIntent,
      },
    });

    res.status(201).json(newGigOrder);
  } catch (error) {
    next(error);
  }
};

// Get a specific Gig Order by ID
export const getGigOrder = async (req, res, next) => {
  const { id } = req.params;

  try {
    const order = await prisma.gigOrder.findUnique({
      where: { id },
      include: {
        gig: true,
        buyer: true,
        seller: true,
      },
    });

    if (!order) return next(createError(404, "Gig order not found"));
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// Update Gig Order status (for example, only seller can update status)
export const updateGigOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // expected to be one of the OrderStatus enum values

  try {
    const order = await prisma.gigOrder.findUnique({
      where: { id },
    });

    if (!order) return next(createError(404, "Gig order not found"));

    // Ensure only the seller can update the order status
    if (order.sellerId !== req.userId) {
      return next(createError(403, "Only the seller can update the order status"));
    }

    const updatedOrder = await prisma.gigOrder.update({
      where: { id },
      data: { status },
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    next(error);
  }
};
