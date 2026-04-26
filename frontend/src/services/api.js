import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  if (token && token !== "undefined" && token !== "null") {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  return {};
};

export default api;