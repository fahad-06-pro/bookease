const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
    },
    workingDays: {
      monday: { isOpen: { type: Boolean, default: true }, start: { type: String, default: "09:00" }, end: { type: String, default: "18:00" } },
      tuesday: { isOpen: { type: Boolean, default: true }, start: { type: String, default: "09:00" }, end: { type: String, default: "18:00" } },
      wednesday: { isOpen: { type: Boolean, default: true }, start: { type: String, default: "09:00" }, end: { type: String, default: "18:00" } },
      thursday: { isOpen: { type: Boolean, default: true }, start: { type: String, default: "09:00" }, end: { type: String, default: "18:00" } },
      friday: { isOpen: { type: Boolean, default: true }, start: { type: String, default: "09:00" }, end: { type: String, default: "18:00" } },
      saturday: { isOpen: { type: Boolean, default: false }, start: { type: String, default: "09:00" }, end: { type: String, default: "18:00" } },
      sunday: { isOpen: { type: Boolean, default: false }, start: { type: String, default: "09:00" }, end: { type: String, default: "18:00" } },
    },
    slotDuration: {
      type: Number,
      default: 30,
      enum: [15, 30, 45, 60],
    },
    breakTime: {
      isActive: { type: Boolean, default: false },
      start: { type: String, default: "13:00" },
      end: { type: String, default: "14:00" },
    },
    blockedDates: [
      {
        date: { type: Date },
        reason: { type: String, default: "Holiday" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Availability", availabilitySchema);