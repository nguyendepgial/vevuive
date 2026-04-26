import api from "./api";

export const adminGetTickets = (params = {}) => {
  return api.get("/admin/manage/tickets", { params });
};

export const adminGetTicketDetail = (ticketId) => {
  return api.get(`/admin/manage/tickets/${ticketId}`);
};

export const adminUpdateTicketStatus = ({
  ticketId,
  ticket_status,
  mint_status,
}) => {
  return api.put(`/admin/manage/tickets/${ticketId}/status`, {
    ticket_status,
    mint_status,
  });
};