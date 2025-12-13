const hre = require("hardhat");

async function main() {
  const contracts = {
    selfToken: process.env.SELF_TOKEN_ADDRESS,
    presale: process.env.PRESALE_ADDRESS
  };
  
  console.log("Verifying contracts on BscScan...\n");
  
  // Verify SELF Token
  if (contracts.selfToken) {
    console.log("Verifying SELFToken:", contracts.selfToken);
    try {
      await hre.run("verify:verify", {
        address: contracts.selfToken,
        constructorArguments: []
      });
      console.log("✅ SELFToken verified\n");
    } catch (error) {
      console.log("⚠️  SELFToken verification failed:", error.message, "\n");
    }
  }
  
  // Verify Presale
  if (contracts.presale && contracts.selfToken) {
    const USDC_ADDRESS = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // BSC Mainnet
    
    console.log("Verifying SELFPresale:", contracts.presale);
    try {
      await hre.run("verify:verify", {
        address: contracts.presale,
        constructorArguments: [
          USDC_ADDRESS,
          contracts.selfToken
        ]
      });
      console.log("✅ SELFPresale verified\n");
    } catch (error) {
      console.log("⚠️  SELFPresale verification failed:", error.message, "\n");
    }
  }
  
  console.log("=== Verification Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

