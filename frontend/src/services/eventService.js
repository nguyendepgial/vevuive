import api from "./api";
import { getAuthHeaders } from "./authService";

export const getAllEvents = async (isAdmin = false, params = {}) => {
  const endpoint = isAdmin ? "/admin/events" : "/users/events";
  return api.get(endpoint, {
    params,
    headers: isAdmin ? getAuthHeaders() : {},
  });
};

export const getEventById = async (id, isAdmin = false) => {
  const endpoint = isAdmin ? `/admin/events/${id}` : `/users/events/${id}`;
  return api.get(endpoint, {
    headers: isAdmin ? getAuthHeaders() : {},
  });
};

export const getEventDetailWithTickets = async (id, isAdmin = false) => {
  const response = await getEventById(id, isAdmin);

  return {
    data: {
      success: response.data?.success ?? false,
      message: response.data?.message || "Lấy dữ liệu thành công",
      data: response.data?.data || null,
      meta: response.data?.meta,
    },
  };
};

export const adminCreateEvent = (data) => {
  return api.post("/admin/events", data, {
    headers: getAuthHeaders(),
  });
};

export const adminUpdateEvent = (id, data) => {
  return api.put(`/admin/events/${id}`, data, {
    headers: getAuthHeaders(),
  });
};

export const adminDeleteEvent = (id) => {
  return api.delete(`/admin/events/${id}`, {
    headers: getAuthHeaders(),
  });
};