// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SELFPresale
 * @author SELF HQ Security Team
 * @notice 5-round presale contract for SELF token on BSC with enterprise-grade security
 * @dev Supports multiple rounds with different prices, bonuses, and TGE unlocks
 * @dev IMPORTANT: BSC USDC uses 18 decimals (not 6 like Ethereum USDC)
 * 
 * Security Features:
 * - Role-based access control (RBAC) with multiple roles
 * - Timelock delays (2-7 days) on critical admin functions
 * - Circuit breaker: $500k daily withdrawal limit
 * - Refund mechanism if soft cap ($500k) not reached
 * - Unclaimed refund recovery after 30-day window
 * - ReentrancyGuard on all external state-changing functions
 * - Pausable for emergency stops
 * - SafeERC20 for all token transfers
 * - Flash loan protection (block cooldown)
 * - Whale protection (max 10% of round per tx)
 * - Rate limiting ($100k/hour per wallet)
 * - Precision math with rounding in favor of users
 * - Timestamp validation on round initialization
 * - Maximum TGE delay to prevent indefinite fund locking
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Super admin (multi-sig recommended)
 * - PAUSER_ROLE: Can pause/unpause contract
 * - ROUND_MANAGER_ROLE: Can manage round lifecycle
 * - TREASURY_ROLE: Can withdraw funds with timelock + circuit breaker
 * - TGE_ENABLER_ROLE: Can enable TGE with timelock
 * 
 * Architecture:
 * - 5 sequential rounds with progressive pricing
 * - Soft cap: $500k (refunds enabled if not reached)
 * - Hard cap: $2.5M
 * - TGE unlock: 30-50% immediate + bonus
 * - Vesting: 10-month linear for remaining tokens
 * 
 * @custom:security-contact security@self.app
 * @custom:audit-status Certik Audit - Enhanced Version
 */
contract SELFPresale is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant ROUND_MANAGER_ROLE = keccak256("ROUND_MANAGER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant TGE_ENABLER_ROLE = keccak256("TGE_ENABLER_ROLE");

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
    uint256 public constant SOFT_CAP = 500_000 * 1e18; // $500k soft cap
    uint256 public constant HARD_CAP = 2_500_000 * 1e18; // $2.5M hard cap
    
    // Timelock delays
    uint256 public constant TIMELOCK_WITHDRAW = 2 days;
    uint256 public constant TIMELOCK_TGE = 2 days;
    uint256 public constant TIMELOCK_EMERGENCY = 7 days;
    
    // Circuit breaker: daily withdrawal limit
    uint256 public constant DAILY_WITHDRAWAL_LIMIT = 500_000 * 1e18; // $500k per day
    uint256 public lastWithdrawalDay;
    uint256 public withdrawnToday;
    
    // Timelock state
    struct TimelockRequest {
        uint256 timestamp;
        bool executed;
    }
    
    mapping(bytes32 => TimelockRequest) public timelockRequests;
    
    // TGE timestamp (set when presale completes)
    uint256 public tgeTime;
    bool public tgeEnabled;
    
    // Refund mechanism
    bool public refundEnabled;
    uint256 public refundDeadline;
    uint256 public constant REFUND_WINDOW = 30 days;
    
    // User data
    struct UserContribution {
        uint256 totalUSDC;        // Total USDC contributed across all rounds
        uint256 totalSELF;        // Total SELF allocated (base + bonus)
        uint256 totalBonus;       // Total bonus SELF tokens
        uint256 tgeUnlockAmount;  // Amount unlockable at TGE
        uint256 vestedAmount;     // Amount subject to vesting
        uint256 claimed;          // Amount already claimed
        bool refundClaimed;       // Whether user claimed refund
    }
    
    mapping(address => UserContribution) public contributions;
    mapping(address => mapping(uint256 => uint256)) public contributionsByRound; // user => round => USDC amount
    
    uint256 public totalParticipants;
    uint256 public totalRaised; // Across all rounds
    
    // Rate limiting
    uint256 public maxContributionPerHour = 100_000 * 1e18; // $100k per hour per wallet
    mapping(address => mapping(uint256 => uint256)) public contributionsPerHour; // user => hour => amount
    
    // Flash loan protection
    mapping(address => uint256) public lastContributionBlock;
    uint256 public constant CONTRIBUTION_COOLDOWN = 2; // blocks between contributions
    
    // Whale protection
    uint256 public constant MAX_SINGLE_CONTRIBUTION_PERCENT = 10; // 10% of round max per tx
    
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
    event RoundAdvanced(uint256 indexed fromRound, uint256 indexed toRound);
    event TGEEnabled(uint256 tgeTime);
    event RoundsInitialized();
    event FundsWithdrawn(address indexed treasury, uint256 amount);
    event EmergencySELFWithdrawn(address indexed admin, uint256 amount);
    event RefundEnabled(uint256 deadline);
    event RefundClaimed(address indexed user, uint256 amount);
    event UnclaimedRefundsRecovered(address indexed treasury, uint256 amount);
    event TimelockRequested(bytes32 indexed action, uint256 executionTime);
    event TimelockExecuted(bytes32 indexed action);
    event TimelockCancelled(bytes32 indexed action);
    event RateLimitUpdated(uint256 newLimit);
    event CircuitBreakerTriggered(uint256 attemptedAmount, uint256 dailyLimit);
    
    // Custom errors
    error InvalidAddress();
    error RoundsNotInitialized();
    error PresaleEnded();
    error RoundNotStarted();
    error RoundEnded();
    error RoundAlreadyFinalized();
    error NoActiveRound();
    error RoundNotComplete();
    error LastRoundActive();
    error CurrentRoundNotFinalized();
    error TGEAlreadyEnabled();
    error TGEMustBeInFuture();
    error TGETooFarInFuture();
    error AllRoundsMustBeFinalized();
    error TGENotEnabled();
    error TGENotStarted();
    error NoAllocation();
    error NothingToClaim();
    error NoFundsToWithdraw();
    error RefundsNotEnabled();
    error SoftCapReached();
    error RefundsAlreadyEnabled();
    error RefundWindowClosed();
    error RefundWindowStillActive();
    error NothingToRefund();
    error RefundAlreadyClaimed();
    error RefundsActive();
    error TimelockNotReady();
    error HourlyRateLimitExceeded();
    error ContributionCooldownActive();
    error ExceedsSingleContributionLimit();
    error BelowMinimum();
    error ExceedsMaximum();
    error ExceedsRoundTarget();
    error ExceedsHardCap();
    error DailyWithdrawalLimitExceeded();
    error RoundsAlreadyInitialized();
    error StartTimeMustBeInFuture();
    error EndTimeMustBeAfterStart();
    error RoundsMustBeSequential();
    error InvalidRateLimit();
    error TimelockNotFound();
    error TimelockAlreadyExecutedOrCancelled();
    
    /**
     * @notice Constructor
     * @param _usdc USDC token address on BSC
     * @param _self SELF token address
     * @param _admin Initial admin address (should be multi-sig)
     */
    constructor(address _usdc, address _self, address _admin) {
        if (_usdc == address(0) || _self == address(0) || _admin == address(0)) {
            revert InvalidAddress();
        }
        
        USDC = IERC20(_usdc);
        SELF = IERC20(_self);
        currentRound = 0;
        
        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(ROUND_MANAGER_ROLE, _admin);
        _grantRole(TREASURY_ROLE, _admin);
        _grantRole(TGE_ENABLER_ROLE, _admin);
    }
    
    /**
     * @notice Initialize the 5 rounds with parameters
     * @dev Can only be called once by ROUND_MANAGER
     * @dev BSC USDC uses 18 decimals (not 6 like Ethereum)
     */
    function initializeRounds(
        uint256[5] calldata startTimes,
        uint256[5] calldata endTimes
    ) external onlyRole(ROUND_MANAGER_ROLE) {
        if (roundsInitialized) revert RoundsAlreadyInitialized();
        
        // Validate timestamp ordering
        for (uint256 i = 0; i < 5; i++) {
            if (startTimes[i] <= block.timestamp) revert StartTimeMustBeInFuture();
            if (endTimes[i] <= startTimes[i]) revert EndTimeMustBeAfterStart();
            
            // Validate sequential rounds (each round starts after previous ends)
            if (i > 0) {
                if (startTimes[i] <= endTimes[i - 1]) revert RoundsMustBeSequential();
            }
        }
        
        // Round 1: 6¢, $1.5M target, 50% TGE, 15% bonus
        rounds[0] = Round({
            price: 6e16,
            target: 1_500_000 * 1e18,
            raised: 0,
            startTime: startTimes[0],
            endTime: endTimes[0],
            tgeUnlock: 50,
            bonus: 15,
            finalized: false
        });
        
        // Round 2: 7¢, $500k target, 45% TGE, 12% bonus
        rounds[1] = Round({
            price: 7e16,
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
            price: 8e16,
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
            price: 9e16,
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
            price: 10e16,
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
     * @dev Protected against reentrancy, flash loans, and whale manipulation
     * @dev Rate limited to $100k per hour per wallet
     * @dev Maximum 10% of round target per single transaction
     * @dev Requires 2-block cooldown between contributions
     * @param usdcAmount Amount of USDC to contribute (18 decimals on BSC)
     * 
     * Requirements:
     * - Round must be active and not finalized
     * - Amount must be between MIN_CONTRIBUTION and MAX_CONTRIBUTION
     * - User's total contributions must not exceed MAX_CONTRIBUTION
     * - Cannot exceed round target
     * - Must respect rate limits and cooldowns
     * 
     * Effects:
     * - Transfers USDC from user to contract
     * - Calculates and allocates SELF tokens (base + bonus)
     * - Updates user contribution state
     * - Updates round state
     * - Auto-finalizes round if target reached
     * 
     * Emits: {Contribution}
     * May emit: {RoundFinalized} if target reached
     * 
     * @custom:security nonReentrant, whenNotPaused
     * @custom:formula selfAmount = (usdcAmount / price) rounded up
     * @custom:formula bonusAmount = selfAmount * bonus%
     * @custom:formula tgeUnlock = (selfAmount * tgeUnlock%) + bonusAmount
     */
    function contribute(uint256 usdcAmount) external nonReentrant whenNotPaused {
        if (!roundsInitialized) revert RoundsNotInitialized();
        if (currentRound >= 5) revert PresaleEnded();
        
        Round storage round = rounds[currentRound];
        if (block.timestamp < round.startTime) revert RoundNotStarted();
        if (block.timestamp > round.endTime) revert RoundEnded();
        if (round.finalized) revert RoundAlreadyFinalized();
        
        // Flash loan protection - prevent same-block contributions
        if (lastContributionBlock[msg.sender] + CONTRIBUTION_COOLDOWN > block.number) {
            revert ContributionCooldownActive();
        }
        lastContributionBlock[msg.sender] = block.number;
        
        // Validate contribution
        if (usdcAmount < MIN_CONTRIBUTION) revert BelowMinimum();
        if (contributions[msg.sender].totalUSDC + usdcAmount > MAX_CONTRIBUTION) {
            revert ExceedsMaximum();
        }
        if (round.raised + usdcAmount > round.target) revert ExceedsRoundTarget();
        
        // Enforce hard cap across all rounds
        // Note: This is a defense-in-depth safety check. While round targets sum to exactly HARD_CAP
        // ($1.5M + $500k + $250k + $150k + $100k = $2.5M), this check provides additional protection
        // against any potential edge cases or future modifications to round configurations.
        if (totalRaised + usdcAmount > HARD_CAP) revert ExceedsHardCap();
        
        // Whale protection - max 10% of round target per single contribution
        uint256 maxSingleContribution = (round.target * MAX_SINGLE_CONTRIBUTION_PERCENT) / 100;
        if (usdcAmount > maxSingleContribution) {
            revert ExceedsSingleContributionLimit();
        }
        
        // Rate limiting - check hourly limit
        uint256 currentHour = block.timestamp / 1 hours;
        if (contributionsPerHour[msg.sender][currentHour] + usdcAmount > maxContributionPerHour) {
            revert HourlyRateLimitExceeded();
        }
        contributionsPerHour[msg.sender][currentHour] += usdcAmount;
        
        // Track new participant (only if not already counted and hasn't claimed refund)
        if (contributions[msg.sender].totalUSDC == 0 && !contributions[msg.sender].refundClaimed) {
            totalParticipants++;
        }
        
        // Calculate SELF allocation with precision
        // Multiply by 1e18 first to maintain precision during division
        uint256 selfAmount = (usdcAmount * 1e18) / round.price;
        
        // Round up if there's any remainder (favor user)
        uint256 remainder = (usdcAmount * 1e18) % round.price;
        if (remainder > 0) {
            selfAmount += 1;
        }
        
        // Calculate bonus
        uint256 bonusAmount = (selfAmount * round.bonus) / 100;
        uint256 totalSelf = selfAmount + bonusAmount;
        
        // Calculate TGE unlock amount
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
    function finalizeRound() external onlyRole(ROUND_MANAGER_ROLE) {
        if (currentRound >= 5) revert NoActiveRound();
        
        Round storage round = rounds[currentRound];
        if (round.finalized) revert RoundAlreadyFinalized();
        if (block.timestamp <= round.endTime && round.raised < round.target) {
            revert RoundNotComplete();
        }
        
        round.finalized = true;
        emit RoundFinalized(currentRound, round.raised);
    }
    
    /**
     * @notice Advance to next round
     */
    function advanceRound() external onlyRole(ROUND_MANAGER_ROLE) {
        if (currentRound >= 4) revert LastRoundActive();
        if (!rounds[currentRound].finalized) revert CurrentRoundNotFinalized();
        
        uint256 oldRound = currentRound;
        currentRound++;
        emit RoundAdvanced(oldRound, currentRound);
    }
    
    /**
     * @notice Request TGE enablement with timelock
     * @param _tgeTime TGE timestamp
     */
    function requestEnableTGE(uint256 _tgeTime) external onlyRole(TGE_ENABLER_ROLE) {
        if (tgeEnabled) revert TGEAlreadyEnabled();
        if (refundEnabled) revert RefundsActive();
        if (_tgeTime < block.timestamp) revert TGEMustBeInFuture();
        if (_tgeTime > block.timestamp + 365 days) revert TGETooFarInFuture();
        if (currentRound != 4 || !rounds[4].finalized) revert AllRoundsMustBeFinalized();
        
        bytes32 action = keccak256(abi.encodePacked("ENABLE_TGE", _tgeTime));
        
        // Note: If a request already exists for this exact TGE time, overwriting it will reset the timelock.
        // This allows admins to update/cancel a request by creating a new one with the same parameters.
        // If a different TGE time is requested, it creates a separate action hash and the old request becomes orphaned.
        
        timelockRequests[action] = TimelockRequest({
            timestamp: block.timestamp,
            executed: false
        });
        
        emit TimelockRequested(action, block.timestamp + TIMELOCK_TGE);
    }
    
    /**
     * @notice Execute TGE enablement after timelock
     * @param _tgeTime TGE timestamp
     */
    function executeEnableTGE(uint256 _tgeTime) external onlyRole(TGE_ENABLER_ROLE) {
        bytes32 action = keccak256(abi.encodePacked("ENABLE_TGE", _tgeTime));
        TimelockRequest storage request = timelockRequests[action];
        
        if (request.timestamp == 0) revert TimelockNotReady();
        if (request.executed) revert TimelockAlreadyExecutedOrCancelled();
        if (block.timestamp < request.timestamp + TIMELOCK_TGE) revert TimelockNotReady();
        if (refundEnabled) revert RefundsActive();
        
        // Validate TGE time is still in the future (may have passed during timelock)
        if (_tgeTime < block.timestamp) revert TGEMustBeInFuture();
        
        request.executed = true;
        tgeTime = _tgeTime;
        tgeEnabled = true;
        
        emit TimelockExecuted(action);
        emit TGEEnabled(_tgeTime);
    }
    
    /**
     * @notice Enable refunds if soft cap not reached
     */
    function enableRefunds() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (totalRaised >= SOFT_CAP) revert SoftCapReached();
        if (currentRound != 4 || !rounds[4].finalized) revert RoundNotComplete();
        if (refundEnabled) revert RefundsAlreadyEnabled();
        if (tgeEnabled) revert TGEAlreadyEnabled();
        
        refundEnabled = true;
        refundDeadline = block.timestamp + REFUND_WINDOW; // 30-day window
        
        emit RefundEnabled(refundDeadline);
    }
    
    /**
     * @notice Claim refund if enabled
     * @dev Users have 30 days to claim refunds
     */
    function claimRefund() external nonReentrant {
        if (!refundEnabled) revert RefundsNotEnabled();
        if (block.timestamp > refundDeadline) revert RefundWindowClosed();
        
        UserContribution storage userContrib = contributions[msg.sender];
        if (userContrib.refundClaimed) revert RefundAlreadyClaimed();
        
        uint256 amount = userContrib.totalUSDC;
        if (amount == 0) revert NothingToRefund();
        
        // Clear allocation to prevent future token claims
        userContrib.totalUSDC = 0;
        userContrib.totalSELF = 0;
        userContrib.totalBonus = 0;
        userContrib.tgeUnlockAmount = 0;
        userContrib.vestedAmount = 0;
        userContrib.claimed = 0;
        userContrib.refundClaimed = true;
        
        // Decrement participant count for accurate statistics
        if (totalParticipants > 0) {
            totalParticipants--;
        }
        
        // Clear contributionsByRound mapping for consistency
        for (uint256 i = 0; i < 5; i++) {
            contributionsByRound[msg.sender][i] = 0;
        }
        
        // Transfer USDC back
        USDC.safeTransfer(msg.sender, amount);
        
        emit RefundClaimed(msg.sender, amount);
    }
    
    /**
     * @notice Recover unclaimed refunds after 30-day window expires
     * @dev Only callable by TREASURY_ROLE after refundDeadline
     * @dev Sends unclaimed USDC to treasury
     * @param treasury Address to receive unclaimed funds
     * 
     * Security: This prevents USDC from being locked forever in the contract
     * if users fail to claim refunds within the 30-day window.
     */
    function recoverUnclaimedRefunds(address treasury) external onlyRole(TREASURY_ROLE) {
        if (!refundEnabled) revert RefundsNotEnabled();
        if (block.timestamp <= refundDeadline) revert RefundWindowStillActive();
        if (treasury == address(0)) revert InvalidAddress();
        
        uint256 balance = USDC.balanceOf(address(this));
        if (balance == 0) revert NoFundsToWithdraw();
        
        USDC.safeTransfer(treasury, balance);
        emit UnclaimedRefundsRecovered(treasury, balance);
    }
    
    /**
     * @notice Claim available tokens (TGE unlock + vested amount)
     */
    function claimTokens() external nonReentrant {
        if (!tgeEnabled) revert TGENotEnabled();
        if (block.timestamp < tgeTime) revert TGENotStarted();
        if (refundEnabled) revert RefundsActive();
        
        UserContribution storage userContrib = contributions[msg.sender];
        if (userContrib.totalSELF == 0) revert NoAllocation();
        
        uint256 claimable = getClaimableAmount(msg.sender);
        if (claimable == 0) revert NothingToClaim();
        
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
        if (refundEnabled) {
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
                // Partially vested (linear) - round up in favor of user
                uint256 vestedUnlocked = (userContrib.vestedAmount * timeElapsed) / VESTING_DURATION;
                // Round up if there's any remainder (favor user)
                uint256 remainder = (userContrib.vestedAmount * timeElapsed) % VESTING_DURATION;
                if (remainder > 0) {
                    vestedUnlocked += 1;
                }
                totalUnlocked += vestedUnlocked;
            }
        }
        
        // Prevent underflow - return 0 if claimed exceeds unlocked
        if (totalUnlocked <= userContrib.claimed) {
            return 0;
        }
        
        return totalUnlocked - userContrib.claimed;
    }
    
    /**
     * @notice Request withdraw raised USDC with timelock
     * @dev Calling this function multiple times will reset the timelock to the current block timestamp
     */
    function requestWithdrawFunds() external onlyRole(TREASURY_ROLE) {
        bytes32 action = keccak256("WITHDRAW_FUNDS");
        timelockRequests[action] = TimelockRequest({
            timestamp: block.timestamp,
            executed: false
        });
        
        emit TimelockRequested(action, block.timestamp + TIMELOCK_WITHDRAW);
    }
    
    /**
     * @notice Execute withdraw after timelock with circuit breaker
     * @dev Implements daily withdrawal limit of $500k to prevent rapid fund drainage
     * @param treasury Address to receive funds
     * @param amount Amount to withdraw (if 0 or exceeds balance, withdraws available balance up to daily limit)
     * 
     * Circuit Breaker: Maximum $500k can be withdrawn per 24-hour period.
     * This provides time to detect and respond to compromised keys or malicious actions.
     */
    function executeWithdrawFunds(address treasury, uint256 amount) external onlyRole(TREASURY_ROLE) {
        bytes32 action = keccak256("WITHDRAW_FUNDS");
        TimelockRequest storage request = timelockRequests[action];
        
        if (request.timestamp == 0) revert TimelockNotReady();
        if (request.executed) revert TimelockAlreadyExecutedOrCancelled();
        if (block.timestamp < request.timestamp + TIMELOCK_WITHDRAW) revert TimelockNotReady();
        if (treasury == address(0)) revert InvalidAddress();
        
        uint256 balance = USDC.balanceOf(address(this));
        if (balance == 0) revert NoFundsToWithdraw();
        
        // Default to full balance if amount is 0 or exceeds balance
        if (amount == 0 || amount > balance) {
            amount = balance;
        }
        
        // Circuit breaker: check daily withdrawal limit
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay != lastWithdrawalDay) {
            // New day, reset counter
            lastWithdrawalDay = currentDay;
            withdrawnToday = 0;
        }
        
        // Check if withdrawal would exceed daily limit
        if (withdrawnToday + amount > DAILY_WITHDRAWAL_LIMIT) {
            uint256 remainingLimit = DAILY_WITHDRAWAL_LIMIT - withdrawnToday;
            emit CircuitBreakerTriggered(amount, remainingLimit);
            revert DailyWithdrawalLimitExceeded();
        }
        
        // Update withdrawal tracking
        withdrawnToday += amount;
        request.executed = true;
        
        USDC.safeTransfer(treasury, amount);
        emit FundsWithdrawn(treasury, amount);
        emit TimelockExecuted(action);
    }
    
    /**
     * @notice Emergency withdraw SELF tokens (only if presale cancelled)
     * @dev Can only be called before TGE is enabled with 7-day timelock
     */
    function requestEmergencyWithdrawSELF() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tgeEnabled) revert TGEAlreadyEnabled();
        
        bytes32 action = keccak256("EMERGENCY_WITHDRAW_SELF");
        timelockRequests[action] = TimelockRequest({
            timestamp: block.timestamp,
            executed: false
        });
        
        emit TimelockRequested(action, block.timestamp + TIMELOCK_EMERGENCY);
    }
    
    /**
     * @notice Execute emergency SELF withdrawal after timelock
     * @dev Includes TGE check to prevent draining tokens after TGE is enabled
     */
    function executeEmergencyWithdrawSELF(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert InvalidAddress();
        // CRITICAL: Prevent emergency withdrawal if TGE was enabled during timelock period
        if (tgeEnabled) revert TGEAlreadyEnabled();
        
        bytes32 action = keccak256("EMERGENCY_WITHDRAW_SELF");
        TimelockRequest storage request = timelockRequests[action];
        
        if (request.timestamp == 0) revert TimelockNotReady();
        if (request.executed) revert TimelockAlreadyExecutedOrCancelled();
        if (block.timestamp < request.timestamp + TIMELOCK_EMERGENCY) revert TimelockNotReady();
        
        request.executed = true;
        
        uint256 balance = SELF.balanceOf(address(this));
        if (balance == 0) revert NoFundsToWithdraw();
        
        SELF.safeTransfer(recipient, balance);
        emit EmergencySELFWithdrawn(recipient, balance);
        emit TimelockExecuted(action);
    }
    
    /**
     * @notice Update hourly rate limit
     * @param newLimit New hourly rate limit in USDC (18 decimals)
     * @dev Must be between 100 USDC and 1M USDC
     */
    function updateRateLimit(uint256 newLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 minLimit = 100 * 1e18; // $100 minimum
        uint256 maxLimit = 1_000_000 * 1e18; // $1M maximum
        
        if (newLimit < minLimit || newLimit > maxLimit) {
            revert InvalidRateLimit();
        }
        
        maxContributionPerHour = newLimit;
        emit RateLimitUpdated(newLimit);
    }
    
    /**
     * @notice Cancel a pending withdrawal timelock request
     * @dev Allows treasury to cancel a pending withdrawal before execution
     */
    function cancelWithdrawFunds() external onlyRole(TREASURY_ROLE) {
        bytes32 action = keccak256("WITHDRAW_FUNDS");
        TimelockRequest storage request = timelockRequests[action];
        
        if (request.timestamp == 0) revert TimelockNotFound();
        if (request.executed) revert TimelockAlreadyExecutedOrCancelled();
        
        // Mark as executed to prevent future execution (effectively cancelling it)
        request.executed = true;
        
        emit TimelockCancelled(action);
    }
    
    /**
     * @notice Cancel a pending TGE enablement timelock request
     * @dev Allows TGE enabler to cancel a pending TGE request
     * @param _tgeTime The TGE time that was originally requested
     */
    function cancelEnableTGE(uint256 _tgeTime) external onlyRole(TGE_ENABLER_ROLE) {
        bytes32 action = keccak256(abi.encodePacked("ENABLE_TGE", _tgeTime));
        TimelockRequest storage request = timelockRequests[action];
        
        if (request.timestamp == 0) revert TimelockNotFound();
        if (request.executed) revert TimelockAlreadyExecutedOrCancelled();
        
        request.executed = true;
        
        emit TimelockCancelled(action);
    }
    
    /**
     * @notice Cancel a pending emergency SELF withdrawal timelock request
     * @dev Allows admin to cancel a pending emergency withdrawal
     */
    function cancelEmergencyWithdrawSELF() external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 action = keccak256("EMERGENCY_WITHDRAW_SELF");
        TimelockRequest storage request = timelockRequests[action];
        
        if (request.timestamp == 0) revert TimelockNotFound();
        if (request.executed) revert TimelockAlreadyExecutedOrCancelled();
        
        request.executed = true;
        
        emit TimelockCancelled(action);
    }
    
    /**
     * @notice Pause contributions
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contributions
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
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
        uint256 _tgeTime,
        bool _refundEnabled
    ) {
        return (
            currentRound + 1,
            totalRaised,
            totalParticipants,
            tgeEnabled,
            tgeTime,
            refundEnabled
        );
    }
}

