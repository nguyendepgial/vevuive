const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const registerUser = async ({ full_name, email, phone, password }) => {
  const connection = await pool.getConnection();

  try {
    // Kiểm tra email đã tồn tại
    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      throw new Error("Email đã tồn tại");
    }

    // Kiểm tra số điện thoại đã tồn tại
    const [existingPhones] = await connection.query(
      "SELECT id FROM users WHERE phone = ? LIMIT 1",
      [phone]
    );

    if (existingPhones.length > 0) {
      throw new Error("Số điện thoại đã tồn tại");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await connection.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'customer', 'active')`,
      [full_name, email, phone, password_hash]
    );

    const [newUsers] = await connection.query(
      `SELECT id, full_name, email, phone, role, status, created_at
       FROM users
       WHERE id = ?`,
      [result.insertId]
    );

    return newUsers[0];
  } finally {
    connection.release();
  }
};

const loginUser = async ({ email, password }) => {
  const connection = await pool.getConnection();

  try {
    const [users] = await connection.query(
      `SELECT id, full_name, email, phone, password_hash, role, status
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    const user = users[0];

    if (user.status !== "active") {
      throw new Error("Tài khoản không hoạt động");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    };
  } finally {
    connection.release();
  }
};

module.exports = {
  registerUser,
  loginUser
};