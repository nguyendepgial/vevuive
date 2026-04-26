import api from "./api";

export const createTransferRequest = ({
  ticket_id,
  receiver_wallet_address,
  transfer_type = "gift",
  asking_price = 0,
  note = "",
  expires_in_minutes,
}) => {
  const payload = {
    ticket_id,
    receiver_wallet_address,
    transfer_type,
    asking_price,
    note,
  };

  if (expires_in_minutes) {
    payload.expires_in_minutes = expires_in_minutes;
  }

  return api.post("/users/transfers", payload);
};

export const getMyTransferRequests = (params = {}) => {
  return api.get("/users/transfers", { params });
};

export const getIncomingTransferRequests = (params = {}) => {
  return api.get("/users/transfers/incoming", { params });
};

export const getTransferRequestDetail = (transferId) => {
  return api.get(`/users/transfers/${transferId}`);
};

export const respondToTransferRequest = ({
  transferId,
  action,
  payment_method = "demo",
}) => {
  const payload = {
    action,
  };

  if (action === "accept") {
    payload.payment_method = payment_method;
  }

  return api.put(`/users/transfers/${transferId}/respond`, payload);
};

export const cancelMyTransferRequest = (transferId) => {
  return api.put(`/users/transfers/${transferId}/cancel`);
};