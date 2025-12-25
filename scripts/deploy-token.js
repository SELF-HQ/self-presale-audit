const hre = require("hardhat");

async function main() {
  console.log("Deploying SELFToken to BSC...");
  
  const SELFToken = await hre.ethers.getContractFactory("SELFToken");
  const selfToken = await SELFToken.deploy();
  await selfToken.waitForDeployment();
  
  const tokenAddress = await selfToken.getAddress();
  console.log("✅ SELFToken deployed to:", tokenAddress);
  console.log("   Total Supply: 500,000,000 SELF");
  
  console.log("\nWaiting for block confirmations...");
  const deployTx = selfToken.deploymentTransaction();
  await deployTx.wait(5);
  
  console.log("\nVerifying contract on BscScan...");
  try {
    await hre.run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [],
      contract: "contracts/SELFToken.sol:SELFToken"
    });
    console.log("✅ Contract verified on BscScan");
  } catch (error) {
    console.log("⚠️  Verification failed:", error.message);
  }
  
  console.log("\n=== Deployment Complete ===");
  console.log("SELF Token Address:", tokenAddress);
  console.log("\nSave this address for presale deployment!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
