const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getSingleBooking,
  getBusinessBookings,
  updateBookingStatus,
  cancelBooking,
  getAnalytics,
  adminGetAllBookings,
} = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/auth");

// Customer
router.post("/", protect, authorize("customer"), createBooking);
router.get("/my-bookings", protect, authorize("customer"), getMyBookings);
router.put("/:id/cancel", protect, authorize("customer"), cancelBooking);

// Owner
router.get("/business-bookings", protect, authorize("owner"), getBusinessBookings);
router.put("/:id/status", protect, authorize("owner"), updateBookingStatus);
router.get("/analytics", protect, authorize("owner"), getAnalytics);

// Admin
router.get("/admin/all", protect, authorize("admin"), adminGetAllBookings);

// Shared
router.get("/:id", protect, getSingleBooking);

module.exports = router;