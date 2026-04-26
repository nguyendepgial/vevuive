import api from "./api";

// User - tạo yêu cầu nạp tiền
export const createTopupRequest = ({
  amount,
  payment_method = "qr_transfer",
  payment_note = "",
}) => {
  return api.post("/users/topup-requests", {
    amount,
    payment_method,
    payment_note,
  });
};

// User - xem yêu cầu nạp tiền của mình
export const getMyTopupRequests = (params = {}) => {
  return api.get("/users/topup-requests", { params });
};

// User - xác nhận đã thanh toán
export const submitPaidTopupRequest = ({
  requestId,
  payment_note = "",
  proof_image_url = "",
}) => {
  return api.put(`/users/topup-requests/${requestId}/submit`, {
    payment_note,
    proof_image_url,
  });
};

// User - hủy yêu cầu nạp tiền
export const cancelTopupRequest = (requestId) => {
  return api.put(`/users/topup-requests/${requestId}/cancel`);
};

// Admin - xem yêu cầu nạp tiền
export const adminGetTopupRequests = (params = {}) => {
  return api.get("/admin/topup-requests", { params });
};

// Admin - duyệt yêu cầu nạp tiền
export const adminApproveTopupRequest = ({
  requestId,
  admin_note = "",
}) => {
  return api.put(`/admin/topup-requests/${requestId}/approve`, {
    admin_note,
  });
};

// Admin - từ chối yêu cầu nạp tiền
export const adminRejectTopupRequest = ({
  requestId,
  admin_note = "",
}) => {
  return api.put(`/admin/topup-requests/${requestId}/reject`, {
    admin_note,
  });
};