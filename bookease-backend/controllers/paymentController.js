const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/Booking");
const Business = require("../models/Business");
const Service = require("../models/Service");
const Notification = require("../models/Notification");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Create Stripe checkout session
// @route   POST /api/payments/checkout
// @access  Private (customer)
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate("service", "name price")
      .populate("business", "name");

    if (!booking) {
      return next(new ErrorResponse("Booking not found", 404));
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("Not authorized", 403));
    }

    if (booking.paymentStatus === "paid") {
      return next(new ErrorResponse("Already paid", 400));
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "pkr",
            product_data: {
              name: booking.service.name,
              description: `Appointment at ${booking.business.name} on ${new Date(booking.appointmentDate).toLocaleDateString()} at ${booking.appointmentTime}`,
            },
            unit_amount: booking.totalAmount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/booking/${bookingId}?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/booking/${bookingId}?payment=cancelled`,
      metadata: {
        bookingId: bookingId.toString(),
        customerId: req.user._id.toString(),
      },
    });

    // Save session id
    booking.stripeSessionId = session.id;
    await booking.save();

    res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (err) {
    next(err);
  }
};

// @desc    Stripe webhook handler
// @route   POST /api/payments/webhook
// @access  Public (Stripe)
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata.bookingId;

    const booking = await Booking.findById(bookingId)
      .populate("customer", "name email")
      .populate("business", "name owner");

    if (booking) {
      booking.paymentStatus = "paid";
      booking.stripePaymentIntentId = session.payment_intent;
      await booking.save();

      await Notification.create({
        user: booking.business.owner,
        title: "Payment Received! 💰",
        message: `Payment of Rs.${booking.totalAmount} received for booking`,
        type: "payment_received",
        link: "/owner/bookings",
      });
    }
  }

  res.json({ received: true });
};

// @desc    Get payment status
// @route   GET /api/payments/status/:bookingId
// @access  Private
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).select(
      "paymentStatus paymentMethod totalAmount stripeSessionId"
    );

    if (!booking) {
      return next(new ErrorResponse("Booking not found", 404));
    }

    res.status(200).json({ success: true, payment: booking });
  } catch (err) {
    next(err);
  }
};