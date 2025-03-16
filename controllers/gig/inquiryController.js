// controllers/inquiryController.js
import { PrismaClient, InquiryStatus } from '@prisma/client';
import createError from '../../utils/createError.js';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// 1. Create Inquiry
export const createInquiry = async (req, res, next) => {
  try {
    console.log("==> [Create Inquiry] Request received:", req.body);
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.error("[Create Inquiry] Token missing");
      return next(createError(401, "Unauthorized! Token missing"));
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("[Create Inquiry] Decoded token:", decoded);
    const buyerId = decoded.id;
    const { gigId, supplierId, requestedQuantity, requestedPrice, message } = req.body;

    if (!gigId || !supplierId || !requestedQuantity) {
      console.error("[Create Inquiry] Missing required fields");
      return next(createError(400, "Missing required fields"));
    }

    const inquiry = await prisma.supplierInquiry.create({
      data: {
        gigId,
        buyerId,
        supplierId,
        requestedQuantity: parseInt(requestedQuantity, 10),
        requestedPrice: requestedPrice ? parseFloat(requestedPrice) : null,
        message,
        status: InquiryStatus.PENDING,
        round: 1,
      },
      include: { buyer: true, supplier: true, gig: true },
    });

    console.log("[Create Inquiry] Inquiry created:", inquiry);
    res.status(201).json(inquiry);
  } catch (err) {
    console.error("[Create Inquiry] Error:", err);
    next(err);
  }
};

// 2. Update Inquiry (for negotiation counter‑offers or acceptance/rejection)
export const updateInquiry = async (req, res, next) => {
    try {
      console.log("==> [Update Inquiry] Request received:", req.params, req.body);
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        console.error("[Update Inquiry] Token missing");
        return next(createError(401, "Unauthorized! Token missing"));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      console.log("[Update Inquiry] Decoded token:", decoded);
      const userId = decoded.id;
  
      const { inquiryId } = req.params;
      const { proposedQuantity, proposedPrice, message, status } = req.body;
  
      console.log(`[Update Inquiry] Fetching inquiry with ID: ${inquiryId}`);
      const inquiry = await prisma.supplierInquiry.findUnique({ where: { id: inquiryId } });
  
      if (!inquiry) {
        console.error("[Update Inquiry] Inquiry not found for ID:", inquiryId);
        return next(createError(404, "Inquiry not found"));
      }
      console.log("[Update Inquiry] Existing Inquiry Data:", inquiry);
  
      if (inquiry.buyerId !== userId && inquiry.supplierId !== userId) {
        console.error("[Update Inquiry] User not authorized:", userId);
        return next(createError(403, "Not authorized to update this inquiry"));
      }
      if (inquiry.status === "ACCEPTED" || inquiry.status === "REJECTED") {
        console.error("[Update Inquiry] Inquiry already finalized:", inquiry.status);
        return next(createError(400, "Inquiry cannot be negotiated further as it is already finalized"));
      }
  
      console.log("[Update Inquiry] Processing update...");
      const isAccepted = status === "ACCEPTED";
      const newStatus = isAccepted ? "ACCEPTED" : "NEGOTIATING";
      const newRound = isAccepted ? inquiry.round : inquiry.round + 1;
  
      // Log the proposed values before updating
      console.log("[Update Inquiry] Proposed values:", {
        proposedQuantity,
        proposedPrice,
        message,
        newStatus,
        newRound,
      });
  
      let updatedData = {
        proposedQuantity: proposedQuantity ? parseInt(proposedQuantity, 10) : inquiry.proposedQuantity,
        proposedPrice: proposedPrice ? parseFloat(proposedPrice) : inquiry.proposedPrice,
        message: message || inquiry.message,
        status: newStatus,
        round: newRound,
      };
  
      // If the inquiry is ACCEPTED, finalize the quantity and price
      if (isAccepted) {
        updatedData.finalQuantity = updatedData.proposedQuantity || inquiry.requestedQuantity;
        updatedData.finalPrice = updatedData.proposedPrice || inquiry.requestedPrice;
      }
  
      // Log the final values before updating in DB
      console.log("[Update Inquiry] Final update data:", updatedData);
  
      const updatedInquiry = await prisma.supplierInquiry.update({
        where: { id: inquiryId },
        data: updatedData,
        include: { buyer: true, supplier: true, gig: true },
      });
  
      console.log("[Update Inquiry] Successfully updated inquiry:", updatedInquiry);
      console.log("[Update Inquiry] Final stored values:", {
        finalQuantity: updatedInquiry.finalQuantity,
        finalPrice: updatedInquiry.finalPrice,
      });
  
      res.status(200).json(updatedInquiry);
    } catch (err) {
      console.error("[Update Inquiry] Error:", err);
      next(err);
    }
  };
  
  

// 3. Get a single Inquiry
export const getInquiry = async (req, res, next) => {
  try {
    console.log("==> [Get Inquiry] Fetching inquiry with ID:", req.params.inquiryId);
    const { inquiryId } = req.params;
    const inquiry = await prisma.supplierInquiry.findUnique({
      where: { id: inquiryId },
      include: { gig: true, buyer: true, supplier: true },
    });
    if (!inquiry) {
      console.error("[Get Inquiry] Inquiry not found for ID:", inquiryId);
      return next(createError(404, "Inquiry not found"));
    }
    console.log("[Get Inquiry] Inquiry fetched:", inquiry);
    res.status(200).json(inquiry);
  } catch (err) {
    console.error("[Get Inquiry] Error:", err);
    next(err);
  }
};

// 4. List Inquiries for a User (combining those made and received)
export const listUserInquiries = async (req, res, next) => {
  try {
    console.log("==> [List User Inquiries] Request received");
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.error("[List Inquiries] Token missing");
      return next(createError(401, "Unauthorized! Token missing"));
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;
    console.log("[List Inquiries] User ID from token:", userId);

    const inquiries = await prisma.supplierInquiry.findMany({
      where: {
        OR: [{ buyerId: userId }, { supplierId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: { gig: true, buyer: true, supplier: true },
    });
    console.log("[List Inquiries] Fetched inquiries:", inquiries);
    res.status(200).json(inquiries);
  } catch (err) {
    console.error("[List Inquiries] Error:", err);
    next(err);
  }
};

// 5. Delete/Cancel Inquiry (allow buyer to cancel if still pending)
export const deleteInquiry = async (req, res, next) => {
  try {
    console.log("==> [Delete Inquiry] Request received for ID:", req.params.inquiryId);
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.error("[Delete Inquiry] Token missing");
      return next(createError(401, "Unauthorized! Token missing"));
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded.id;
    const { inquiryId } = req.params;
    console.log("[Delete Inquiry] User ID:", userId);

    const inquiry = await prisma.supplierInquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!inquiry) {
      console.error("[Delete Inquiry] Inquiry not found for ID:", inquiryId);
      return next(createError(404, "Inquiry not found"));
    }
    if (inquiry.buyerId !== userId) {
      console.error("[Delete Inquiry] Not authorized to cancel this inquiry for user:", userId);
      return next(createError(403, "Not authorized to cancel this inquiry"));
    }
    if (inquiry.status !== InquiryStatus.PENDING) {
      console.error("[Delete Inquiry] Inquiry status not pending:", inquiry.status);
      return next(createError(400, "Inquiry cannot be cancelled at this stage"));
    }
    await prisma.supplierInquiry.delete({
      where: { id: inquiryId },
    });
    console.log("[Delete Inquiry] Inquiry deleted successfully");
    res.status(200).json({ message: "Inquiry cancelled successfully" });
  } catch (err) {
    console.error("[Delete Inquiry] Error:", err);
    next(err);
  }
};
