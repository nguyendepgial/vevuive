const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const TicketNFT = await hre.ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy(deployer.address);

  await ticketNFT.deployed();

  console.log("TicketNFT deployed to:", ticketNFT.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});