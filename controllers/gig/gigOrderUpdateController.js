import { PrismaClient } from '@prisma/client';
import createError from '../../utils/createError.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper: Verify token and return user ID
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
    throw createError(403, "Invalid token");
  }
};

/**
 * 1. Update Gig Order Status Controller
 *    - Allows the seller to update the status of an order.
 *    - Allowed status values: "IN_PROGRESS", "COMPLETED", "DELIVERED"
 */
export const updateGigOrderStatus = async (req, res, next) => {
  try {
    console.log("🟡 Update Order Status Request Received");
    console.log("🟡 Request Params:", req.params);
    console.log("🟡 Request Body:", req.body);
    console.log("🟡 Request Headers Authorization:", req.headers.authorization);
    console.log("🟡 Request Cookies:", req.cookies);

    // Use verifyToken to extract the seller's user ID
    const sellerId = verifyToken(req);
    console.log("✅ Authenticated Seller ID (from verifyToken):", sellerId);

    const { id } = req.params; // Order ID
    const { status } = req.body; // New status

    // Allowed statuses
    const allowedStatuses = ["IN_PROGRESS", "COMPLETED", "DELIVERED"];
    if (!allowedStatuses.includes(status)) {
      console.warn("⚠️ Invalid status provided:", status);
      return next(createError(400, "Invalid order status. Allowed values are IN_PROGRESS, COMPLETED, DELIVERED."));
    }

    console.log("ℹ️ Updating Order ID:", id, "to status:", status);

    // Find the order by its ID
    const order = await prisma.gigOrder.findUnique({ where: { id } });
    console.log("🟢 Fetched Order Data:", order);

    if (!order) {
      console.error("❌ Order not found:", id);
      return next(createError(404, "Order not found"));
    }

    // Check that the authenticated seller is indeed the seller of this order
    if (order.sellerId !== sellerId) {
      console.error("🚫 Unauthorized update attempt. Order seller:", order.sellerId, "Seller attempting update:", sellerId);
      return next(createError(403, "Only the seller can update the order status"));
    }

    // Update the order status
    const updatedOrder = await prisma.gigOrder.update({
      where: { id },
      data: { status },
    });
    console.log("🟢 Order status updated successfully:", updatedOrder);

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("❌ Error in updateGigOrderStatus:", error);
    next(error);
  }
};

/**
 * 2. Create Gig Order Update Controller
 *    - Allows the seller to add an update about the order.
 *    - The seller provides a gigOrderId, title, and content.
 */
export const createGigOrderUpdate = async (req, res, next) => {
    try {
      console.log("🟡 Create Order Update Request Received");
      console.log("🟡 Request Body:", req.body);
  
      const sellerId = verifyToken(req);
      console.log("✅ Authenticated Seller ID (from verifyToken):", sellerId);
  
      // Destructure expectedDeliveryDate as optional
      const { gigOrderId, title, content, expectedDeliveryDate } = req.body;
      if (!gigOrderId || !title || !content) {
        console.error("❌ Missing required fields in request body:", req.body);
        return next(createError(400, "Missing required fields: gigOrderId, title, and content are required."));
      }
  
      // Check that the order exists and that the seller is authorized
      const order = await prisma.gigOrder.findUnique({ where: { id: gigOrderId } });
      console.log("🟢 Fetched Order for Update:", order);
      if (!order) {
        return next(createError(404, "Order not found"));
      }
      if (order.sellerId !== sellerId) {
        return next(createError(403, "Unauthorized: Only the seller can add updates for this order"));
      }
  
      // Prepare update data and conditionally add expectedDeliveryDate if provided
      const updateData = {
        gigOrderId,
        sellerId,
        title,
        content,
      };
  
      if (expectedDeliveryDate) {
        // Optionally, parse to a Date object if necessary
        updateData.expectedDeliveryDate = new Date(expectedDeliveryDate);
      }
  
      // Create the order update
      const orderUpdate = await prisma.gigOrderUpdate.create({
        data: updateData,
      });
      console.log("🟢 Order update created successfully:", orderUpdate);
      res.status(201).json(orderUpdate);
    } catch (error) {
      console.error("❌ Error in createGigOrderUpdate:", error);
      next(error);
    }
  };
  

/**
 * 3. Delete Gig Order Update Controller
 *    - Allows the seller to delete an update they previously created.
 */
export const deleteGigOrderUpdate = async (req, res, next) => {
  try {
    console.log("🟡 Delete Order Update Request Received");
    console.log("🟡 Request Params:", req.params);

    const sellerId = verifyToken(req);
    console.log("✅ Authenticated Seller ID (from verifyToken):", sellerId);

    const { id } = req.params; // The update's id
    // Fetch the order update record
    const orderUpdate = await prisma.gigOrderUpdate.findUnique({ where: { id } });
    console.log("🟢 Fetched Order Update:", orderUpdate);
    if (!orderUpdate) {
      console.error("❌ Order update not found for ID:", id);
      return next(createError(404, "Order update not found"));
    }
    // Check if the authenticated seller is the owner of the update
    if (orderUpdate.sellerId !== sellerId) {
      console.error("🚫 Unauthorized deletion attempt. Update seller:", orderUpdate.sellerId, "Seller attempting deletion:", sellerId);
      return next(createError(403, "Unauthorized: Only the seller can delete this update"));
    }

    const deletedUpdate = await prisma.gigOrderUpdate.delete({
      where: { id },
    });
    console.log("🟢 Order update deleted successfully:", deletedUpdate);
    res.status(200).json({ message: "Order update deleted successfully", deletedUpdate });
  } catch (error) {
    console.error("❌ Error in deleteGigOrderUpdate:", error);
    next(error);
  }
};


export const getGigOrderUpdates = async (req, res, next) => {
    try {
      // Extract the gigOrderId from the request parameters
      const { gigOrderId } = req.params;
      if (!gigOrderId) {
        return next(createError(400, "Gig order ID is required"));
      }
      
      console.log("🟡 Fetching updates for Gig Order ID:", gigOrderId);
      
      // Fetch all updates for the given gig order
      const updates = await prisma.gigOrderUpdate.findMany({
        where: { gigOrderId },
        orderBy: { createdAt: 'asc' },
        include: { seller: true } // Optionally include seller details
      });
      
      console.log("🟢 Updates fetched successfully:", updates);
      res.status(200).json(updates);
    } catch (error) {
      console.error("❌ Error in getGigOrderUpdates:", error);
      next(error);
    }
  };