const express = require("express");
const router = express.Router();
const {
  createReview,
  getBusinessReviews,
  replyToReview,
  deleteReview,
  reportReview,
  getMyBusinessReviews,
  adminGetReportedReviews,
} = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

// Public
router.get("/business/:businessId", getBusinessReviews);

// Customer
router.post("/", protect, authorize("customer"), upload.array("reviewImages", 3), createReview);
router.delete("/:id", protect, deleteReview);
router.put("/:id/report", protect, authorize("owner"), reportReview);

// Owner
router.get("/my-reviews", protect, authorize("owner"), getMyBusinessReviews);
router.put("/:id/reply", protect, authorize("owner"), replyToReview);

// Admin
router.get("/admin/reported", protect, authorize("admin"), adminGetReportedReviews);

module.exports = router;