const Booking = require("../models/Booking");
const Business = require("../models/Business");
const Service = require("../models/Service");
const Availability = require("../models/Availability");
const Notification = require("../models/Notification");
const ErrorResponse = require("../utils/errorResponse");
const sendEmail = require("../emails/sendEmail");
const { bookingConfirmationEmail, bookingStatusEmail } = require("../emails/templates");

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private (customer)
exports.createBooking = async (req, res, next) => {
  try {
    const { businessId, serviceId, appointmentDate, appointmentTime, notes, paymentMethod } = req.body;

    // Business check
    const business = await Business.findById(businessId);
    if (!business || business.status !== "approved") {
      return next(new ErrorResponse("Business not found or not approved", 404));
    }

    // Service check
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return next(new ErrorResponse("Service not found or inactive", 404));
    }

    // Availability check
    const availability = await Availability.findOne({ business: businessId });
    const selectedDate = new Date(appointmentDate);
    const dayName = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const dayConfig = availability.workingDays[dayName];

    if (!dayConfig || !dayConfig.isOpen) {
      return next(new ErrorResponse("Business is closed on this day", 400));
    }

    // Blocked date check
    const isBlocked = availability.blockedDates.some((bd) => {
      return new Date(bd.date).toDateString() === selectedDate.toDateString();
    });
    if (isBlocked) {
      return next(new ErrorResponse("Business is closed on this date", 400));
    }

    // Slot already booked check
    const existingBooking = await Booking.findOne({
      business: businessId,
      appointmentDate: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999)),
      },
      appointmentTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBooking) {
      return next(new ErrorResponse("This slot is already booked", 400));
    }

    // Platform fee calculate
    const platformFee = (service.price * business.commissionRate) / 100;

    const booking = await Booking.create({
      customer: req.user._id,
      business: businessId,
      service: serviceId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      duration: service.duration,
      totalAmount: service.price,
      platformFee,
      notes: notes || "",
      paymentMethod: paymentMethod || "venue",
      paymentStatus: paymentMethod === "venue" ? "pending" : "pending",
    });

    // Business total bookings update
    await Business.findByIdAndUpdate(businessId, { $inc: { totalBookings: 1 } });
    await Service.findByIdAndUpdate(serviceId, { $inc: { totalBookings: 1 } });

    // Owner ko notification
    await Notification.create({
      user: business.owner,
      title: "New Booking! 🎉",
      message: `New booking for ${service.name} on ${new Date(appointmentDate).toLocaleDateString()} at ${appointmentTime}`,
      type: "booking_new",
      link: "/owner/bookings",
    });

    // Customer ko confirmation email
    try {
      await sendEmail({
        to: req.user.email,
        subject: "Booking Confirmed — BookEase",
        html: bookingConfirmationEmail(req.user.name, booking, business, service),
      });
    } catch (emailErr) {
      console.error("Booking email failed:", emailErr.message);
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate("business", "name address contact logo")
      .populate("service", "name price duration")
      .populate("customer", "name email phone");

    res.status(201).json({ success: true, booking: populatedBooking });
  } catch (err) {
    next(err);
  }
};

// @desc    Get customer's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private (customer)
exports.getMyBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { customer: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const total = await Booking.countDocuments(query);

    const bookings = await Booking.find(query)
      .populate("business", "name address logo slug")
      .populate("service", "name price duration image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getSingleBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("business", "name address contact logo")
      .populate("service", "name price duration image")
      .populate("customer", "name email phone avatar");

    if (!booking) {
      return next(new ErrorResponse("Booking not found", 404));
    }

    // Only customer or business owner or admin can view
    const business = await Business.findById(booking.business._id);
    if (
      booking.customer._id.toString() !== req.user._id.toString() &&
      business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return next(new ErrorResponse("Not authorized", 403));
    }

    res.status(200).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Get business owner's bookings
// @route   GET /api/bookings/business-bookings
// @access  Private (owner)
exports.getBusinessBookings = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const { status, date, page = 1, limit = 20 } = req.query;
    const query = { business: business._id };
    if (status) query.status = status;
    if (date) {
      const selectedDate = new Date(date);
      query.appointmentDate = {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999)),
      };
    }

    const skip = (page - 1) * limit;
    const total = await Booking.countDocuments(query);

    const bookings = await Booking.find(query)
      .populate("customer", "name email phone avatar")
      .populate("service", "name price duration")
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Update booking status (owner)
// @route   PUT /api/bookings/:id/status
// @access  Private (owner)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["confirmed", "completed", "cancelled", "no-show"];

    if (!allowedStatuses.includes(status)) {
      return next(new ErrorResponse("Invalid status", 400));
    }

    const booking = await Booking.findById(req.params.id)
      .populate("customer", "name email")
      .populate("business", "name owner")
      .populate("service", "name");

    if (!booking) {
      return next(new ErrorResponse("Booking not found", 404));
    }

    // Only owner of this business
    if (booking.business.owner.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("Not authorized", 403));
    }

    booking.status = status;
    await booking.save();

    // Customer ko notification
    await Notification.create({
      user: booking.customer._id,
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your booking for ${booking.service.name} has been ${status}`,
      type: `booking_${status}`,
      link: "/my-bookings",
    });

    // Customer ko email
    try {
      await sendEmail({
        to: booking.customer.email,
        subject: `Booking ${status} — BookEase`,
        html: bookingStatusEmail(booking.customer.name, status, booking, booking.business),
      });
    } catch (emailErr) {
      console.error("Status email failed:", emailErr.message);
    }

    res.status(200).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel booking (customer)
// @route   PUT /api/bookings/:id/cancel
// @access  Private (customer)
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("business", "name owner")
      .populate("service", "name");

    if (!booking) {
      return next(new ErrorResponse("Booking not found", 404));
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("Not authorized", 403));
    }

    if (["completed", "cancelled"].includes(booking.status)) {
      return next(new ErrorResponse("Booking cannot be cancelled", 400));
    }

    booking.status = "cancelled";
    booking.cancellationReason = req.body.reason || "Cancelled by customer";
    await booking.save();

    // Owner ko notification
    await Notification.create({
      user: booking.business.owner,
      title: "Booking Cancelled",
      message: `Booking for ${booking.service.name} on ${new Date(booking.appointmentDate).toLocaleDateString()} has been cancelled`,
      type: "booking_cancelled",
      link: "/owner/bookings",
    });

    res.status(200).json({ success: true, message: "Booking cancelled", booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Get business analytics (owner)
// @route   GET /api/bookings/analytics
// @access  Private (owner)
exports.getAnalytics = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month stats
    const thisMonthBookings = await Booking.find({
      business: business._id,
      createdAt: { $gte: startOfMonth },
      status: { $in: ["confirmed", "completed"] },
    });

    // Last month stats
    const lastMonthBookings = await Booking.find({
      business: business._id,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      status: { $in: ["confirmed", "completed"] },
    });

    // Total revenue this month
    const thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    // Today's bookings
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    const todayBookings = await Booking.find({
      business: business._id,
      appointmentDate: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ["pending", "confirmed"] },
    }).populate("service", "name").populate("customer", "name");

    // Bookings by service
    const bookingsByService = await Booking.aggregate([
      { $match: { business: business._id, status: { $in: ["confirmed", "completed"] } } },
      { $group: { _id: "$service", count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
      { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
      { $unwind: "$service" },
      { $project: { name: "$service.name", count: 1, revenue: 1 } },
    ]);

    // Monthly bookings chart (last 6 months)
    const monthlyData = await Booking.aggregate([
      {
        $match: {
          business: business._id,
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
          status: { $in: ["confirmed", "completed"] },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          bookings: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        thisMonth: {
          bookings: thisMonthBookings.length,
          revenue: thisMonthRevenue,
        },
        lastMonth: {
          bookings: lastMonthBookings.length,
          revenue: lastMonthRevenue,
        },
        todayBookings,
        bookingsByService,
        monthlyData,
        totalBookings: business.totalBookings,
        averageRating: business.averageRating,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin — get all bookings
// @route   GET /api/bookings/admin/all
// @access  Private (admin)
exports.adminGetAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const total = await Booking.countDocuments(query);

    const bookings = await Booking.find(query)
      .populate("customer", "name email")
      .populate("business", "name")
      .populate("service", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, bookings });
  } catch (err) {
    next(err);
  }
};