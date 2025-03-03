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
        status: "IN_PROGRESS",
      },
    });

    console.log("✅ Gig Order Created:", newGigOrder);
    res.status(201).json(newGigOrder);
  } catch (error) {
    console.error("❌ Error in createGigOrder:", error);
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
    const userId = req.userId; // Get userId from the request (set by verifyToken middleware)
    const { id } = req.params; // Order ID
    const { status } = req.body; // New status

    // Find the order by its ID
    const order = await prisma.gigOrder.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if the logged-in user is the seller for this order
    if (order.sellerId !== userId) {
      return res.status(403).json({ error: 'Only the seller can update the order status' });
    }

    // Update the order status
    const updatedOrder = await prisma.gigOrder.update({
      where: { id },
      data: { status },
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error in updateGigOrderStatus:', error);
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
