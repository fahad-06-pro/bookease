const express = require("express");
const router = express.Router();
const {
  createCheckoutSession,
  stripeWebhook,
  getPaymentStatus,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

// Webhook — raw body chahiye
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// Customer
router.post("/checkout", protect, createCheckoutSession);
router.get("/status/:bookingId", protect, getPaymentStatus);

module.exports = router;