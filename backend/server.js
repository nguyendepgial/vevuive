const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

// Load biến môi trường trước khi require db/config khác
dotenv.config();

const pool = require("./config/db");
const errorMiddleware = require("./middlewares/errorMiddleware");

// =========================
// User Routes
// =========================
const authRoutes = require("./routes/user/authRoutes");
const walletRoutes = require("./routes/user/walletRoutes");
const userWalletBalanceRoutes = require("./routes/user/walletBalanceRoutes");

const userEventRoutes = require("./routes/user/eventRoutes");
const userEventQuestionRoutes = require("./routes/user/eventQuestionRoutes");
const userTicketTypeRoutes = require("./routes/user/ticketTypeRoutes");

const userOrderRoutes = require("./routes/user/orderRoutes");
const userPaymentRoutes = require("./routes/user/paymentRoutes");
const userTicketRoutes = require("./routes/user/ticketRoutes");

const userTransferRoutes = require("./routes/user/transferRoutes");
const userMarketplaceRoutes = require("./routes/user/marketplaceRoutes");

const userTopupRequestRoutes = require("./routes/user/topupRequestRoutes");

// =========================
// Admin Routes
// =========================
const adminEventRoutes = require("./routes/admin/eventRoutes");
const adminEventQuestionRoutes = require("./routes/admin/eventQuestionRoutes");
const adminTicketTypeRoutes = require("./routes/admin/ticketTypeRoutes");

const adminOrderRoutes = require("./routes/admin/orderRoutes");
const adminPaymentRoutes = require("./routes/admin/paymentRoutes");
const adminTicketRoutes = require("./routes/admin/ticketRoutes");

const adminTransferRoutes = require("./routes/admin/transferRoutes");
const adminWalletBalanceRoutes = require("./routes/admin/walletBalanceRoutes");
const adminMarketplaceRoutes = require("./routes/admin/marketplaceRoutes");

const adminTopupRequestRoutes = require("./routes/admin/topupRequestRoutes");
const adminDashboardRoutes = require("./routes/admin/dashboardRoutes");
const adminOrderManageRoutes = require("./routes/admin/orderManageRoutes");
const adminTicketManageRoutes = require("./routes/admin/ticketManageRoutes");
const adminUserManageRoutes = require("./routes/admin/userManageRoutes");
const adminCheckinRoutes = require("./routes/admin/checkinRoutes");
const app = express();

// =========================
// Middlewares
// =========================
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Test Route
// =========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend vevuive đang chạy",
  });
});

// =========================
// Health Check Route
// =========================
app.get("/api/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();

    return res.status(200).json({
      success: true,
      message: "Backend is running",
      database: "Connected",
      port: process.env.PORT || 5001,
      project: "vevuive",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Backend chạy nhưng lỗi kết nối database",
      error: error.message,
    });
  }
});

// =========================
// User API Routes
// Prefix: /api/users
// =========================
app.use("/api/users", authRoutes);
app.use("/api/users", walletRoutes);
app.use("/api/users", userWalletBalanceRoutes);

app.use("/api/users", userEventRoutes);
app.use("/api/users", userEventQuestionRoutes);
app.use("/api/users", userTicketTypeRoutes);

app.use("/api/users", userOrderRoutes);
app.use("/api/users", userPaymentRoutes);
app.use("/api/users", userTicketRoutes);

app.use("/api/users", userTransferRoutes);
app.use("/api/users", userMarketplaceRoutes);

app.use("/api/users", userTopupRequestRoutes);


// =========================
// Admin API Routes
// Prefix: /api/admin
// =========================
app.use("/api/admin", adminEventRoutes);
app.use("/api/admin", adminEventQuestionRoutes);
app.use("/api/admin", adminTicketTypeRoutes);

app.use("/api/admin", adminOrderRoutes);
app.use("/api/admin", adminPaymentRoutes);
app.use("/api/admin", adminTicketRoutes);

app.use("/api/admin", adminTransferRoutes);
app.use("/api/admin", adminWalletBalanceRoutes);
app.use("/api/admin", adminMarketplaceRoutes);

app.use("/api/admin", adminDashboardRoutes);
app.use("/api/admin", adminTopupRequestRoutes);
app.use("/api/admin", adminOrderManageRoutes);
app.use("/api/admin", adminTicketManageRoutes);
app.use("/api/admin", adminUserManageRoutes);
app.use("/api/admin", adminCheckinRoutes);
// =========================
// 404 Route
// =========================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint không tồn tại",
    path: req.originalUrl,
  });
});

// =========================
// Error Middleware
// =========================
app.use(errorMiddleware);

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});