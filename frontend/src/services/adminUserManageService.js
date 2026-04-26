import api from "./api";

export const adminGetUsers = (params = {}) => {
  return api.get("/admin/manage/users", { params });
};

export const adminGetUserDetail = (userId) => {
  return api.get(`/admin/manage/users/${userId}`);
};

export const adminUpdateUserStatus = ({ userId, status }) => {
  return api.put(`/admin/manage/users/${userId}/status`, {
    status,
  });
};