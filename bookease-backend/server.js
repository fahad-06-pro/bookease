const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const startCronJobs = require("./utils/cronJobs");

dotenv.config();
connectDB();

const app = express();

// Stripe webhook — raw body chahiye (routes se pehle)
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, please try again later" },
});
app.use("/api", limiter);

// Models — sab register karo
require("./models/User");
require("./models/Business");
require("./models/Service");
require("./models/Booking");
require("./models/Availability");
require("./models/Review");
require("./models/Notification");

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/businesses", require("./routes/businessRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/availability", require("./routes/availabilityRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "BookEase API is running 🚀" });
});

// Error handler
app.use(errorHandler);

// Start cron jobs
startCronJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});