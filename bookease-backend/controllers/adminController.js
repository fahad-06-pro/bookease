const User = require("../models/User");
const Business = require("../models/Business");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get platform overview stats
// @route   GET /api/admin/stats
// @access  Private (admin)
exports.getPlatformStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total counts
    const totalUsers = await User.countDocuments({ role: "customer" });
    const totalOwners = await User.countDocuments({ role: "owner" });
    const totalBusinesses = await Business.countDocuments({ status: "approved" });
    const pendingBusinesses = await Business.countDocuments({ status: "pending" });
    const totalBookings = await Booking.countDocuments();

    // Revenue
    const revenueData = await Booking.aggregate([
      { $match: { status: { $in: ["confirmed", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$platformFee" } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // This month
    const thisMonthBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfMonth },
      status: { $in: ["confirmed", "completed"] },
    });

    const thisMonthRevenueData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          status: { $in: ["confirmed", "completed"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$platformFee" } } },
    ]);
    const thisMonthRevenue = thisMonthRevenueData[0]?.total || 0;

    // Last month
    const lastMonthBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      status: { $in: ["confirmed", "completed"] },
    });

    const lastMonthRevenueData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          status: { $in: ["confirmed", "completed"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$platformFee" } } },
    ]);
    const lastMonthRevenue = lastMonthRevenueData[0]?.total || 0;

    // New signups this month
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth },
    });

    // Monthly bookings chart (last 6 months)
    const monthlyBookings = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          bookings: { $sum: 1 },
          revenue: { $sum: "$platformFee" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Top businesses by bookings
    const topBusinesses = await Business.find({ status: "approved" })
      .sort({ totalBookings: -1 })
      .limit(5)
      .select("name category totalBookings averageRating logo");

    // Bookings by category
    const bookingsByCategory = await Booking.aggregate([
      {
        $lookup: {
          from: "businesses",
          localField: "business",
          foreignField: "_id",
          as: "business",
        },
      },
      { $unwind: "$business" },
      {
        $group: {
          _id: "$business.category",
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate("customer", "name email")
      .populate("business", "name")
      .populate("service", "name price")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalOwners,
        totalBusinesses,
        pendingBusinesses,
        totalBookings,
        totalRevenue,
        thisMonth: {
          bookings: thisMonthBookings,
          revenue: thisMonthRevenue,
          newUsers: newUsersThisMonth,
        },
        lastMonth: {
          bookings: lastMonthBookings,
          revenue: lastMonthRevenue,
        },
        monthlyBookings,
        topBusinesses,
        bookingsByCategory,
        recentBookings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, users });
  } catch (err) {
    next(err);
  }
};

// @desc    Ban / Unban user
// @route   PUT /api/admin/users/:id/toggle-ban
// @access  Private (admin)
exports.toggleBanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    if (user.role === "admin") {
      return next(new ErrorResponse("Cannot ban admin", 400));
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "unbanned" : "banned"} successfully`,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all businesses with filters
// @route   GET /api/admin/businesses
// @access  Private (admin)
exports.adminGetBusinesses = async (req, res, next) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Business.countDocuments(query);

    const businesses = await Business.find(query)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, businesses });
  } catch (err) {
    next(err);
  }
};

// @desc    Update commission rate
// @route   PUT /api/admin/businesses/:id/commission
// @access  Private (admin)
exports.updateCommission = async (req, res, next) => {
  try {
    const { commissionRate } = req.body;

    if (commissionRate < 0 || commissionRate > 100) {
      return next(new ErrorResponse("Commission rate must be between 0 and 100", 400));
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { commissionRate },
      { new: true }
    );

    if (!business) {
      return next(new ErrorResponse("Business not found", 404));
    }

    res.status(200).json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// @desc    Send announcement to all owners
// @route   POST /api/admin/announce
// @access  Private (admin)
exports.sendAnnouncement = async (req, res, next) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return next(new ErrorResponse("Title and message are required", 400));
    }

    const owners = await User.find({ role: "owner", isActive: true }).select("_id");

    const notifications = owners.map((owner) => ({
      user: owner._id,
      title,
      message,
      type: "system",
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      success: true,
      message: `Announcement sent to ${owners.length} owners`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all bookings (admin)
// @route   GET /api/admin/bookings
// @access  Private (admin)
exports.adminGetBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const total = await Booking.countDocuments(query);

    const bookings = await Booking.find(query)
      .populate("customer", "name email")
      .populate("business", "name category")
      .populate("service", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reviews (admin)
// @route   GET /api/admin/reviews
// @access  Private (admin)
exports.adminGetReviews = async (req, res, next) => {
  try {
    const { isReported, page = 1, limit = 20 } = req.query;
    const query = {};
    if (isReported) query.isReported = isReported === "true";

    const skip = (page - 1) * limit;
    const total = await Review.countDocuments(query);

    const reviews = await Review.find(query)
      .populate("customer", "name email")
      .populate("business", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, reviews });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete review (admin)
// @route   DELETE /api/admin/reviews/:id
// @access  Private (admin)
exports.adminDeleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return next(new ErrorResponse("Review not found", 404));
    }

    await review.deleteOne();
    await Booking.findByIdAndUpdate(review.booking, { reviewLeft: false });

    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (err) {
    next(err);
  }
};