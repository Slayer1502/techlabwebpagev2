require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error("[FATAL] JWT_SECRET environment variable is not set. Server cannot start.");
  process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.error("[FATAL] JWT_REFRESH_SECRET environment variable is not set. Server cannot start.");
  process.exit(1);
}

const config = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  OTP_TTL_MINUTES: 5,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX: 10,
  REFRESH_COOKIE_MS: 30 * 24 * 60 * 60 * 1000,
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  UPLOADS_DIR_NAME: "uploads",
  PDF_COLORS: {
    NAVY: "#10284f",
    BLUE: "#1663ff",
    GRAY: "#d9e2ef",
    LIGHT_GRAY: "#f8f9fa",
    TEXT: "#1f2c3d",
    TEXT_SOFT: "#55657d",
    DANGER: "#d64545",
    SUCCESS: "#22c55e"
  }
};

module.exports = config;
