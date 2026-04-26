import api from "./api";

// User - xem sàn
export const getMarketplaceListings = (params = {}) => {
  return api.get("/users/marketplace/listings", { params });
};

// User - xem chi tiết listing
export const getMarketplaceListingDetail = (listingId) => {
  return api.get(`/users/marketplace/listings/${listingId}`);
};

// User - đăng vé lên sàn
export const createMarketplaceListing = ({
  ticket_id,
  asking_price,
  expires_in_days = 7,
}) => {
  return api.post("/users/marketplace/listings", {
    ticket_id,
    asking_price,
    expires_in_days,
  });
};

// User - mua vé trên sàn
export const buyMarketplaceListing = ({
  listingId,
  payment_method = "demo",
}) => {
  return api.post(`/users/marketplace/listings/${listingId}/buy`, {
    payment_method,
  });
};

// User - xem vé mình đã đăng bán
export const getMyMarketplaceListings = (params = {}) => {
  return api.get("/users/marketplace/my-listings", { params });
};

// User - hủy listing đang active
export const cancelMyMarketplaceListing = (listingId) => {
  return api.put(`/users/marketplace/listings/${listingId}/cancel`);
};

// Admin - xem toàn bộ listing
export const adminGetMarketplaceListings = (params = {}) => {
  return api.get("/admin/marketplace/listings", { params });
};

// Admin - xem chi tiết listing
export const adminGetMarketplaceListingDetail = (listingId) => {
  return api.get(`/admin/marketplace/listings/${listingId}`);
};

// Admin - duyệt giao dịch marketplace
export const adminApproveMarketplaceListing = ({
  listingId,
  admin_note = "",
}) => {
  return api.put(`/admin/marketplace/listings/${listingId}/approve`, {
    admin_note,
  });
};

// Admin - từ chối giao dịch marketplace
export const adminRejectMarketplaceListing = ({
  listingId,
  admin_note = "",
}) => {
  return api.put(`/admin/marketplace/listings/${listingId}/reject`, {
    admin_note,
  });
};