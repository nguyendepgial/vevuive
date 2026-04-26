import api from "./api";

export const adminGetOrders = (params = {}) => {
  return api.get("/admin/manage/orders", { params });
};

export const adminGetOrderDetail = (orderId) => {
  return api.get(`/admin/manage/orders/${orderId}`);
};

export const adminUpdateOrderStatus = ({
  orderId,
  order_status,
  payment_status,
  cancel_reason = "",
}) => {
  return api.put(`/admin/manage/orders/${orderId}/status`, {
    order_status,
    payment_status,
    cancel_reason,
  });
};