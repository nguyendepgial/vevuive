const pool = require("../../config/db");

// =========================
// Helpers
// =========================
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWalletAddress(address) {
  return normalizeString(address).toLowerCase();
}

function validateWalletAddress(address) {
  return /^0x[a-f0-9]{40}$/.test(address);
}

function validateWalletType(walletType) {
  return ["metamask", "walletconnect", "other"].includes(walletType);
}

function buildWalletResponse(wallet) {
  return {
    id: wallet.id,
    user_id: wallet.user_id,
    wallet_address: wallet.wallet_address,
    wallet_type: wallet.wallet_type,
    network_name: wallet.network_name,
    is_verified: wallet.is_verified,
    linked_at: wallet.linked_at,
    verified_at: wallet.verified_at,
    updated_at: wallet.updated_at,
  };
}

// =========================
// Link Wallet
// =========================
const linkWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    let { wallet_address, wallet_type, network_name } = req.body;

    wallet_address = normalizeWalletAddress(wallet_address);
    wallet_type = normalizeString(wallet_type || "metamask").toLowerCase();
    network_name = normalizeString(network_name || "sepolia").toLowerCase();

    const errors = {};

    if (!wallet_address) {
      errors.wallet_address = "Địa chỉ ví không được để trống";
    } else if (!validateWalletAddress(wallet_address)) {
      errors.wallet_address = "Địa chỉ ví không đúng định dạng";
    }

    if (!wallet_type) {
      errors.wallet_type = "Loại ví không được để trống";
    } else if (!validateWalletType(wallet_type)) {
      errors.wallet_type = "Loại ví không hợp lệ";
    }

    if (!network_name) {
      errors.network_name = "Tên mạng không được để trống";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu ví không hợp lệ",
        errors,
      });
    }

    const [existingUserWallet] = await pool.query(
      "SELECT id FROM wallets WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (existingUserWallet.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Người dùng đã liên kết ví",
        errors: {
          wallet: "Mỗi tài khoản chỉ được liên kết 1 ví",
        },
      });
    }

    const [existingWalletAddress] = await pool.query(
      "SELECT id FROM wallets WHERE wallet_address = ? LIMIT 1",
      [wallet_address]
    );

    if (existingWalletAddress.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Địa chỉ ví đã được sử dụng",
        errors: {
          wallet_address: "Địa chỉ ví đã được liên kết với tài khoản khác",
        },
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO wallets (
        user_id,
        wallet_address,
        wallet_type,
        network_name,
        is_verified,
        linked_at,
        verified_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 0, NOW(), NULL, NOW())
      `,
      [userId, wallet_address, wallet_type, network_name]
    );

    const [walletRows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        wallet_address,
        wallet_type,
        network_name,
        is_verified,
        linked_at,
        verified_at,
        updated_at
      FROM wallets
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Liên kết ví thành công",
      data: buildWalletResponse(walletRows[0]),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi liên kết ví",
      error: err.message,
    });
  }
};

// =========================
// Get My Wallet
// =========================
const getMyWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    const [walletRows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        wallet_address,
        wallet_type,
        network_name,
        is_verified,
        linked_at,
        verified_at,
        updated_at
      FROM wallets
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (walletRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Người dùng chưa liên kết ví",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin ví thành công",
      data: buildWalletResponse(walletRows[0]),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin ví",
      error: err.message,
    });
  }
};

// =========================
// Update Wallet
// =========================
const updateWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    let { wallet_address, wallet_type, network_name } = req.body;

    wallet_address =
      wallet_address !== undefined ? normalizeWalletAddress(wallet_address) : undefined;
    wallet_type =
      wallet_type !== undefined ? normalizeString(wallet_type).toLowerCase() : undefined;
    network_name =
      network_name !== undefined ? normalizeString(network_name).toLowerCase() : undefined;

    const [existingWalletRows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        wallet_address,
        wallet_type,
        network_name,
        is_verified,
        linked_at,
        verified_at,
        updated_at
      FROM wallets
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (existingWalletRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Người dùng chưa liên kết ví",
      });
    }

    const errors = {};

    if (wallet_address !== undefined) {
      if (!wallet_address) {
        errors.wallet_address = "Địa chỉ ví không được để trống";
      } else if (!validateWalletAddress(wallet_address)) {
        errors.wallet_address = "Địa chỉ ví không đúng định dạng";
      } else {
        const [existingWalletAddress] = await pool.query(
          "SELECT id FROM wallets WHERE wallet_address = ? AND user_id != ? LIMIT 1",
          [wallet_address, userId]
        );

        if (existingWalletAddress.length > 0) {
          errors.wallet_address = "Địa chỉ ví đã được liên kết với tài khoản khác";
        }
      }
    }

    if (wallet_type !== undefined) {
      if (!wallet_type) {
        errors.wallet_type = "Loại ví không được để trống";
      } else if (!validateWalletType(wallet_type)) {
        errors.wallet_type = "Loại ví không hợp lệ";
      }
    }

    if (network_name !== undefined && !network_name) {
      errors.network_name = "Tên mạng không được để trống";
    }

    if (
      wallet_address === undefined &&
      wallet_type === undefined &&
      network_name === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu nào để cập nhật",
      });
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu cập nhật ví không hợp lệ",
        errors,
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (wallet_address !== undefined) {
      updateFields.push("wallet_address = ?");
      updateValues.push(wallet_address);

      // Đổi địa chỉ ví thì reset xác minh
      updateFields.push("is_verified = 0");
      updateFields.push("verified_at = NULL");
    }

    if (wallet_type !== undefined) {
      updateFields.push("wallet_type = ?");
      updateValues.push(wallet_type);
    }

    if (network_name !== undefined) {
      updateFields.push("network_name = ?");
      updateValues.push(network_name);
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(userId);

    await pool.query(
      `UPDATE wallets SET ${updateFields.join(", ")} WHERE user_id = ?`,
      updateValues
    );

    const [walletRows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        wallet_address,
        wallet_type,
        network_name,
        is_verified,
        linked_at,
        verified_at,
        updated_at
      FROM wallets
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật ví thành công",
      data: buildWalletResponse(walletRows[0]),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật ví",
      error: err.message,
    });
  }
};

// =========================
// Delete Wallet
// =========================
const deleteWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    const [walletRows] = await pool.query(
      "SELECT id FROM wallets WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (walletRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Người dùng chưa liên kết ví",
      });
    }

    // Ràng buộc nghiệp vụ:
    // Không nên cho xóa ví nếu user đang có ticket active/pending_mint/transfer_pending
    const [ticketRows] = await pool.query(
      `
      SELECT id
      FROM tickets
      WHERE owner_user_id = ?
        AND ticket_status IN ('pending_mint', 'active', 'transfer_pending')
      LIMIT 1
      `,
      [userId]
    );

    if (ticketRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể gỡ ví khi tài khoản đang sở hữu vé còn hiệu lực",
      });
    }

    await pool.query("DELETE FROM wallets WHERE user_id = ?", [userId]);

    return res.status(200).json({
      success: true,
      message: "Gỡ liên kết ví thành công",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi gỡ liên kết ví",
      error: err.message,
    });
  }
};

module.exports = {
  linkWallet,
  getMyWallet,
  updateWallet,
  deleteWallet,
};