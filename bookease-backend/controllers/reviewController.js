const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Business = require("../models/Business");
const Notification = require("../models/Notification");
const ErrorResponse = require("../utils/errorResponse");
const { cloudinary } = require("../config/cloudinary");

// @desc    Create review
// @route   POST /api/reviews
// @access  Private (customer)
exports.createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    // Booking check
    const booking = await Booking.findById(bookingId)
      .populate("business", "name owner")
      .populate("service", "name");

    if (!booking) {
      return next(new ErrorResponse("Booking not found", 404));
    }

    // Only customer of this booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("Not authorized", 403));
    }

    // Only completed bookings
    if (booking.status !== "completed") {
      return next(new ErrorResponse("Can only review completed bookings", 400));
    }

    // Already reviewed check
    if (booking.reviewLeft) {
      return next(new ErrorResponse("Already reviewed this booking", 400));
    }

    // Handle review images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => ({
        public_id: file.filename,
        url: file.path,
      }));
    }

    const review = await Review.create({
      customer: req.user._id,
      business: booking.business._id,
      booking: bookingId,
      rating: Number(rating),
      comment,
      images,
    });

    // Mark booking as reviewed
    await Booking.findByIdAndUpdate(bookingId, { reviewLeft: true });

    // Owner ko notification
    await Notification.create({
      user: booking.business.owner,
      title: "New Review! ⭐",
      message: `${req.user.name} left a ${rating}-star review for ${booking.service.name}`,
      type: "review_new",
      link: "/owner/reviews",
    });

    const populatedReview = await Review.findById(review._id)
      .populate("customer", "name avatar");

    res.status(201).json({ success: true, review: populatedReview });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reviews of a business
// @route   GET /api/reviews/business/:businessId
// @access  Public
exports.getBusinessReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const total = await Review.countDocuments({
      business: req.params.businessId,
      isReported: false,
    });

    const reviews = await Review.find({
      business: req.params.businessId,
      isReported: false,
    })
      .populate("customer", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, reviews });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner reply to review
// @route   PUT /api/reviews/:id/reply
// @access  Private (owner)
exports.replyToReview = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment) {
      return next(new ErrorResponse("Reply comment is required", 400));
    }

    const review = await Review.findById(req.params.id).populate("business");
    if (!review) {
      return next(new ErrorResponse("Review not found", 404));
    }

    // Only business owner
    if (review.business.owner.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("Not authorized", 403));
    }

    review.ownerReply = { comment, repliedAt: new Date() };
    await review.save();

    // Customer ko notification
    await Notification.create({
      user: review.customer,
      title: "Owner replied to your review!",
      message: `${review.business.name} replied to your review`,
      type: "review_reply",
      link: "/my-bookings",
    });

    res.status(200).json({ success: true, review });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (customer or admin)
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return next(new ErrorResponse("Review not found", 404));
    }

    if (
      review.customer.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return next(new ErrorResponse("Not authorized", 403));
    }

    // Delete images from cloudinary
    if (review.images.length > 0) {
      for (const img of review.images) {
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
    }

    await review.deleteOne();

    // Update booking reviewLeft
    await Booking.findByIdAndUpdate(review.booking, { reviewLeft: false });

    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (err) {
    next(err);
  }
};

// @desc    Report review
// @route   PUT /api/reviews/:id/report
// @access  Private (owner)
exports.reportReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return next(new ErrorResponse("Review not found", 404));
    }

    review.isReported = true;
    review.reportReason = req.body.reason || "Inappropriate content";
    await review.save();

    res.status(200).json({ success: true, message: "Review reported" });
  } catch (err) {
    next(err);
  }
};

// @desc    Get owner reviews
// @route   GET /api/reviews/my-reviews
// @access  Private (owner)
exports.getMyBusinessReviews = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const reviews = await Review.find({ business: business._id })
      .populate("customer", "name avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin — get all reported reviews
// @route   GET /api/reviews/admin/reported
// @access  Private (admin)
exports.adminGetReportedReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ isReported: true })
      .populate("customer", "name email")
      .populate("business", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
};