const welcomeEmail = (name) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">BookEase</h1>
            <p style="color:#aaaaaa;margin:8px 0 0;font-size:14px;">Appointment Booking Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#111111;margin:0 0 16px;">Welcome, ${name}! 👋</h2>
            <p style="color:#555555;line-height:1.7;margin:0 0 24px;">Your account has been created successfully. You can now discover businesses and book appointments instantly.</p>
            <a href="${process.env.CLIENT_URL}" style="display:inline-block;background:#111111;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Explore BookEase</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f5;padding:24px 40px;text-align:center;">
            <p style="color:#aaaaaa;font-size:13px;margin:0;">© ${new Date().getFullYear()} BookEase. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const resetPasswordEmail = (name, resetUrl) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">BookEase</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#111111;margin:0 0 16px;">Reset Your Password</h2>
            <p style="color:#555555;line-height:1.7;margin:0 0 8px;">Hi ${name},</p>
            <p style="color:#555555;line-height:1.7;margin:0 0 24px;">Click below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#111111;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
            <p style="color:#aaaaaa;font-size:13px;margin:24px 0 0;">If you did not request this, ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f5;padding:24px 40px;text-align:center;">
            <p style="color:#aaaaaa;font-size:13px;margin:0;">© ${new Date().getFullYear()} BookEase. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const bookingConfirmationEmail = (customerName, booking, business, service) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">BookEase</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#111111;margin:0 0 8px;">Booking Confirmed ✅</h2>
            <p style="color:#555555;line-height:1.7;margin:0 0 24px;">Hi ${customerName}, your appointment has been booked successfully!</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;padding:24px;margin-bottom:24px;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eeeeee;">
                <span style="color:#aaaaaa;font-size:13px;">Business</span><br/>
                <strong style="color:#111111;">${business.name}</strong>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eeeeee;">
                <span style="color:#aaaaaa;font-size:13px;">Service</span><br/>
                <strong style="color:#111111;">${service.name}</strong>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eeeeee;">
                <span style="color:#aaaaaa;font-size:13px;">Date & Time</span><br/>
                <strong style="color:#111111;">${new Date(booking.appointmentDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${booking.appointmentTime}</strong>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <span style="color:#aaaaaa;font-size:13px;">Amount</span><br/>
                <strong style="color:#111111;">Rs. ${booking.totalAmount}</strong>
              </td></tr>
            </table>
            <a href="${process.env.CLIENT_URL}/my-bookings" style="display:inline-block;background:#111111;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">View Booking</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f5;padding:24px 40px;text-align:center;">
            <p style="color:#aaaaaa;font-size:13px;margin:0;">© ${new Date().getFullYear()} BookEase. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const bookingReminderEmail = (customerName, booking, business, service) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">BookEase</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#111111;margin:0 0 8px;">Reminder: Appointment Tomorrow 🔔</h2>
            <p style="color:#555555;line-height:1.7;margin:0 0 24px;">Hi ${customerName}, just a reminder about your upcoming appointment.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;padding:24px;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eeeeee;">
                <span style="color:#aaaaaa;font-size:13px;">Business</span><br/>
                <strong style="color:#111111;">${business.name}</strong>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eeeeee;">
                <span style="color:#aaaaaa;font-size:13px;">Service</span><br/>
                <strong style="color:#111111;">${service.name}</strong>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <span style="color:#aaaaaa;font-size:13px;">Time</span><br/>
                <strong style="color:#111111;">${booking.appointmentTime}</strong>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f5;padding:24px 40px;text-align:center;">
            <p style="color:#aaaaaa;font-size:13px;margin:0;">© ${new Date().getFullYear()} BookEase. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const bookingStatusEmail = (customerName, status, booking, business) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">BookEase</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#111111;margin:0 0 8px;">
              Booking ${status === "confirmed" ? "Accepted ✅" : status === "cancelled" ? "Cancelled ❌" : "Completed ✅"}
            </h2>
            <p style="color:#555555;line-height:1.7;margin:0 0 16px;">Hi ${customerName}, your booking at <strong>${business.name}</strong> has been <strong>${status}</strong>.</p>
            <p style="color:#555555;line-height:1.7;margin:0 0 24px;">Date: <strong>${new Date(booking.appointmentDate).toLocaleDateString()}</strong> at <strong>${booking.appointmentTime}</strong></p>
            <a href="${process.env.CLIENT_URL}/my-bookings" style="display:inline-block;background:#111111;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">View Booking</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f5;padding:24px 40px;text-align:center;">
            <p style="color:#aaaaaa;font-size:13px;margin:0;">© ${new Date().getFullYear()} BookEase. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

module.exports = {
  welcomeEmail,
  resetPasswordEmail,
  bookingConfirmationEmail,
  bookingReminderEmail,
  bookingStatusEmail,
};