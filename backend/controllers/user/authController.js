const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
require("dotenv").config();

// =========================
// Helpers
// =========================
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email) {
  return normalizeString(email).toLowerCase();
}

function normalizePhone(phone) {
  return typeof phone === "string" ? phone.replace(/\s+/g, "") : "";
}

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return emailRegex.test(email);
}

function validatePhoneNumber(phone) {
  return /^(0[0-9]{9})$/.test(phone);
}

function validatePassword(password) {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-\\[\]/+=~`]).{8,64}$/;
  return passwordRegex.test(password);
}

function validateFullName(fullName) {
  return fullName.length >= 2 && fullName.length <= 100;
}

function signAccessToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("Thiếu cấu hình JWT_SECRET trong môi trường");
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// =========================
// Register
// =========================
const register = async (req, res) => {
  try {
    let { full_name, email, phone, password, confirm_password } = req.body;

    full_name = normalizeString(full_name);
    email = normalizeEmail(email);
    phone = normalizePhone(phone);
    password = typeof password === "string" ? password : "";
    confirm_password = typeof confirm_password === "string" ? confirm_password : "";

    const errors = {};

    if (!full_name) {
      errors.full_name = "Họ tên không được để trống";
    } else if (!validateFullName(full_name)) {
      errors.full_name = "Họ tên phải từ 2 đến 100 ký tự";
    }

    if (!email) {
      errors.email = "Email không được để trống";
    } else if (!validateEmail(email)) {
      errors.email = "Email phải đúng định dạng và có đuôi @gmail.com";
    }

    if (!phone) {
      errors.phone = "Số điện thoại không được để trống";
    } else if (!validatePhoneNumber(phone)) {
      errors.phone = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0";
    }

    if (!password) {
      errors.password = "Mật khẩu không được để trống";
    } else if (!validatePassword(password)) {
      errors.password =
        "Mật khẩu phải từ 8-64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt";
    }

    if (!confirm_password) {
      errors.confirm_password = "Vui lòng xác nhận mật khẩu";
    } else if (password !== confirm_password) {
      errors.confirm_password = "Xác nhận mật khẩu không khớp";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu đăng ký không hợp lệ",
        errors,
      });
    }

    const [existingEmail] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email đã tồn tại",
        errors: {
          email: "Email đã được sử dụng",
        },
      });
    }

    const [existingPhone] = await pool.query(
      "SELECT id FROM users WHERE phone = ? LIMIT 1",
      [phone]
    );

    if (existingPhone.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Số điện thoại đã tồn tại",
        errors: {
          phone: "Số điện thoại đã được sử dụng",
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO users (full_name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'customer', 'active')
      `,
      [full_name, email, phone, hashedPassword]
    );

    const [users] = await pool.query(
      `
      SELECT id, full_name, email, phone, role, status, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: users[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng ký",
      error: err.message,
    });
  }
};

// =========================
// Login
// =========================
const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = normalizeEmail(email);
    password = typeof password === "string" ? password : "";

    const errors = {};

    if (!email) {
      errors.email = "Email không được để trống";
    } else if (!validateEmail(email)) {
      errors.email = "Email phải đúng định dạng và có đuôi @gmail.com";
    }

    if (!password) {
      errors.password = "Mật khẩu không được để trống";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu đăng nhập không hợp lệ",
        errors,
      });
    }

    const [users] = await pool.query(
      `
      SELECT id, full_name, email, phone, password_hash, role, status, last_login_at, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    const user = users[0];

    if (user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản chưa hoạt động",
      });
    }

    if (user.status === "banned") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    await pool.query(
      "UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?",
      [user.id]
    );

    const token = signAccessToken(user);

    const [walletRows] = await pool.query(
      `
      SELECT id, wallet_address, wallet_type, network_name, is_verified, linked_at, verified_at, updated_at
      FROM wallets
      WHERE user_id = ?
      LIMIT 1
      `,
      [user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          last_login_at: new Date().toISOString(),
          wallet: walletRows.length > 0 ? walletRows[0] : null,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng nhập",
      error: err.message,
    });
  }
};

// =========================
// Get My Profile
// =========================
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        w.id AS wallet_id,
        w.wallet_address,
        w.wallet_type,
        w.network_name,
        w.is_verified,
        w.linked_at,
        w.verified_at
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    const user = users[0];

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin người dùng thành công",
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        wallet: user.wallet_id
          ? {
              id: user.wallet_id,
              wallet_address: user.wallet_address,
              wallet_type: user.wallet_type,
              network_name: user.network_name,
              is_verified: user.is_verified,
              linked_at: user.linked_at,
              verified_at: user.verified_at,
            }
          : null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin người dùng",
      error: err.message,
    });
  }
};

// =========================
// Update Profile
// =========================
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    let { full_name, phone } = req.body;

    full_name = full_name !== undefined ? normalizeString(full_name) : undefined;
    phone = phone !== undefined ? normalizePhone(phone) : undefined;

    if (full_name !== undefined) {
      if (!full_name) {
        return res.status(400).json({
          success: false,
          message: "Họ tên không được để trống",
        });
      }

      if (!validateFullName(full_name)) {
        return res.status(400).json({
          success: false,
          message: "Họ tên phải từ 2 đến 100 ký tự",
        });
      }
    }

    if (phone !== undefined) {
      if (!validatePhoneNumber(phone)) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0",
        });
      }

      const [existingUsers] = await pool.query(
        "SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1",
        [phone, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Số điện thoại đã tồn tại",
          errors: {
            phone: "Số điện thoại đã được sử dụng",
          },
        });
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (full_name !== undefined) {
      updateFields.push("full_name = ?");
      updateValues.push(full_name);
    }

    if (phone !== undefined) {
      updateFields.push("phone = ?");
      updateValues.push(phone);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu nào để cập nhật",
      });
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(userId);

    await pool.query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const [users] = await pool.query(
      `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        w.id AS wallet_id,
        w.wallet_address,
        w.wallet_type,
        w.network_name,
        w.is_verified,
        w.linked_at,
        w.verified_at
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );

    const user = users[0];

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        wallet: user.wallet_id
          ? {
              id: user.wallet_id,
              wallet_address: user.wallet_address,
              wallet_type: user.wallet_type,
              network_name: user.network_name,
              is_verified: user.is_verified,
              linked_at: user.linked_at,
              verified_at: user.verified_at,
            }
          : null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật thông tin",
      error: err.message,
    });
  }
};

// =========================
// Change Password
// =========================
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    let { current_password, new_password, confirm_new_password } = req.body;

    current_password = typeof current_password === "string" ? current_password : "";
    new_password = typeof new_password === "string" ? new_password : "";
    confirm_new_password =
      typeof confirm_new_password === "string" ? confirm_new_password : "";

    const errors = {};

    if (!current_password) {
      errors.current_password = "Mật khẩu hiện tại không được để trống";
    }

    if (!new_password) {
      errors.new_password = "Mật khẩu mới không được để trống";
    } else if (!validatePassword(new_password)) {
      errors.new_password =
        "Mật khẩu mới phải từ 8-64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt";
    }

    if (!confirm_new_password) {
      errors.confirm_new_password = "Vui lòng xác nhận mật khẩu mới";
    } else if (new_password !== confirm_new_password) {
      errors.confirm_new_password = "Xác nhận mật khẩu mới không khớp";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu đổi mật khẩu không hợp lệ",
        errors,
      });
    }

    const [users] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(current_password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
        errors: {
          current_password: "Mật khẩu hiện tại không đúng",
        },
      });
    }

    const isSameOldPassword = await bcrypt.compare(new_password, user.password_hash);

    if (isSameOldPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
        errors: {
          new_password: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
        },
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
      [hashedPassword, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi đổi mật khẩu",
      error: err.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMyProfile,
  updateProfile,
  changePassword,
};