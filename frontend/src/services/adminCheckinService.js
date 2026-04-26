import api from "./api";

export const adminLookupTicketForCheckin = (code) => {
  return api.get("/admin/checkin/lookup", {
    params: {
      code,
    },
  });
};

export const adminCheckinTicket = ({
  code,
  checkin_method = "manual",
}) => {
  return api.post("/admin/checkin", {
    code,
    checkin_method,
  });
};

export const adminGetCheckinLogs = (params = {}) => {
  return api.get("/admin/checkin/logs", { params });
};