// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SELFToken is ERC20, Ownable {
    constructor() ERC20("SELF Token", "SELF") {
        // Mint 500 million tokens to the deployer
        _mint(msg.sender, 500000000 * 10 ** decimals());
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}