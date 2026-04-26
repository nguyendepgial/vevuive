function parseMoney(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(2));
}

function generateTransactionCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const i = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `WTX${y}${m}${d}${h}${i}${s}${rand}`;
}

async function ensureUserBalance(connection, userId, forUpdate = false) {
  await connection.query(
    `
    INSERT IGNORE INTO user_balances (
      user_id,
      balance,
      currency,
      created_at,
      updated_at
    )
    VALUES (?, 0.00, 'VND', NOW(), NOW())
    `,
    [userId]
  );

  const [rows] = await connection.query(
    `
    SELECT
      id,
      user_id,
      balance,
      currency,
      created_at,
      updated_at
    FROM user_balances
    WHERE user_id = ?
    LIMIT 1
    ${forUpdate ? "FOR UPDATE" : ""}
    `,
    [userId]
  );

  if (rows.length === 0) {
    throw new Error("Không thể khởi tạo ví nội bộ cho người dùng");
  }

  return rows[0];
}

async function getUserBalance(connection, userId, forUpdate = false) {
  return ensureUserBalance(connection, userId, forUpdate);
}

async function createWalletTransaction(
  connection,
  {
    userId,
    transactionType,
    amount,
    balanceBefore,
    balanceAfter,
    referenceType = "manual",
    referenceId = null,
    status = "success",
    note = null,
    adminId = null,
  }
) {
  const transactionCode = generateTransactionCode();

  const [result] = await connection.query(
    `
    INSERT INTO wallet_transactions (
      transaction_code,
      user_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      currency,
      reference_type,
      reference_id,
      status,
      note,
      created_by_admin_id,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'VND', ?, ?, ?, ?, ?, NOW())
    `,
    [
      transactionCode,
      userId,
      transactionType,
      amount,
      balanceBefore,
      balanceAfter,
      referenceType,
      referenceId,
      status,
      note,
      adminId,
    ]
  );

  const [rows] = await connection.query(
    `
    SELECT
      id,
      transaction_code,
      user_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      currency,
      reference_type,
      reference_id,
      status,
      note,
      created_by_admin_id,
      created_at
    FROM wallet_transactions
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  return rows[0];
}

async function creditBalance(
  connection,
  {
    userId,
    amount,
    transactionType = "topup",
    referenceType = "manual",
    referenceId = null,
    note = null,
    adminId = null,
  }
) {
  const parsedAmount = parseMoney(amount);

  if (!parsedAmount) {
    const error = new Error("Số tiền cộng vào ví không hợp lệ");
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  const balanceRow = await ensureUserBalance(connection, userId, true);

  const balanceBefore = Number(balanceRow.balance);
  const balanceAfter = Number((balanceBefore + parsedAmount).toFixed(2));

  await connection.query(
    `
    UPDATE user_balances
    SET balance = ?,
        updated_at = NOW()
    WHERE user_id = ?
    `,
    [balanceAfter, userId]
  );

  return createWalletTransaction(connection, {
    userId,
    transactionType,
    amount: parsedAmount,
    balanceBefore,
    balanceAfter,
    referenceType,
    referenceId,
    status: "success",
    note,
    adminId,
  });
}

async function debitBalance(
  connection,
  {
    userId,
    amount,
    transactionType = "purchase_ticket",
    referenceType = "manual",
    referenceId = null,
    note = null,
    adminId = null,
  }
) {
  const parsedAmount = parseMoney(amount);

  if (!parsedAmount) {
    const error = new Error("Số tiền trừ khỏi ví không hợp lệ");
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  const balanceRow = await ensureUserBalance(connection, userId, true);

  const balanceBefore = Number(balanceRow.balance);

  if (balanceBefore < parsedAmount) {
    const error = new Error("Số dư ví nội bộ không đủ");
    error.code = "INSUFFICIENT_BALANCE";
    error.currentBalance = balanceBefore;
    error.requiredAmount = parsedAmount;
    throw error;
  }

  const balanceAfter = Number((balanceBefore - parsedAmount).toFixed(2));

  await connection.query(
    `
    UPDATE user_balances
    SET balance = ?,
        updated_at = NOW()
    WHERE user_id = ?
    `,
    [balanceAfter, userId]
  );

  return createWalletTransaction(connection, {
    userId,
    transactionType,
    amount: parsedAmount,
    balanceBefore,
    balanceAfter,
    referenceType,
    referenceId,
    status: "success",
    note,
    adminId,
  });
}

module.exports = {
  parseMoney,
  getUserBalance,
  ensureUserBalance,
  creditBalance,
  debitBalance,
};