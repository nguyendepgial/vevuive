require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.BLOCKCHAIN_RPC_URL,
      accounts: [process.env.BLOCKCHAIN_PRIVATE_KEY]
    }
  }
};