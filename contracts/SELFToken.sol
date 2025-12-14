// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SELFToken
 * @notice SELF Token - ERC20 token with fixed supply
 * @dev Total supply: 500 million SELF tokens
 * 
 * @custom:oz-version Compatible with OpenZeppelin Contracts v4.x
 *                    If upgrading to OZ v5.x, update constructor to:
 *                    `constructor() ERC20("SELF Token", "SELF") Ownable(msg.sender)`
 * @custom:security-contact security@self.app
 */
contract SELFToken is ERC20, Ownable {
    /**
     * @notice Deploy SELF token with fixed supply
     * @dev Mints entire supply to deployer. No additional minting capability.
     *      Uses OpenZeppelin v4.x Ownable (msg.sender is implicitly owner).
     */
    constructor() ERC20("SELF Token", "SELF") {
        // Mint 500 million tokens to the deployer
        _mint(msg.sender, 500_000_000 * 10 ** decimals());
    }
    
    /**
     * @notice Returns token decimals
     * @return uint8 Number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}