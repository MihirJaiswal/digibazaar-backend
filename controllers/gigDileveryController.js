import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Inline verifyToken function (no separate middleware)
function verifyToken(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    throw createError(401, "Access denied. No token provided.");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    return decoded.id; // Assumes token payload contains the user's id as 'id'
  } catch (error) {
    throw createError(403, "Invalid token");
  }
}

// ====================
// uploadGigDelivery
// ====================
export const uploadGigDelivery = async (req, res, next) => {
    try {
      console.log("Seller uploading delivery...");
      // Verify seller from token
      const sellerId = verifyToken(req);
      console.log("Authenticated sellerId:", sellerId);
  
      // Extract required fields from request body
      const { gigOrderId, fileUrl, message } = req.body;
      if (!gigOrderId || !fileUrl) {
        return next(createError(400, "Missing required fields: gigOrderId and fileUrl are required"));
      }
  
      // Fetch the gig order to verify it exists and that the seller is authorized
      const order = await prisma.gigOrder.findUnique({ where: { id: gigOrderId } });
      console.log("Fetched Order:", order);
      if (!order) {
        return next(createError(404, "Gig order not found"));
      }
      if (order.sellerId !== sellerId) {
        return next(createError(403, "Unauthorized: Only the seller can deliver work for this order"));
      }
  
      // Create the GigDelivery record using the nested connect for gigOrder
      const delivery = await prisma.gigDelivery.create({
        data: {
          gigOrder: { connect: { id: gigOrderId } }, // Use nested connect
          seller: { connect: { id: sellerId } },
          buyer: { connect: { id: order.buyerId } },
          fileUrl,
          message, // optional
        },
      });
  
      // Update the order status to "DELIVERED"
      await prisma.gigOrder.update({
        where: { id: gigOrderId },
        data: { status: "DELIVERED" },
      });
  
      console.log("Gig delivery created successfully:", delivery);
      res.status(201).json(delivery);
    } catch (error) {
      console.error("Error in uploadGigDelivery:", error);
      next(error);
    }
  };
  

// ====================
// acceptGigDelivery
// ====================
export const acceptGigDelivery = async (req, res, next) => {
  try {
    console.log("Buyer accepting delivery...");
    // Verify buyer from token
    const buyerId = verifyToken(req);
    console.log("Authenticated buyerId:", buyerId);

    const { deliveryId } = req.params;
    if (!deliveryId) {
      return next(createError(400, "Missing required parameter: deliveryId"));
    }

    // Fetch the delivery record
    const delivery = await prisma.gigDelivery.findUnique({ where: { id: deliveryId } });
    console.log("Fetched Delivery:", delivery);
    if (!delivery) {
      return next(createError(404, "Delivery not found"));
    }
    if (delivery.buyerId !== buyerId) {
      return next(createError(403, "Unauthorized: Only the buyer can accept this delivery"));
    }

    // Update the GigDelivery record to mark it as accepted
    const updatedDelivery = await prisma.gigDelivery.update({
      where: { id: deliveryId },
      data: { isAccepted: true },
    });

    // Also update the corresponding GigOrder status to "COMPLETED"
    await prisma.gigOrder.update({
      where: { id: delivery.gigOrderId },
      data: { status: "COMPLETED" },
    });

    console.log("Delivery accepted and order marked as COMPLETED:", updatedDelivery);
    res.status(200).json(updatedDelivery);
  } catch (error) {
    console.error("Error in acceptGigDelivery:", error);
    next(error);
  }
};

// ====================
// getGigDeliveryByOrder
// ====================
export const getGigDeliveryByOrder = async (req, res, next) => {
  try {
    // Assuming the gigOrderId is passed as a URL parameter
    const { gigOrderId } = req.params;
    if (!gigOrderId) {
      return next(createError(400, "Missing required parameter: gigOrderId"));
    }

    // Fetch the delivery record associated with this gigOrderId
    const delivery = await prisma.gigDelivery.findFirst({
      where: { gigOrderId },
      include: {
        gigOrder: true, // Include gig order details if needed
      },
    });

    if (!delivery) {
      return next(createError(404, "Delivery not found for this order"));
    }

    res.status(200).json(delivery);
  } catch (error) {
    console.error("Error fetching gig delivery:", error);
    next(error);
  }
};
