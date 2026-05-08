const mongoose = require("mongoose");
const slugify = require("slugify");

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: [100, "Business name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["salon", "clinic", "gym", "tutor", "spa", "dental", "other"],
    },
    logo: {
      public_id: { type: String, default: null },
      url: {
        type: String,
        default: "https://api.dicebear.com/7.x/initials/svg?seed=Business",
      },
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, default: "Pakistan" },
      mapsLink: { type: String, trim: true },
    },
    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      website: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended", "rejected"],
      default: "pending",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    stripeAccountId: {
      type: String,
      default: null,
    },
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate unique slug
businessSchema.pre("save", async function (next) {
  if (!this.isModified("name")) return next();
  let baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let count = 1;
  while (
    await mongoose.model("Business").findOne({ slug, _id: { $ne: this._id } })
  ) {
    slug = `${baseSlug}-${count}`;
    count++;
  }
  this.slug = slug;
  next();
});

// Virtuals
businessSchema.virtual("services", {
  ref: "Service",
  localField: "_id",
  foreignField: "business",
});

module.exports = mongoose.model("Business", businessSchema);