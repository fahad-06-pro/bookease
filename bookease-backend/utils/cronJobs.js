const cron = require("node-cron");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Business = require("../models/Business");
const Service = require("../models/Service");
const sendEmail = require("../emails/sendEmail");
const { bookingReminderEmail } = require("../emails/templates");

// Run every hour
const startCronJobs = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Cron running — checking reminders...");

    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find bookings 24 hours away — reminder not sent yet
      const bookings = await Booking.find({
        appointmentDate: { $gte: in24Hours, $lte: in25Hours },
        status: { $in: ["pending", "confirmed"] },
        reminderSent: false,
      })
        .populate("customer", "name email")
        .populate("business", "name")
        .populate("service", "name");

      console.log(`Found ${bookings.length} bookings to remind`);

      for (const booking of bookings) {
        try {
          await sendEmail({
            to: booking.customer.email,
            subject: "Reminder: Appointment Tomorrow — BookEase",
            html: bookingReminderEmail(
              booking.customer.name,
              booking,
              booking.business,
              booking.service
            ),
          });

          // Mark reminder sent
          await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });
          console.log(`✅ Reminder sent to ${booking.customer.email}`);
        } catch (emailErr) {
          console.error(`❌ Reminder failed for ${booking.customer.email}:`, emailErr.message);
        }
      }
    } catch (err) {
      console.error("Cron job error:", err.message);
    }
  });

  // Clean old notifications — run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("🧹 Cleaning old notifications...");
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await require("../models/Notification").deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true,
      });
      console.log(`✅ Deleted ${result.deletedCount} old notifications`);
    } catch (err) {
      console.error("Notification cleanup error:", err.message);
    }
  });

  console.log("✅ Cron jobs started!");
};

module.exports = startCronJobs;