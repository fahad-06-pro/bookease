const Business = require("../models/Business");
const Availability = require("../models/Availability");
const Notification = require("../models/Notification");
const ErrorResponse = require("../utils/errorResponse");
const { cloudinary, upload } = require("../config/cloudinary");

// @desc    Register new business
// @route   POST /api/businesses/register
// @access  Private (owner)
exports.registerBusiness = async (req, res, next) => {
  try {
    const existingBusiness = await Business.findOne({ owner: req.user._id });
    if (existingBusiness) {
      return next(new ErrorResponse("You already have a registered business", 400));
    }

    const {
      name, description, category,
      street, city, state, country, mapsLink,
      phone, email, website,
    } = req.body;

    const businessData = {
      owner: req.user._id,
      name,
      description,
      category,
      address: { street, city, state, country: country || "Pakistan", mapsLink },
      contact: { phone, email, website },
    };

    if (req.file) {
      businessData.logo = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    const business = await Business.create(businessData);

    // Default availability banao
    await Availability.create({ business: business._id });

    // Admin ko notification
    await Notification.create({
      user: req.user._id,
      title: "Business Registered!",
      message: `Your business "${business.name}" has been submitted for approval.`,
      type: "business_approved",
      link: `/owner/dashboard`,
    });

    res.status(201).json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all approved businesses
// @route   GET /api/businesses
// @access  Public
exports.getAllBusinesses = async (req, res, next) => {
  try {
    const { category, city, search, sort, page = 1, limit = 12 } = req.query;

    const query = { status: "approved" };

    if (category) query.category = category;
    if (city) query["address.city"] = { $regex: city, $options: "i" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === "rating") sortOption = { averageRating: -1 };
    if (sort === "popular") sortOption = { totalBookings: -1 };

    const skip = (page - 1) * limit;
    const total = await Business.countDocuments(query);

    const businesses = await Business.find(query)
      .populate("owner", "name email")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      businesses,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single business by slug
// @route   GET /api/businesses/:slug
// @access  Public
exports.getBusinessBySlug = async (req, res, next) => {
  try {
    const business = await Business.findOne({
      slug: req.params.slug,
      status: "approved",
    })
      .populate("owner", "name email")
      .populate("services");

    if (!business) {
      return next(new ErrorResponse("Business not found", 404));
    }

    res.status(200).json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// @desc    Get owner's own business
// @route   GET /api/businesses/my-business
// @access  Private (owner)
exports.getMyBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id }).populate("services");
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }
    res.status(200).json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// @desc    Update business profile
// @route   PUT /api/businesses/update
// @access  Private (owner)
exports.updateBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const {
      name, description, category,
      street, city, state, country, mapsLink,
      phone, email, website,
    } = req.body;

    if (name) business.name = name;
    if (description) business.description = description;
    if (category) business.category = category;
    if (street) business.address.street = street;
    if (city) business.address.city = city;
    if (state) business.address.state = state;
    if (country) business.address.country = country;
    if (mapsLink) business.address.mapsLink = mapsLink;
    if (phone) business.contact.phone = phone;
    if (email) business.contact.email = email;
    if (website) business.contact.website = website;

    if (req.file) {
      if (business.logo.public_id) {
        await cloudinary.uploader.destroy(business.logo.public_id);
      }
      business.logo = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    await business.save();
    res.status(200).json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// @desc    Get featured businesses
// @route   GET /api/businesses/featured
// @access  Public
exports.getFeaturedBusinesses = async (req, res, next) => {
  try {
    const businesses = await Business.find({
      status: "approved",
      isFeatured: true,
    }).limit(6);
    res.status(200).json({ success: true, businesses });
  } catch (err) {
    next(err);
  }
};

// ── ADMIN CONTROLLERS ──

// @desc    Get all businesses (admin)
// @route   GET /api/businesses/admin/all
// @access  Private (admin)
exports.adminGetAllBusinesses = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

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

// @desc    Approve business
// @route   PUT /api/businesses/admin/:id/approve
// @access  Private (admin)
exports.approveBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id).populate("owner");
    if (!business) {
      return next(new ErrorResponse("Business not found", 404));
    }

    business.status = "approved";
    await business.save();

    await Notification.create({
      user: business.owner._id,
      title: "Business Approved! 🎉",
      message: `Your business "${business.name}" has been approved. You can now receive bookings!`,
      type: "business_approved",
      link: "/owner/dashboard",
    });

    res.status(200).json({ success: true, message: "Business approved", business });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject business
// @route   PUT /api/businesses/admin/:id/reject
// @access  Private (admin)
exports.rejectBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id).populate("owner");
    if (!business) {
      return next(new ErrorResponse("Business not found", 404));
    }

    business.status = "rejected";
    await business.save();

    await Notification.create({
      user: business.owner._id,
      title: "Business Rejected",
      message: `Your business "${business.name}" has been rejected. Please contact support.`,
      type: "business_rejected",
      link: "/owner/dashboard",
    });

    res.status(200).json({ success: true, message: "Business rejected", business });
  } catch (err) {
    next(err);
  }
};

// @desc    Suspend business
// @route   PUT /api/businesses/admin/:id/suspend
// @access  Private (admin)
exports.suspendBusiness = async (req, res, next) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: "suspended" },
      { new: true }
    );
    if (!business) {
      return next(new ErrorResponse("Business not found", 404));
    }
    res.status(200).json({ success: true, message: "Business suspended", business });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle featured
// @route   PUT /api/businesses/admin/:id/featured
// @access  Private (admin)
exports.toggleFeatured = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return next(new ErrorResponse("Business not found", 404));
    }
    business.isFeatured = !business.isFeatured;
    await business.save();
    res.status(200).json({ success: true, message: `Business ${business.isFeatured ? "featured" : "unfeatured"}`, business });
  } catch (err) {
    next(err);
  }
};