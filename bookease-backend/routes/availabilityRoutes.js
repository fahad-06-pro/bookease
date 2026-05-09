const express = require("express");
const router = express.Router();
const {
  getAvailability,
  getMyAvailability,
  updateWorkingDays,
  addBlockedDate,
  removeBlockedDate,
  getAvailableSlots,
} = require("../controllers/availabilityController");
const { protect, authorize } = require("../middleware/auth");

// Public
router.get("/:businessId", getAvailability);
router.get("/:businessId/slots", getAvailableSlots);

// Owner
router.get("/owner/my-availability", protect, authorize("owner"), getMyAvailability);
router.put("/owner/working-days", protect, authorize("owner"), updateWorkingDays);
router.post("/owner/block-date", protect, authorize("owner"), addBlockedDate);
router.delete("/owner/block-date/:dateId", protect, authorize("owner"), removeBlockedDate);

module.exports = router;