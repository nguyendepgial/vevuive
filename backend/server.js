const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

const pool = require("./config/db");
const errorMiddleware = require("./middlewares/errorMiddleware");
const authRoutes = require("./routes/user/authRoutes");
const userEventRoutes = require("./routes/user/eventRoutes");
const adminEventRoutes = require("./routes/admin/eventRoutes");
const paymentRoutes = require("./routes/admin/paymentRoutes");
const userTicketTypeRoutes = require("./routes/user/ticketTypeRoutes");
const adminTicketTypeRoutes = require("./routes/admin/ticketTypeRoutes");
const userOrderRoutes = require("./routes/user/orderRoutes");
const adminOrderRoutes = require("./routes/admin/orderRoutes");
const userPaymentRoutes = require("./routes/user/paymentRoutes");
const adminTicketRoutes = require("./routes/admin/ticketRoutes");
const userTicketRoutes = require("./routes/user/ticketRoutes");
const userTransferRoutes = require("./routes/user/transferRoutes");
const adminTransferRoutes = require("./routes/admin/transferRoutes");
const adminEventQuestionRoutes = require("./routes/admin/eventQuestionRoutes");
const userEventQuestionRoutes = require("./routes/user/eventQuestionRoutes");
dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend vevuive đang chạy",
  });
});

// Health check route
app.get("/api/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();

    res.json({
      success: true,
      message: "Backend is running",
      database: "Connected",
      port: process.env.PORT || 5001,
      project: "vevuive",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Backend chạy nhưng lỗi kết nối database",
      error: error.message,
    });
  }
});

// Use Routes
app.use("/api/users", authRoutes);
const walletRoutes = require("./routes/user/walletRoutes");
app.use("/api/users", walletRoutes);
app.use("/api/admin", paymentRoutes);
app.use("/api/users", userEventRoutes);
app.use("/api/admin", adminEventRoutes);
app.use("/api/users", userTicketTypeRoutes);
app.use("/api/admin", adminTicketTypeRoutes); 
app.use("/api/users", userOrderRoutes);
app.use("/api/admin", adminOrderRoutes);
app.use("/api/users", userPaymentRoutes);
app.use("/api/users", userTicketRoutes);
app.use("/api/admin", adminTicketRoutes);
app.use("/api/users", userTransferRoutes);
app.use("/api/admin", adminTransferRoutes);
app.use("/api/admin", adminEventQuestionRoutes);
app.use("/api/users", userEventQuestionRoutes);
// Error middleware
app.use(errorMiddleware);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});