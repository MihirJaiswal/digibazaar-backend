import { PrismaClient } from '@prisma/client';
import createError from '../utils/createError.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

// ✅ 1️⃣ Create a Payment Intent (Frontend Calls This)
export const createPaymentIntent = async (req, res, next) => {
  try {
    const buyerId = verifyToken(req);
    const { gigId } = req.body;

    const gig = await prisma.gig.findUnique({ where: { id: gigId } });
    if (!gig) return next(createError(404, "Gig not found"));

    // ✅ Create a customer with a valid Indian address
    const customer = await stripe.customers.create({
      name: req.user?.name || "Test User",
      email: req.user?.email || "test@example.com",
      address: {
        line1: "123 Street",
        city: "Mumbai",
        state: "MH",
        postal_code: "400001",
        country: "IN",
      },
    });

    // ✅ Change currency to INR & pass required fields
    const paymentIntent = await stripe.paymentIntents.create({
      amount: gig.price * 100,  // Convert to paisa (₹1 = 100 paisa)
      currency: "inr",
      customer: customer.id,
      description: `Payment for gig: ${gig.title}`,
      payment_method_types: ["card"],
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error("❌ Error in createPaymentIntent:", error);
    next(error);
  }
};


// ✅ 2️⃣ Confirm Payment & Create Order (Frontend Calls This After Payment)
export const createGigOrder = async (req, res, next) => {
  try {
    const buyerId = verifyToken(req); // ✅ Extracts buyerId from token
    const { gigId, paymentIntentId, requirement } = req.body;

    if (!gigId || !paymentIntentId || !requirement) {
      console.error("❌ Missing required fields:", req.body);
      return next(createError(400, "Missing required fields"));
    }

    // ✅ Fetch gig details to get sellerId & price
    const gig = await prisma.gig.findUnique({ where: { id: gigId } });
    if (!gig) return next(createError(404, "Gig not found"));

    // ✅ Ensure payment was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return next(createError(400, "Payment not completed"));
    }

    // ✅ Create order in database
    const newGigOrder = await prisma.gigOrder.create({
      data: {
        gigId,
        buyerId,
        sellerId: gig.userId,  // Get seller from gig details
        price: gig.price,       // Get price from gig details
        paymentIntent: paymentIntentId,
        requirement,
        status: "PENDING",
      },
    });

    console.log("✅ Gig Order Created:", newGigOrder);
    res.status(201).json(newGigOrder);
  } catch (error) {
    console.error("❌ Error in createGigOrder:", error);
    next(error);
  }
};

export const cancelGigOrder = async (req, res, next) => {
  try {
    console.log("🟡 Cancel Order Request Received. Params:", req.params);

    const userId = verifyToken(req); // Get the authenticated user ID
    console.log("✅ Authenticated User ID:", userId);

    const { id } = req.params; // Get order ID

    // Fetch order details
    const order = await prisma.gigOrder.findUnique({ where: { id } });
    console.log("🟢 Fetched Order Data:", order);

    if (!order) {
      console.error("❌ Order Not Found:", id);
      return next(createError(404, "Order not found"));
    }

    // ✅ Only allow cancellation if status is `PENDING`
    console.log("ℹ️ Current Order Status:", order.status);
    if (order.status !== "PENDING") {
      console.warn("⚠️ Order Cancellation Not Allowed. Current Status:", order.status);
      return next(createError(400, "Order cannot be canceled after it has been started"));
    }

    // ✅ Only the buyer can cancel the order
    if (order.buyerId !== userId) {
      console.warn("🚫 Unauthorized Cancellation Attempt by User:", userId);
      return next(createError(403, "Unauthorized: Only the buyer can cancel this order"));
    }

    // ✅ Update order status to `CANCELED`
    const canceledOrder = await prisma.gigOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    console.log("🟢 Order Successfully Canceled:", canceledOrder);

    // ✅ Refund payment if already paid
    if (order.paymentIntent) {
      console.log("💰 Processing Refund for Payment Intent:", order.paymentIntent);
      try {
        await stripe.refunds.create({
          payment_intent: order.paymentIntent,
        });
        console.log("✅ Refund Processed Successfully for:", order.paymentIntent);
      } catch (refundError) {
        console.error("❌ Error Processing Refund:", refundError);
        return next(createError(500, "Refund processing failed"));
      }
    }

    res.status(200).json({ message: "Order canceled successfully", canceledOrder });
  } catch (error) {
    console.error("❌ Error in cancelGigOrder:", error);
    next(error);
  }
};






// Get a specific Gig Order by ID
export const getGigOrder = async (req, res, next) => {
  try {
    verifyToken(req);
    const { id } = req.params;

    const order = await prisma.gigOrder.findUnique({
      where: { id },
      include: {
        gig: true,
        buyer: true,
        seller: true,
      },
    });

    if (!order) return next(createError(404, 'Gig order not found'));
    res.status(200).json(order);
  } catch (error) {
    console.error('Error in getGigOrder:', error);
    next(error);
  }
};

// Update the controller function
export const updateGigOrderStatus = async (req, res, next) => {
  try {
    console.log("🟡 Update Order Status Request Received");
    console.log("🟡 Request Params:", req.params);
    console.log("🟡 Request Body:", req.body);
    console.log("🟡 Request Headers Authorization:", req.headers.authorization);
    console.log("🟡 Request Cookies:", req.cookies);

    // Use verifyToken to extract the authenticated user ID
    const userId = verifyToken(req);
    console.log("✅ Authenticated User ID (from verifyToken):", userId);

    const { id } = req.params; // Order ID
    const { status } = req.body; // New status
    console.log("ℹ️ Updating Order ID:", id, "to status:", status);

    // Find the order by its ID
    const order = await prisma.gigOrder.findUnique({ where: { id } });
    console.log("🟢 Fetched Order Data:", order);

    if (!order) {
      console.error("❌ Order not found:", id);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if the logged-in user is the seller for this order
    if (order.sellerId !== userId) {
      console.error("🚫 Unauthorized update attempt. Order seller:", order.sellerId, "User:", userId);
      return res.status(403).json({ error: 'Only the seller can update the order status' });
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



// Get all orders for a user
export const getOrdersForUser = async (req, res, next) => {
  try {
    const { userId } = req.params; // Assuming userId is passed as a parameter
    const orders = await prisma.gigOrder.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        gig: true,
        buyer: true,
        seller: true,
      },
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error in getOrdersForUser:', error);
    next(error);
  }
};


//get all orders for a seller
export const getOrdersForSeller = async (req, res, next) => {
  try {
    const { sellerId } = req.params; // Assuming sellerId is passed as a parameter
    const orders = await prisma.gigOrder.findMany({
      where: { sellerId },
      include: {
        gig: true,
        buyer: true,
      },
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error in getOrdersForSeller:', error);
    next(error);
  }
};




// Update Gig Order status (only seller can update)/*  */
