import api from "./api";
import { getAuthHeaders } from "./authService";

// Tạo đơn hàng mới (đặt vé)
export const createOrder = (payload) => {
  return api.post("/users/orders", payload, {
    headers: getAuthHeaders(),
  });
};

// Lấy danh sách đơn hàng của người dùng
export const getMyOrders = () => {
  return api.get("/users/orders", {
    headers: getAuthHeaders(),
  });
};

// Lấy chi tiết đơn hàng
export const getOrderDetail = (orderId) => {
  return api.get(`/users/orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
};

// Hủy đơn hàng
export const cancelOrder = (orderId) => {
  return api.put(`/users/orders/${orderId}/cancel`, {}, {
    headers: getAuthHeaders(),
  });
};