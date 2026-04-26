import api from "./api";
import { getAuthHeaders } from "./authService";

// Lấy danh sách vé của người dùng
export const getMyTickets = () => {
  return api.get("/users/tickets", {
    headers: getAuthHeaders(),
  });
};

// Lấy chi tiết vé
export const getTicketDetail = (id) => {
  return api.get(`/users/tickets/${id}`, {
    headers: getAuthHeaders(),
  });
};

// Tạo yêu cầu chuyển nhượng vé
export const createTransferRequest = (payload) => {
  return api.post("/users/transfers", payload, {
    headers: getAuthHeaders(),
  });
};

// Lấy danh sách yêu cầu chuyển nhượng của người dùng
export const getMyTransfers = () => {
  return api.get("/users/transfers", {
    headers: getAuthHeaders(),
  });
};

// Hủy yêu cầu chuyển nhượng vé
export const cancelTransferRequest = (id) => {
  return api.put(`/users/transfers/${id}/cancel`, {}, {
    headers: getAuthHeaders(),
  });
};