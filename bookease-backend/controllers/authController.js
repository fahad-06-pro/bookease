const User = require("../models/User");
const Notification = require("../models/Notification");
const ErrorResponse = require("../utils/errorResponse");
const sendToken = require("../utils/sendToken");
const sendEmail = require("../emails/sendEmail");
const { welcomeEmail, resetPasswordEmail } = require("../emails/templates");
const crypto = require("crypto");
const { upload } = require("../config/cloudinary");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse("Email already registered", 400));
    }

    // Only allow customer or owner registration
    const allowedRoles = ["customer", "owner"];
    if (role && !allowedRoles.includes(role)) {
      return next(new ErrorResponse("Invalid role", 400));
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || null,
      role: role || "customer",
    });

    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        subject: "Welcome to BookEase! 🎉",
        html: welcomeEmail(user.name),
      });
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr.message);
    }

    // Create welcome notification
    await Notification.create({
      user: user._id,
      title: "Welcome to BookEase!",
      message: "Your account has been created successfully.",
      type: "system",
    });

    sendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorResponse("Please provide email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    if (!user.isActive) {
      return next(new ErrorResponse("Your account has been deactivated. Contact support.", 403));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "favouriteBusinesses",
      "name slug logo averageRating category"
    );
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar from cloudinary if exists
      const user = await User.findById(req.user._id);
      if (user.avatar.public_id) {
        const { cloudinary } = require("../config/cloudinary");
        await cloudinary.uploader.destroy(user.avatar.public_id);
      }
      updateData.avatar = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse("Please provide current and new password", 400));
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse("Current password is incorrect", 400));
    }

    if (newPassword.length < 6) {
      return next(new ErrorResponse("New password must be at least 6 characters", 400));
    }

    user.password = newPassword;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorResponse("No account found with that email", 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "BookEase - Password Reset Request",
        html: resetPasswordEmail(user.name, resetUrl),
      });
      res.status(200).json({
        success: true,
        message: "Password reset email sent",
      });
    } catch (emailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new ErrorResponse("Email could not be sent", 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid or expired reset token", 400));
    }

    if (!req.body.password || req.body.password.length < 6) {
      return next(new ErrorResponse("Password must be at least 6 characters", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle favourite business
// @route   PUT /api/auth/favourite/:businessId
// @access  Private (customer)
exports.toggleFavourite = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const businessId = req.params.businessId;

    const isFav = user.favouriteBusinesses.includes(businessId);
    if (isFav) {
      user.favouriteBusinesses = user.favouriteBusinesses.filter(
        (id) => id.toString() !== businessId
      );
    } else {
      user.favouriteBusinesses.push(businessId);
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: isFav ? "Removed from favourites" : "Added to favourites",
      favouriteBusinesses: user.favouriteBusinesses,
    });
  } catch (err) {
    next(err);
  }
};