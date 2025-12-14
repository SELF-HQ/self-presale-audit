const hre = require("hardhat");

async function main() {
  // Configuration
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // BSC Mainnet USDC
  const SELF_TOKEN_ADDRESS = process.env.SELF_TOKEN_ADDRESS;
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS; // Multi-sig wallet address
  
  if (!SELF_TOKEN_ADDRESS) {
    throw new Error("SELF_TOKEN_ADDRESS environment variable not set");
  }
  
  if (!MULTISIG_ADDRESS) {
    console.warn("⚠️  MULTISIG_ADDRESS not set - using deployer as initial admin");
    console.warn("   IMPORTANT: Transfer roles to multi-sig immediately after deployment!");
  }
  
  const adminAddress = MULTISIG_ADDRESS || (await hre.ethers.getSigners())[0].address;
  
  console.log("Deploying SELFPresale to BSC...");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("SELF Token Address:", SELF_TOKEN_ADDRESS);
  console.log("Admin Address:", adminAddress);
  
  const SELFPresale = await hre.ethers.getContractFactory("SELFPresale");
  const presale = await SELFPresale.deploy(
    USDC_ADDRESS,
    SELF_TOKEN_ADDRESS,
    adminAddress
  );
  await presale.waitForDeployment();
  
  const presaleAddress = await presale.getAddress();
  console.log("✅ SELFPresale deployed to:", presaleAddress);
  
  // Wait for confirmations
  console.log("\nWaiting for block confirmations...");
  await presale.deploymentTransaction().wait(5);
  
  // Verify on BscScan
  console.log("\nVerifying contract on BscScan...");
  try {
    await hre.run("verify:verify", {
      address: presaleAddress,
      constructorArguments: [
        USDC_ADDRESS,
        SELF_TOKEN_ADDRESS,
        adminAddress
      ]
    });
    console.log("✅ Contract verified on BscScan");
  } catch (error) {
    console.log("⚠️  Verification failed:", error.message);
  }
  
  console.log("\n=== Deployment Complete ===");
  console.log("Presale Address:", presaleAddress);
  console.log("Admin Address:", adminAddress);
  console.log("\n=== NEXT STEPS ===");
  console.log("1. Transfer SELF tokens to presale contract:");
  console.log(`   Amount: 42,000,000 SELF (37.7M presale + 4.3M bonus pool)`);
  console.log(`   To: ${presaleAddress}`);
  console.log("2. Initialize rounds using initialize-rounds.js");
  if (!MULTISIG_ADDRESS) {
    console.log("3. ⚠️  CRITICAL: Grant all roles to multi-sig wallet:");
    console.log("   - DEFAULT_ADMIN_ROLE");
    console.log("   - PAUSER_ROLE");
    console.log("   - ROUND_MANAGER_ROLE");
    console.log("   - TREASURY_ROLE");
    console.log("   - TGE_ENABLER_ROLE");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

