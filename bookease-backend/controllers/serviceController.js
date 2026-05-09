const Service = require("../models/Service");
const Business = require("../models/Business");
const ErrorResponse = require("../utils/errorResponse");
const { cloudinary } = require("../config/cloudinary");

// @desc    Add service
// @route   POST /api/services
// @access  Private (owner)
exports.addService = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }
    if (business.status !== "approved") {
      return next(new ErrorResponse("Business must be approved to add services", 403));
    }

    const { name, description, price, duration } = req.body;

    const serviceData = {
      business: business._id,
      name,
      description,
      price: Number(price),
      duration: Number(duration),
    };

    if (req.file) {
      serviceData.image = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    const service = await Service.create(serviceData);
    res.status(201).json({ success: true, service });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all services of a business
// @route   GET /api/services/business/:businessId
// @access  Public
exports.getBusinessServices = async (req, res, next) => {
  try {
    const services = await Service.find({
      business: req.params.businessId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, services });
  } catch (err) {
    next(err);
  }
};

// @desc    Get owner's own services
// @route   GET /api/services/my-services
// @access  Private (owner)
exports.getMyServices = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const services = await Service.find({ business: business._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, services });
  } catch (err) {
    next(err);
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (owner)
exports.updateService = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const service = await Service.findOne({ _id: req.params.id, business: business._id });
    if (!service) {
      return next(new ErrorResponse("Service not found", 404));
    }

    const { name, description, price, duration, isActive } = req.body;

    if (name) service.name = name;
    if (description) service.description = description;
    if (price) service.price = Number(price);
    if (duration) service.duration = Number(duration);
    if (isActive !== undefined) service.isActive = isActive;

    if (req.file) {
      if (service.image.public_id) {
        await cloudinary.uploader.destroy(service.image.public_id);
      }
      service.image = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    await service.save();
    res.status(200).json({ success: true, service });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (owner)
exports.deleteService = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return next(new ErrorResponse("No business found", 404));
    }

    const service = await Service.findOne({ _id: req.params.id, business: business._id });
    if (!service) {
      return next(new ErrorResponse("Service not found", 404));
    }

    if (service.image.public_id) {
      await cloudinary.uploader.destroy(service.image.public_id);
    }

    await service.deleteOne();
    res.status(200).json({ success: true, message: "Service deleted" });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle service active status
// @route   PUT /api/services/:id/toggle
// @access  Private (owner)
exports.toggleService = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    const service = await Service.findOne({ _id: req.params.id, business: business._id });
    if (!service) {
      return next(new ErrorResponse("Service not found", 404));
    }

    service.isActive = !service.isActive;
    await service.save();

    res.status(200).json({
      success: true,
      message: `Service ${service.isActive ? "activated" : "deactivated"}`,
      service,
    });
  } catch (err) {
    next(err);
  }
};