// productOrder.controller.js
import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';

const prisma = new PrismaClient();

// Create a new Product Order
export const createProductOrder = async (req, res, next) => {
  const { productId, price, paymentIntent } = req.body;

  if (!productId || !price) {
    return next(createError(400, "Missing required fields: productId and price"));
  }

  try {
    // Retrieve the product to get the seller's ID
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) return next(createError(404, "Product not found"));

    const newProductOrder = await prisma.productOrder.create({
      data: {
        productId,
        buyerId: req.userId,      // Authenticated user as buyer
        sellerId: product.userId,   // Seller is the owner of the product
        price: parseInt(price),
        paymentIntent,
      },
    });

    res.status(201).json(newProductOrder);
  } catch (error) {
    next(error);
  }
};

// Get a specific Product Order by ID
export const getProductOrder = async (req, res, next) => {
  const { id } = req.params;

  try {
    const order = await prisma.productOrder.findUnique({
      where: { id },
      include: {
        product: true,
        buyer: true,
        seller: true,
      },
    });

    if (!order) return next(createError(404, "Product order not found"));
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// Update Product Order status (typically, only the seller can update)
export const updateProductOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // should be one of the OrderStatus values

  try {
    const order = await prisma.productOrder.findUnique({
      where: { id },
    });

    if (!order) return next(createError(404, "Product order not found"));

    // Only allow the seller to update the order status
    if (order.sellerId !== req.userId) {
      return next(createError(403, "Only the seller can update the order status"));
    }

    const updatedOrder = await prisma.productOrder.update({
      where: { id },
      data: { status },
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    next(error);
  }
};
