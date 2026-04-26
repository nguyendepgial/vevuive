import api from "./api";

export const getMyWallet = () => {
  return api.get("/users/wallet");
};

export const linkWallet = ({
  wallet_address,
  wallet_type = "metamask",
  network_name = "sepolia",
}) => {
  return api.post("/users/wallet", {
    wallet_address,
    wallet_type,
    network_name,
  });
};

export const updateMyWallet = ({
  wallet_address,
  wallet_type,
  network_name,
}) => {
  return api.put("/users/wallet", {
    wallet_address,
    wallet_type,
    network_name,
  });
};

export const deleteMyWallet = () => {
  return api.delete("/users/wallet");
};