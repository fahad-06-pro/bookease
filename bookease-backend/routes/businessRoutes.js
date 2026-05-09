const express = require("express");
const router = express.Router();
const {
  registerBusiness,
  getAllBusinesses,
  getBusinessBySlug,
  getMyBusiness,
  updateBusiness,
  getFeaturedBusinesses,
  adminGetAllBusinesses,
  approveBusiness,
  rejectBusiness,
  suspendBusiness,
  toggleFeatured,
} = require("../controllers/businessController");
const { protect, authorize } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

// Public routes
router.get("/", getAllBusinesses);
router.get("/featured", getFeaturedBusinesses);
router.get("/:slug", getBusinessBySlug);

// Owner routes
router.post("/register", protect, authorize("owner"), upload.single("logo"), registerBusiness);
router.get("/owner/my-business", protect, authorize("owner"), getMyBusiness);
router.put("/owner/update", protect, authorize("owner"), upload.single("logo"), updateBusiness);

// Admin routes
router.get("/admin/all", protect, authorize("admin"), adminGetAllBusinesses);
router.put("/admin/:id/approve", protect, authorize("admin"), approveBusiness);
router.put("/admin/:id/reject", protect, authorize("admin"), rejectBusiness);
router.put("/admin/:id/suspend", protect, authorize("admin"), suspendBusiness);
router.put("/admin/:id/featured", protect, authorize("admin"), toggleFeatured);

module.exports = router;