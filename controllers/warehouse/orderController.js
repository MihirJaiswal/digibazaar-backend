import { PrismaClient } from "@prisma/client";
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * Function to verify the JWT token and get user details
 */
const verifyToken = (req) => {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token && req.cookies?.__session) {
    token = req.cookies.__session;
  }
  if (!token) throw createError(401, "Access denied. No token provided.");
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    return decoded.id;
  } catch (error) {
    console.log(error);
    console.log(token);
    throw createError(403, "Invalid token");
  }
};

/**
 * Create a new order (Only the logged-in user can create an order for themselves).
 */
export const createOrder = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    if (userId !== req.body.userId) {
      return next(createError(403, "You can only create an order for yourself.")); // Ensure user is creating order for themselves
    }

    const newOrder = await prisma.productOrder.create({
      data: {
        storeId: req.body.storeId,
        userId: userId, // Ensure order belongs to the authenticated user
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
 * Update order status (Only the store owner or buyer can update it).
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const order = await prisma.productOrder.findUnique({
      where: { id: req.params.id },
      include: { store: true }, // Include store details to check owner
    });

    if (!order) return next(createError(404, "Order not found!"));

    // Only the store owner or the buyer can update the order
    if (order.userId !== userId && order.store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to update this order.")); // Ensure only store owner or buyer can update
    }

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
 * Assign stock to an order (Only store owners can assign stock).
 */
export const assignStockToOrder = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token
    const { orderId, items } = req.body;

    const order = await prisma.productOrder.findUnique({
      where: { id: orderId },
      include: { store: true }, // Get store details
    });

    if (!order) return next(createError(404, "Order not found!"));

    // Only the store owner can assign stock
    if (order.store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to assign stock to this order.")); // Ensure only store owner assigns stock
    }

    // ✅ Proceed with stock assignment logic...
    await prisma.$transaction(async (prisma) => {
      for (const item of items) {
        const inventory = await prisma.inventory.findUnique({
          where: { warehouseId_productId: { warehouseId: item.warehouseId, productId: item.productId } },
          select: { quantity: true },
        });

        if (!inventory || inventory.quantity < item.quantity) {
          throw createError(400, `Insufficient stock for product ${item.productId}`); // Handle insufficient stock
        }

        await prisma.inventory.update({
          where: { warehouseId_productId: { warehouseId: item.warehouseId, productId: item.productId } },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    });

    await prisma.productOrder.update({
      where: { id: orderId },
      data: { status: "IN_PROGRESS" },
    });

    res.status(200).json({ message: "Stock assigned successfully, order moved to IN_PROGRESS!" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all orders of a specific store (Only the store owner can view them).
 */
export const getOrders = async (req, res, next) => {
  try {
    console.log("getOrders: Received request", { headers: req.headers, body: req.body });

    // Extract and verify token directly using jwt.verify.
    const authHeader = req.headers.authorization;
    console.log("getOrders: authHeader:", authHeader);
    if (!authHeader) {
      console.log("getOrders: No authentication token found.");
      return next(createError(401, "No authentication token found."));
    }
    const token = authHeader.split(" ")[1];
    console.log("getOrders: Extracted token:", token);
    if (!token || token === "null") {
      console.log("getOrders: Invalid token.");
      return next(createError(401, "Invalid token."));
    }
    
    // Verify the token.
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("getOrders: Decoded token:", decoded);
    const userId = decoded.id;
    console.log("getOrders: Decoded User ID:", userId);

    // Fetch the store using the user's ID (assuming ownerId matches the user id).
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
      select: { id: true, ownerId: true },
    });
    console.log("getOrders: Fetched store:", store);

    if (!store) {
      console.log("getOrders: Store not found for this user.");
      return next(createError(404, "Store not found for this user."));
    }

    // Ensure the store's owner matches the authenticated user.
    if (store.ownerId !== userId) {
      console.log("getOrders: Unauthorized - store owner does not match userId.");
      return next(createError(403, "You are not authorized to view these orders."));
    }

    // Fetch orders using the store's ID.
    const orders = await prisma.productOrder.findMany({
      where: { storeId: store.id },
      include: { items: true },
    });
    console.log("getOrders: Fetched orders:", orders);

    res.status(200).json(orders);
  } catch (err) {
    console.error("getOrders: Error occurred:", err);
    next(err);
  }
};





/**
 * Get a single order by ID (Only the buyer or store owner can view).
 */
export const getOrder = async (req, res, next) => {
  try {
    const user = verifyToken(req); // Authenticate user
    const userId = user; // Get the user ID from the token

    const order = await prisma.productOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true, store: true },
    });

    if (!order) return next(createError(404, "Order not found!"));

    // Only the buyer or store owner can view the order
    if (order.userId !== userId && order.store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to view this order.")); // Ensure only buyer or store owner can view
    }

    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
};
