const Availability = require("../models/Availability");
const Business = require("../models/Business");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get availability of a business
// @route   GET /api/availability/:businessId
// @access  Public
exports.getAvailability = async (req, res, next) => {
  try {
    const availability = await Availability.findOne({ business: req.params.businessId });
    if (!availability) {
      return next(new ErrorResponse("Availability not found", 404));
    }
    res.status(200).json({ success: true, availability });
  } catch (err) {
    next(err);
  }
};

// @desc    Get owner's own availability
// @route   GET /api/availability/my-availability
// @access  Private (owner)
exports.getMyAvailability = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    let availability = await Availability.findOne({ business: business._id });
    if (!availability) {
      availability = await Availability.create({ business: business._id });
    }

    res.status(200).json({ success: true, availability });
  } catch (err) {
    next(err);
  }
};

// @desc    Update working days & hours
// @route   PUT /api/availability/working-days
// @access  Private (owner)
exports.updateWorkingDays = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const { workingDays, slotDuration, breakTime } = req.body;

    const availability = await Availability.findOneAndUpdate(
      { business: business._id },
      { workingDays, slotDuration, breakTime },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, availability });
  } catch (err) {
    next(err);
  }
};

// @desc    Add blocked date
// @route   POST /api/availability/block-date
// @access  Private (owner)
exports.addBlockedDate = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const { date, reason } = req.body;

    const availability = await Availability.findOne({ business: business._id });
    availability.blockedDates.push({ date: new Date(date), reason: reason || "Holiday" });
    await availability.save();

    res.status(200).json({ success: true, availability });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove blocked date
// @route   DELETE /api/availability/block-date/:dateId
// @access  Private (owner)
exports.removeBlockedDate = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const availability = await Availability.findOne({ business: business._id });
    availability.blockedDates = availability.blockedDates.filter(
      (d) => d._id.toString() !== req.params.dateId
    );
    await availability.save();

    res.status(200).json({ success: true, availability });
  } catch (err) {
    next(err);
  }
};

// @desc    Generate available time slots for a date
// @route   GET /api/availability/:businessId/slots?date=2024-01-01&duration=30
// @access  Public
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { date, duration } = req.query;

    if (!date) {
      return next(new ErrorResponse("Date is required", 400));
    }

    const availability = await Availability.findOne({ business: req.params.businessId });
    if (!availability) {
      return next(new ErrorResponse("Availability not found", 404));
    }

    const selectedDate = new Date(date);
    const dayName = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

    // Check if day is working
    const dayConfig = availability.workingDays[dayName];
    if (!dayConfig || !dayConfig.isOpen) {
      return res.status(200).json({ success: true, slots: [], message: "Business is closed on this day" });
    }

    // Check if date is blocked
    const isBlocked = availability.blockedDates.some((bd) => {
      const blocked = new Date(bd.date);
      return blocked.toDateString() === selectedDate.toDateString();
    });

    if (isBlocked) {
      return res.status(200).json({ success: true, slots: [], message: "Business is closed on this date" });
    }

    // Generate slots
    const slotDuration = Number(duration) || availability.slotDuration;
    const slots = generateTimeSlots(
      dayConfig.start,
      dayConfig.end,
      slotDuration,
      availability.breakTime
    );

    // Get already booked slots
    const Booking = require("../models/Booking");
    const bookedSlots = await Booking.find({
      business: req.params.businessId,
      appointmentDate: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999)),
      },
      status: { $in: ["pending", "confirmed"] },
    }).select("appointmentTime duration");

    // Mark booked slots
    const availableSlots = slots.map((slot) => {
      const isBooked = bookedSlots.some((booking) => {
        return booking.appointmentTime === slot;
      });
      return { time: slot, isBooked };
    });

    res.status(200).json({ success: true, slots: availableSlots });
  } catch (err) {
    next(err);
  }
};

// Helper — generate time slots
const generateTimeSlots = (start, end, duration, breakTime) => {
  const slots = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let current = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (current + duration <= endMinutes) {
    const hours = Math.floor(current / 60);
    const minutes = current % 60;
    const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    // Skip break time
    if (breakTime && breakTime.isActive) {
      const [bH, bM] = breakTime.start.split(":").map(Number);
      const [beH, beM] = breakTime.end.split(":").map(Number);
      const breakStart = bH * 60 + bM;
      const breakEnd = beH * 60 + beM;

      if (current >= breakStart && current < breakEnd) {
        current += duration;
        continue;
      }
    }

    slots.push(timeStr);
    current += duration;
  }

  return slots;
};