const express = require("express");
const router = express.Router();
const {
  addService,
  getBusinessServices,
  getMyServices,
  updateService,
  deleteService,
  toggleService,
} = require("../controllers/serviceController");
const { protect, authorize } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

// Public
router.get("/business/:businessId", getBusinessServices);

// Owner
router.post("/", protect, authorize("owner"), upload.single("serviceImage"), addService);
router.get("/my-services", protect, authorize("owner"), getMyServices);
router.put("/:id", protect, authorize("owner"), upload.single("serviceImage"), updateService);
router.delete("/:id", protect, authorize("owner"), deleteService);
router.put("/:id/toggle", protect, authorize("owner"), toggleService);

module.exports = router;