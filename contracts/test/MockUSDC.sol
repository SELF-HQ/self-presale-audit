// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing (18 decimals like BSC USDC)
 * @dev FOR TESTING ONLY - Do not deploy to mainnet
 * @custom:security This contract has unrestricted minting capabilities.
 *                  It is intended solely for local testing and testnet deployments.
 */
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") {
        // Mint initial supply to deployer for convenience
        _mint(msg.sender, 1_000_000_000 * 1e18); // 1 billion USDC for testing
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    /**
     * @notice Mint tokens for testing
     * @dev Restricted to owner only. FOR TESTING ONLY.
     * @param to Address to receive tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

