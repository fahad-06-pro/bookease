const express = require("express");
const router = express.Router();
const {
  getPlatformStats,
  getAllUsers,
  toggleBanUser,
  adminGetBusinesses,
  updateCommission,
  sendAnnouncement,
  adminGetBookings,
  adminGetReviews,
  adminDeleteReview,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

// All routes — admin only
router.use(protect, authorize("admin"));

router.get("/stats", getPlatformStats);
router.get("/users", getAllUsers);
router.put("/users/:id/toggle-ban", toggleBanUser);
router.get("/businesses", adminGetBusinesses);
router.put("/businesses/:id/commission", updateCommission);
router.post("/announce", sendAnnouncement);
router.get("/bookings", adminGetBookings);
router.get("/reviews", adminGetReviews);
router.delete("/reviews/:id", adminDeleteReview);

module.exports = router;