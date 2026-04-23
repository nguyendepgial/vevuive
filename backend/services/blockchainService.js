const { ethers } = require("ethers");
require("dotenv").config();

const CONTRACT_ABI = [
  "function mintTicket(address to, string tokenURI) returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

function normalizeAddress(address) {
  return typeof address === "string" ? address.trim().toLowerCase() : "";
}

function ensureConfig() {
  const { BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

  if (!BLOCKCHAIN_RPC_URL) {
    throw new Error("Thiếu BLOCKCHAIN_RPC_URL trong .env");
  }

  if (!BLOCKCHAIN_PRIVATE_KEY) {
    throw new Error("Thiếu BLOCKCHAIN_PRIVATE_KEY trong .env");
  }

  if (!CONTRACT_ADDRESS) {
    throw new Error("Thiếu CONTRACT_ADDRESS trong .env");
  }
}

function getProvider() {
  ensureConfig();
  return new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
}

function getSigner() {
  const provider = getProvider();
  return new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
}

function getContract() {
  const signer = getSigner();
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

async function mintTicket({ to, tokenURI = "" }) {
  if (!to) {
    throw new Error("Thiếu địa chỉ ví người nhận để mint");
  }

  const contract = getContract();
  const normalizedTo = normalizeAddress(to);

  if (!ethers.isAddress(normalizedTo)) {
    throw new Error("Địa chỉ ví người nhận không hợp lệ");
  }

  const tx = await contract.mintTicket(normalizedTo, tokenURI || "");
  const receipt = await tx.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error("Giao dịch mint thất bại");
  }

  let tokenId = null;

  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);

      if (parsed && parsed.name === "Transfer") {
        const from = normalizeAddress(parsed.args.from);
        const toAddress = normalizeAddress(parsed.args.to);

        if (
          from === normalizeAddress(ethers.ZeroAddress) &&
          toAddress === normalizedTo
        ) {
          tokenId = parsed.args.tokenId.toString();
          break;
        }
      }
    } catch (err) {
      // Bỏ qua log không parse được
    }
  }

  if (!tokenId) {
    throw new Error("Mint thành công nhưng không đọc được tokenId từ event Transfer");
  }

  return {
    txHash: receipt.hash,
    tokenId,
    contractAddress: normalizeAddress(process.env.CONTRACT_ADDRESS),
    recipient: normalizedTo,
    blockNumber: receipt.blockNumber,
  };
}

async function verifyOwnership({ tokenId, ownerAddress }) {
  if (!tokenId) {
    throw new Error("Thiếu tokenId");
  }

  if (!ownerAddress) {
    throw new Error("Thiếu ownerAddress");
  }

  const contract = getContract();
  const ownerOnChain = await contract.ownerOf(tokenId);

  return normalizeAddress(ownerOnChain) === normalizeAddress(ownerAddress);
}

async function transferTicket({ from, to, tokenId }) {
  if (!from || !to || !tokenId) {
    throw new Error("Thiếu dữ liệu chuyển NFT");
  }

  const contract = getContract();

  const normalizedFrom = normalizeAddress(from);
  const normalizedTo = normalizeAddress(to);

  if (!ethers.isAddress(normalizedFrom) || !ethers.isAddress(normalizedTo)) {
    throw new Error("Địa chỉ ví chuyển hoặc nhận không hợp lệ");
  }

  const tx = await contract.safeTransferFrom(normalizedFrom, normalizedTo, tokenId);
  const receipt = await tx.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error("Giao dịch transfer thất bại");
  }

  return {
    txHash: receipt.hash,
    tokenId: String(tokenId),
    from: normalizedFrom,
    to: normalizedTo,
    blockNumber: receipt.blockNumber,
  };
}

module.exports = {
  mintTicket,
  verifyOwnership,
  transferTicket,
};