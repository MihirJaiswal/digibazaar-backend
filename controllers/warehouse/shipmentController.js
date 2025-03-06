import { PrismaClient } from '@prisma/client';
import createError from "../../utils/createError.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

/**
 * Function to verify the JWT token and get user details
 */
const verifyTokenAndGetUser = (req) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

  if (!token) {
    throw createError(401, "Access denied. No token provided.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY); // Verify the token using JWT_KEY secret
    req.user = decoded; // Attach the decoded user data to the request object
    return decoded; // Return the decoded user data (e.g., userId)
  } catch (error) {
    throw createError(403, "Invalid token");
  }
};

// Get all available shipping methods
export const getShippingMethods = async (req, res, next) => {
  try {
    const shippingMethods = await prisma.shippingMethod.findMany();
    res.status(200).json(shippingMethods);
  } catch (error) {
    next(error);
  }
};

// Create shipment for an order
export const createShipment = async (req, res, next) => {
  try {
    const user = verifyTokenAndGetUser(req); // Authenticate user
    const userId = user.id; // Get the user ID from the token

    console.log("📦 Incoming Shipment Request:", req.body);

    const orderId = req.params.orderId || req.body.orderId;
    const { warehouseId, shippingMethodId } = req.body;

    if (!orderId) return next(createError(400, "Order ID is required."));
    if (!warehouseId || !shippingMethodId)
      return next(createError(400, "Warehouse ID and Shipping Method ID are required."));

    // Verify if the order exists and belongs to a store owned by the user
    const order = await prisma.productOrder.findUnique({
      where: { id: orderId },
      include: { store: true, shipment: true },
    });

    if (!order) return next(createError(404, "Order not found"));
    if (order.store.ownerId !== userId)
      return next(createError(403, "You are not authorized to create a shipment for this order"));

    if (order.status !== "IN_PROGRESS")
      return next(createError(400, "Order must be IN_PROGRESS before shipment"));
    if (order.shipment)
      return next(createError(400, "Shipment already exists for this order"));

    // Generate a unique tracking number
    const trackingNumber = uuidv4().slice(0, 8).toUpperCase();
    console.log("🚚 Generating tracking number:", trackingNumber);

    // Create shipment using nested connection for the required relations
    const shipment = await prisma.shipment.create({
      data: {
        // Instead of passing productOrderId, we use nested connect:
        productOrder: { connect: { id: orderId } },
        warehouse: { connect: { id: warehouseId } },
        shippingMethod: { connect: { id: shippingMethodId } },
        trackingNumber,
        trackingStatus: "PENDING",
        shippedAt: new Date(),
        // Optionally, if your schema requires a store relation:
          Store: order.store ? { connect: { id: order.store.id } } : undefined,
      },
    });

    console.log("✅ Shipment created successfully:", shipment);

    // Update order status to COMPLETED
    await prisma.productOrder.update({
      where: { id: orderId },
      data: { status: "COMPLETED" },
    });

    res.status(201).json({ message: "Shipment created successfully", shipment });
  } catch (error) {
    console.error("❌ Error in createShipment:", error);
    next(error);
  }
};


// Update shipment status (e.g., Shipped, Delivered, Returned)
export const updateShipmentStatus = async (req, res, next) => {
  try {
    const user = verifyTokenAndGetUser(req); // Authenticate user
    const userId = user.id; // Get the user ID from the token
    const { orderId } = req.params;
    const { trackingStatus } = req.body;

    console.log("🔄 Updating shipment status for order:", orderId, "➡", trackingStatus);

    const validStatuses = ["PENDING", "IN_TRANSIT", "DELIVERED", "RETURNED"];
    if (!validStatuses.includes(trackingStatus)) {
      return next(createError(400, "Invalid tracking status"));
    }

    // Check if shipment exists
    const shipment = await prisma.shipment.findUnique({
      where: { productOrderId: orderId },
      include: { productOrder: { include: { store: true } } },
    });

    if (!shipment) return next(createError(404, "Shipment not found for this order"));
    if (shipment.productOrder.store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to update this shipment"));
    }

    // Update tracking status
    const updatedShipment = await prisma.shipment.update({
      where: { productOrderId: orderId },
      data: {
        trackingStatus,
        deliveredAt: trackingStatus === "DELIVERED" ? new Date() : null,
      },
    });

    // If order is delivered, mark order as "DELIVERED"
    if (trackingStatus === "DELIVERED") {
      await prisma.productOrder.update({
        where: { id: orderId },
        data: { status: "DELIVERED" },
      });
    }

    res.status(200).json({ message: "Shipment status updated", updatedShipment });
  } catch (error) {
    next(error);
  }
};

// Get shipment details for an order
export const getShipmentDetails = async (req, res, next) => {
  try {
    const user = verifyTokenAndGetUser(req); // Authenticate user
    const userId = user.id; // Get the user ID from the token
    const { orderId } = req.params;

    console.log("📦 Fetching shipment details for order:", orderId);

    const shipment = await prisma.shipment.findUnique({
      where: { productOrderId: orderId },
      include: { shippingMethod: true, warehouse: true, productOrder: true },
    });

    if (!shipment) return next(createError(404, "Shipment not found for this order"));

    // Allow access only if the user is the buyer or store owner
    if (shipment.productOrder.userId !== userId && shipment.productOrder.store.ownerId !== userId) {
      return next(createError(403, "You are not authorized to view this shipment"));
    }

    res.status(200).json(shipment);
  } catch (error) {
    next(error);
  }
};
