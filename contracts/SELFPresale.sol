// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SELFPresale
 * @notice 5-round presale contract for SELF token on BSC
 * @dev Supports multiple rounds with different prices, bonuses, and TGE unlocks
 * @dev IMPORTANT: BSC USDC uses 18 decimals (not 6 like Ethereum USDC)
 */
contract SELFPresale is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Tokens
    IERC20 public immutable USDC;
    IERC20 public immutable SELF;
    
    // Round structure
    struct Round {
        uint256 price;        // Price in USDC (18 decimals) per SELF token (e.g., 6e16 = $0.06)
        uint256 target;       // Target raise amount in USDC (18 decimals)
        uint256 raised;       // Amount raised so far
        uint256 startTime;    // Round start timestamp
        uint256 endTime;      // Round end timestamp
        uint8 tgeUnlock;      // Percentage unlocked at TGE (e.g., 50 = 50%)
        uint8 bonus;          // Bonus percentage (e.g., 15 = 15%)
        bool finalized;       // Whether round is finalized
    }
    
    // 5 Rounds configuration
    Round[5] public rounds;
    uint256 public currentRound; // 0-4 (Round 1-5)
    bool public roundsInitialized;
    
    // Global constraints
    uint256 public constant MIN_CONTRIBUTION = 100 * 1e18; // $100 minimum (USDC 18 decimals on BSC)
    uint256 public constant MAX_CONTRIBUTION = 10_000 * 1e18; // $10,000 maximum per wallet
    uint256 public constant VESTING_DURATION = 10 * 30 days; // 10 months linear vesting
    
    // TGE timestamp (set when presale completes)
    uint256 public tgeTime;
    bool public tgeEnabled;
    
    // User data
    struct UserContribution {
        uint256 totalUSDC;        // Total USDC contributed across all rounds
        uint256 totalSELF;        // Total SELF allocated (base + bonus)
        uint256 totalBonus;       // Total bonus SELF tokens
        uint256 tgeUnlockAmount;  // Amount unlockable at TGE
        uint256 vestedAmount;     // Amount subject to vesting
        uint256 claimed;          // Amount already claimed
    }
    
    mapping(address => UserContribution) public contributions;
    mapping(address => mapping(uint256 => uint256)) public contributionsByRound; // user => round => USDC amount
    
    uint256 public totalParticipants;
    uint256 public totalRaised; // Across all rounds
    
    // Events
    event Contribution(
        address indexed user,
        uint256 indexed round,
        uint256 usdcAmount,
        uint256 selfAmount,
        uint256 bonusAmount
    );
    event TokensClaimed(address indexed user, uint256 amount);
    event RoundFinalized(uint256 indexed round, uint256 totalRaised);
    event RoundAdvanced(uint256 indexed newRound);
    event TGEEnabled(uint256 tgeTime);
    event RoundsInitialized();
    
    /**
     * @notice Constructor
     * @param _usdc USDC token address on BSC
     * @param _self SELF token address
     */
    constructor(address _usdc, address _self) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_self != address(0), "Invalid SELF address");
        
        USDC = IERC20(_usdc);
        SELF = IERC20(_self);
        currentRound = 0;
    }
    
    /**
     * @notice Initialize the 5 rounds with parameters
     * @dev Can only be called once by owner
     * @dev BSC USDC uses 18 decimals (not 6 like Ethereum)
     */
    function initializeRounds(
        uint256[5] calldata startTimes,
        uint256[5] calldata endTimes
    ) external onlyOwner {
        require(!roundsInitialized, "Already initialized");
        
        // Round 1: 6¢, $1.5M target, 50% TGE, 15% bonus
        rounds[0] = Round({
            price: 6e16,                     // $0.06 in USDC (18 decimals: 0.06 * 1e18)
            target: 1_500_000 * 1e18,        // $1.5M (18 decimals)
            raised: 0,
            startTime: startTimes[0],
            endTime: endTimes[0],
            tgeUnlock: 50,
            bonus: 15,
            finalized: false
        });
        
        // Round 2: 7¢, $500k target, 45% TGE, 12% bonus
        rounds[1] = Round({
            price: 7e16,                     // $0.07
            target: 500_000 * 1e18,
            raised: 0,
            startTime: startTimes[1],
            endTime: endTimes[1],
            tgeUnlock: 45,
            bonus: 12,
            finalized: false
        });
        
        // Round 3: 8¢, $250k target, 40% TGE, 9% bonus
        rounds[2] = Round({
            price: 8e16,                     // $0.08
            target: 250_000 * 1e18,
            raised: 0,
            startTime: startTimes[2],
            endTime: endTimes[2],
            tgeUnlock: 40,
            bonus: 9,
            finalized: false
        });
        
        // Round 4: 9¢, $150k target, 35% TGE, 6% bonus
        rounds[3] = Round({
            price: 9e16,                     // $0.09
            target: 150_000 * 1e18,
            raised: 0,
            startTime: startTimes[3],
            endTime: endTimes[3],
            tgeUnlock: 35,
            bonus: 6,
            finalized: false
        });
        
        // Round 5: 10¢, $100k target, 30% TGE, 3% bonus
        rounds[4] = Round({
            price: 10e16,                    // $0.10
            target: 100_000 * 1e18,
            raised: 0,
            startTime: startTimes[4],
            endTime: endTimes[4],
            tgeUnlock: 30,
            bonus: 3,
            finalized: false
        });
        
        roundsInitialized = true;
        emit RoundsInitialized();
    }
    
    /**
     * @notice Contribute USDC to current round
     * @param usdcAmount Amount of USDC to contribute (6 decimals)
     */
    function contribute(uint256 usdcAmount) external nonReentrant whenNotPaused {
        require(roundsInitialized, "Rounds not initialized");
        require(currentRound < 5, "Presale ended");
        
        Round storage round = rounds[currentRound];
        require(block.timestamp >= round.startTime, "Round not started");
        require(block.timestamp <= round.endTime, "Round ended");
        require(!round.finalized, "Round finalized");
        
        // Validate contribution
        require(usdcAmount >= MIN_CONTRIBUTION, "Below minimum");
        require(
            contributions[msg.sender].totalUSDC + usdcAmount <= MAX_CONTRIBUTION,
            "Exceeds maximum"
        );
        require(round.raised + usdcAmount <= round.target, "Exceeds round target");
        
        // Track new participant
        if (contributions[msg.sender].totalUSDC == 0) {
            totalParticipants++;
        }
        
        // Calculate SELF allocation
        // Both USDC and SELF have 18 decimals on BSC
        // selfAmount = (usdcAmount * 1e18) / price
        uint256 selfAmount = (usdcAmount * 1e18) / round.price;
        
        // Calculate bonus
        uint256 bonusAmount = (selfAmount * round.bonus) / 100;
        uint256 totalSelf = selfAmount + bonusAmount;
        
        // Calculate TGE unlock amount
        // TGE unlock applies to base amount only, bonus is fully unlocked at TGE
        uint256 baseUnlock = (selfAmount * round.tgeUnlock) / 100;
        uint256 tgeUnlock = baseUnlock + bonusAmount;
        uint256 vested = selfAmount - baseUnlock;
        
        // Transfer USDC from user
        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);
        
        // Update round state
        round.raised += usdcAmount;
        
        // Update user contribution
        UserContribution storage userContrib = contributions[msg.sender];
        userContrib.totalUSDC += usdcAmount;
        userContrib.totalSELF += totalSelf;
        userContrib.totalBonus += bonusAmount;
        userContrib.tgeUnlockAmount += tgeUnlock;
        userContrib.vestedAmount += vested;
        
        // Track by round
        contributionsByRound[msg.sender][currentRound] += usdcAmount;
        
        // Update global total
        totalRaised += usdcAmount;
        
        emit Contribution(msg.sender, currentRound, usdcAmount, selfAmount, bonusAmount);
        
        // Auto-finalize if target reached
        if (round.raised >= round.target) {
            round.finalized = true;
            emit RoundFinalized(currentRound, round.raised);
        }
    }
    
    /**
     * @notice Manually finalize current round (if time expired or target reached)
     */
    function finalizeRound() external onlyOwner {
        require(currentRound < 5, "No active round");
        Round storage round = rounds[currentRound];
        require(!round.finalized, "Already finalized");
        require(
            block.timestamp > round.endTime || round.raised >= round.target,
            "Round not complete"
        );
        
        round.finalized = true;
        emit RoundFinalized(currentRound, round.raised);
    }
    
    /**
     * @notice Advance to next round
     */
    function advanceRound() external onlyOwner {
        require(currentRound < 4, "Last round active");
        require(rounds[currentRound].finalized, "Current round not finalized");
        
        currentRound++;
        emit RoundAdvanced(currentRound);
    }
    
    /**
     * @notice Enable TGE and allow claiming
     * @param _tgeTime TGE timestamp
     */
    function enableTGE(uint256 _tgeTime) external onlyOwner {
        require(!tgeEnabled, "TGE already enabled");
        require(_tgeTime >= block.timestamp, "TGE time must be in future");
        require(currentRound == 4 && rounds[4].finalized, "All rounds must be finalized");
        
        tgeTime = _tgeTime;
        tgeEnabled = true;
        
        emit TGEEnabled(_tgeTime);
    }
    
    /**
     * @notice Claim available tokens (TGE unlock + vested amount)
     */
    function claimTokens() external nonReentrant {
        require(tgeEnabled, "TGE not enabled");
        require(block.timestamp >= tgeTime, "TGE not started");
        
        UserContribution storage userContrib = contributions[msg.sender];
        require(userContrib.totalSELF > 0, "No allocation");
        
        uint256 claimable = getClaimableAmount(msg.sender);
        require(claimable > 0, "Nothing to claim");
        
        userContrib.claimed += claimable;
        
        SELF.safeTransfer(msg.sender, claimable);
        
        emit TokensClaimed(msg.sender, claimable);
    }
    
    /**
     * @notice Get claimable amount for user
     * @param user User address
     * @return Claimable amount
     */
    function getClaimableAmount(address user) public view returns (uint256) {
        if (!tgeEnabled || block.timestamp < tgeTime) {
            return 0;
        }
        
        UserContribution memory userContrib = contributions[user];
        if (userContrib.totalSELF == 0) {
            return 0;
        }
        
        uint256 totalUnlocked = userContrib.tgeUnlockAmount;
        
        // Calculate vested amount if past TGE
        if (block.timestamp > tgeTime && userContrib.vestedAmount > 0) {
            uint256 timeElapsed = block.timestamp - tgeTime;
            
            if (timeElapsed >= VESTING_DURATION) {
                // Fully vested
                totalUnlocked += userContrib.vestedAmount;
            } else {
                // Partially vested (linear)
                uint256 vestedUnlocked = (userContrib.vestedAmount * timeElapsed) / VESTING_DURATION;
                totalUnlocked += vestedUnlocked;
            }
        }
        
        return totalUnlocked - userContrib.claimed;
    }
    
    /**
     * @notice Withdraw raised USDC to owner
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = USDC.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        
        USDC.safeTransfer(owner(), balance);
    }
    
    /**
     * @notice Emergency withdraw SELF tokens (only if presale cancelled)
     */
    function emergencyWithdrawSELF() external onlyOwner {
        require(!tgeEnabled, "TGE already enabled");
        
        uint256 balance = SELF.balanceOf(address(this));
        require(balance > 0, "No SELF to withdraw");
        
        SELF.safeTransfer(owner(), balance);
    }
    
    /**
     * @notice Pause contributions
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contributions
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get current round info
     */
    function getCurrentRound() external view returns (
        uint256 roundNumber,
        uint256 price,
        uint256 target,
        uint256 raised,
        uint256 startTime,
        uint256 endTime,
        uint8 tgeUnlock,
        uint8 bonus,
        bool finalized
    ) {
        if (currentRound >= 5) {
            return (5, 0, 0, 0, 0, 0, 0, 0, true);
        }
        
        Round memory round = rounds[currentRound];
        return (
            currentRound + 1,
            round.price,
            round.target,
            round.raised,
            round.startTime,
            round.endTime,
            round.tgeUnlock,
            round.bonus,
            round.finalized
        );
    }
    
    /**
     * @notice Get user contribution info
     */
    function getUserContribution(address user) external view returns (
        uint256 totalUSDC,
        uint256 totalSELF,
        uint256 totalBonus,
        uint256 tgeUnlockAmount,
        uint256 vestedAmount,
        uint256 claimed,
        uint256 claimable
    ) {
        UserContribution memory userContrib = contributions[user];
        return (
            userContrib.totalUSDC,
            userContrib.totalSELF,
            userContrib.totalBonus,
            userContrib.tgeUnlockAmount,
            userContrib.vestedAmount,
            userContrib.claimed,
            getClaimableAmount(user)
        );
    }
    
    /**
     * @notice Get total presale stats
     */
    function getPresaleStats() external view returns (
        uint256 _currentRound,
        uint256 _totalRaised,
        uint256 _totalParticipants,
        bool _tgeEnabled,
        uint256 _tgeTime
    ) {
        return (
            currentRound + 1,
            totalRaised,
            totalParticipants,
            tgeEnabled,
            tgeTime
        );
    }
}

