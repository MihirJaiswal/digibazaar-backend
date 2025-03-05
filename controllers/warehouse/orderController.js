import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";

const prisma = new PrismaClient();

/**
 * Create a new order.
 */
export const createOrder = async (req, res, next) => {
  try {
    const newOrder = await prisma.productOrder.create({
      data: {
        storeId: req.body.storeId,
        userId: req.body.userId,
        totalPrice: req.body.totalPrice,
        status: "PENDING",
        shippingAddress: req.body.shippingAddress,
        paymentStatus: "PENDING",
        items: { create: req.body.items }, // Expecting an array of items
      },
    });
    res.status(201).json(newOrder);
  } catch (err) {
    next(err);
  }
};

/**
 * Update order status (Pending, In Progress, Completed, etc.).
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const updatedOrder = await prisma.productOrder.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.status(200).json(updatedOrder);
  } catch (err) {
    next(err);
  }
};

/**
 * Assign stock to orders (deduct stock from inventory).
 */
export const assignStockToOrder = async (req, res, next) => {
  try {
    const { orderId, items } = req.body;

    for (const item of items) {
      await prisma.inventory.update({
        where: { warehouseId_productId: { warehouseId: item.warehouseId, productId: item.productId } },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    res.status(200).json({ message: "Stock assigned to order successfully!" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all orders.
 */
export const getOrders = async (req, res, next) => {
  try {
    const orders = await prisma.productOrder.findMany({
      include: { items: true },
    });
    res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single order by ID.
 */
export const getOrder = async (req, res, next) => {
  try {
    const order = await prisma.productOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) return next(createError(404, "Order not found!"));
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
};
