// routes/inquiryRoutes.js
import express from "express";
import {
  createInquiry,
  updateInquiry,
  getInquiry,
  listUserInquiries,
  deleteInquiry,
} from "../../controllers/gig/inquiryController.js";

const router = express.Router();


//static route
// List inquiries for the logged-in user (filter by role via query param, e.g., ?role=buyer)
router.get("/user", listUserInquiries);


// Create a new inquiry
router.post("/", createInquiry);
// Update an existing inquiry (e.g., for negotiation/counter-offers)
router.put("/:inquiryId", updateInquiry);
// Get a single inquiry by ID
router.get("/:inquiryId", getInquiry);
// Delete/Cancel an inquiry (typically for the buyer, if pending)
router.delete("/:inquiryId", deleteInquiry);

export default router;
