const crypto = require("crypto");

const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const resetExpire = Date.now() + 30 * 60 * 1000;
  return { resetToken, hashedToken, resetExpire };
};

module.exports = generateResetToken;