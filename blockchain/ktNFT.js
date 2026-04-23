const { ethers } = require("ethers");
require("dotenv").config();

const CONTRACT_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)"
];

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BLOCKCHAIN_RPC_URL
  );

  const contract = new ethers.Contract(
    "0x38C99df26A06Ab4dA9d0A00570F06b3c5938fCF8",
    CONTRACT_ABI,
    provider
  );

  const tokenId = 1;
  const owner = await contract.ownerOf(tokenId);

  console.log("Owner of token", tokenId, "is:", owner);
}

main().catch(console.error);