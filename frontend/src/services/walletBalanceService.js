import api from "./api";

export const getMyWalletBalance = () => {
  return api.get("/users/wallet-balance");
};

export const getMyWalletTransactions = (params = {}) => {
  return api.get("/users/wallet-transactions", { params });
};

export const adminGetUserBalances = (params = {}) => {
  return api.get("/admin/wallet-balances", { params });
};

export const adminGetUserBalanceDetail = (userId) => {
  return api.get(`/admin/wallet-balances/${userId}`);
};

export const adminTopupUserBalance = ({ user_id, amount, note = "" }) => {
  return api.post("/admin/wallet-balances/topup", {
    user_id,
    amount,
    note,
  });
};