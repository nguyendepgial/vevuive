const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Chưa xác thực người dùng",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập chức năng này",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi middleware phân quyền admin",
      error: err.message,
    });
  }
};

module.exports = {
  requireAdmin,
};