import api from "./api";

export const payOrder = ({
  order_id,
  payment_method = "demo",
  amount,
  currency = "VND",
}) => {
  const payload = {
    order_id,
    payment_method,
    currency,
  };

  if (amount !== undefined && amount !== null && amount !== "") {
    payload.amount = amount;
  }

  return api.post("/users/payments/pay", payload);
};

export const getMyPayments = (params = {}) => {
  return api.get("/users/payments", { params });
};

export const getPaymentDetail = (paymentId) => {
  return api.get(`/users/payments/${paymentId}`);
};