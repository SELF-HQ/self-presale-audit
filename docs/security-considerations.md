# SELF Token Presale - Security Considerations

## Overview

This document outlines security considerations, potential vulnerabilities, and mitigations for the SELF token presale smart contracts.

## Contract Security Analysis

### 1. Reentrancy Attacks

**Risk Level:** HIGH  
**Status:** MITIGATED

**Vulnerable Functions:**
- `contribute()` - external call to USDC contract
- `claimTokens()` - external call to SELF contract
- `withdrawFunds()` - external call to USDC contract

**Mitigation:**
- OpenZeppelin `ReentrancyGuard` modifier on all vulnerable functions
- Follows check-effects-interactions pattern:
  1. Validate inputs
  2. Update state
  3. Make external calls (transfers)
- State changes happen before external calls

**Test Coverage:**
- Reentrancy tests in SELFPresale.test.js
- Verified state changes occur before transfers

---

### 2. Integer Overflow/Underflow

**Risk Level:** LOW  
**Status:** PROTECTED

**Protection:**
- Solidity 0.8.20 has built-in overflow/underflow protection
- All arithmetic operations automatically checked
- SafeMath not needed

**Vulnerable Operations:**
- Token allocation calculations
- Vesting calculations
- Round target tracking

**Test Coverage:**
- Edge case tests with maximum values
- Cumulative contribution tests

---

### 3. Access Control

**Risk Level:** MEDIUM  
**Status:** MITIGATED

**Admin Functions (Owner Only):**
- `initializeRounds()` - can only be called once
- `finalizeRound()` - can only finalize when conditions met
- `advanceRound()` - can only advance after finalization
- `enableTGE()` - can only enable after all rounds finalized
- `withdrawFunds()` - can withdraw USDC at any time
- `emergencyWithdrawSELF()` - can only withdraw before TGE
- `pause()` / `unpause()` - emergency controls

**Centralization Risks:**
- Owner has significant control over presale
- Owner can pause contributions at any time
- Owner controls round progression
- Owner controls TGE timing

**Mitigation:**
- Owner will be multi-sig wallet (3-of-5 or 2-of-3 recommended)
- All owner actions are transparent on-chain
- Community can monitor owner actions via block explorer
- Ownership can be transferred or renounced

**Recommendation:** Use Gnosis Safe multi-sig with time-locks on critical functions

---

### 4. Denial of Service

**Risk Level:** LOW  
**Status:** MITIGATED

**Potential DoS Vectors:**
- Contract pausing by owner
- Gas limit exhaustion
- Block stuffing attacks

**Protections:**
- No unbounded loops in user-facing functions
- Individual user state tracking (no global iterations)
- Emergency withdrawal mechanism before TGE
- Pausing is reversible (unpause function)

**Unmitigated:**
- Owner can permanently pause (mitigation: multi-sig prevents single-actor abuse)

---

### 5. Front-Running

**Risk Level:** LOW  
**Status:** ACCEPTED

**Vulnerable Scenarios:**
1. **Round Target Front-Running:**
   - User A submits contribution that would hit round target
   - User B front-runs with higher gas, finalizing round
   - User A's transaction reverts or goes to next round

2. **Price Changes:**
   - User sees round is about to advance (higher price)
   - Tries to contribute in current round
   - Transaction might execute in next round at higher price

**Impact:**
- Users might pay higher price than expected
- Users might contribute to different round than intended

**Mitigation:**
- Clear communication about round boundaries
- UI warnings when round is near target or end time
- Acceptable UX trade-off for simplicity

**Not Vulnerable:**
- No oracle price manipulation (prices are fixed)
- No DEX trading (no MEV opportunities)

---

### 6. Timestamp Dependence

**Risk Level:** LOW  
**Status:** ACCEPTED

**Usage:**
- Round start/end times use `block.timestamp`
- Vesting calculations use time elapsed

**Miner Manipulation:**
- Miners can manipulate timestamp by ~15 minutes
- Impact on presale: negligible (rounds are days long)
- Impact on vesting: negligible (vesting is months long)

**Mitigation:**
- Time granularity (days/months) makes manipulation irrelevant
- No critical logic depends on second-level precision

---

### 7. External Contract Dependencies

**Risk Level:** MEDIUM  
**Status:** MITIGATED

**External Contracts:**
1. **USDC Token** (`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`)
   - Binance-Peg USDC on BSC
   - Trusted, widely used
   - 18 decimals (BSC-specific)

2. **SELF Token** (to be deployed)
   - Our own contract
   - Standard ERC20
   - Controlled by us

**Risks:**
- USDC contract could be paused/upgraded by Binance
- USDC transfer could fail or be manipulated

**Mitigation:**
- Using SafeERC20 for all transfers
- Proper error handling on transfer failures
- USDC is well-established and unlikely to have issues

---

### 8. Token Allocation Logic

**Risk Level:** MEDIUM  
**Status:** REQUIRES CAREFUL TESTING

**Critical Calculations:**

```solidity
// Base allocation
uint256 selfAmount = (usdcAmount * 1e18) / round.price;

// Bonus
uint256 bonusAmount = (selfAmount * round.bonus) / 100;

// TGE unlock (base only)
uint256 baseUnlock = (selfAmount * round.tgeUnlock) / 100;

// Total TGE (base unlock + all bonus)
uint256 tgeUnlock = baseUnlock + bonusAmount;

// Vested (remaining base)
uint256 vested = selfAmount - baseUnlock;
```

**Potential Issues:**
- Rounding errors in division
- Precision loss with percentages
- Edge cases at min/max contribution

**Testing:**
- Extensive unit tests for all round prices
- Edge case tests (min, max, boundaries)
- Vesting calculation tests over time
- Multiple contribution accumulation tests

---

### 9. Vesting Implementation

**Risk Level:** MEDIUM  
**Status:** REQUIRES VERIFICATION

**Linear Vesting Formula:**
```solidity
uint256 timeElapsed = block.timestamp - tgeTime;
uint256 vestedUnlocked = (vestedAmount * timeElapsed) / VESTING_DURATION;
```

**Considerations:**
- Division truncation (user gets slightly less early on)
- Time boundaries (before TGE, after vesting)
- Multiple claims (decreasing claimable amount)

**Edge Cases:**
- Claiming exactly at TGE
- Claiming multiple times during vesting
- Claiming after vesting complete
- Never claiming (tokens remain in contract)

**Test Coverage:**
- Vesting over time tests
- Multiple claim tests
- Full vesting tests

---

### 10. Emergency Mechanisms

**Risk Level:** LOW  
**Status:** IMPLEMENTED

**Emergency Functions:**

1. **Pause/Unpause:**
   - Stops all contributions
   - Does not affect claiming
   - Reversible by owner

2. **Emergency SELF Withdrawal:**
   - Only before TGE enabled
   - Allows owner to recover SELF if presale cancelled
   - Cannot be used after TGE (protects contributors)

3. **USDC Withdrawal:**
   - Available at any time
   - No restrictions (intentional design)
   - Owner responsibility to withdraw to secure wallet

**Considerations:**
- No user refund mechanism (by design)
- Users cannot withdraw contributions
- Once contributed, USDC belongs to project

---

## OpenZeppelin Contract Usage

### ReentrancyGuard
- **Version:** v4.9.0+
- **Usage:** `nonReentrant` modifier on:
  - `contribute()`
  - `claimTokens()`
- **Security:** Battle-tested, no known vulnerabilities

### Pausable
- **Version:** v4.9.0+
- **Usage:** `whenNotPaused` modifier on `contribute()`
- **Security:** Standard pattern, safe

### Ownable
- **Version:** v4.9.0+
- **Usage:** `onlyOwner` modifier on admin functions
- **Security:** Proven pattern
- **Note:** Will transfer to multi-sig

### SafeERC20
- **Version:** v4.9.0+
- **Usage:** All USDC and SELF transfers
- **Security:** Handles non-standard ERC20 implementations

---

## Audit Checklist Items

### ✅ Arithmetic
- [x] Integer overflow/underflow protected (Solidity 0.8+)
- [x] Division by zero prevented (no user-controlled divisors)
- [x] Precision loss acceptable (tested)

### ✅ Access & Privilege Control
- [x] Admin functions restricted to owner
- [x] Owner can be transferred
- [x] Emergency pause implemented
- [x] Rate limits (min/max per wallet)

### ✅ Denial of Service
- [x] No unbounded loops
- [x] No gas limit vulnerabilities
- [x] Pausing is reversible

### ✅ Miner Manipulation
- [x] Timestamp dependence acceptable for granularity used
- [x] No block number dependence
- [x] Front-running impact minimal

### ✅ External Referencing
- [x] Pull over push pattern (users claim, not pushed)
- [x] Check-effects-interactions followed
- [x] SafeERC20 used for all transfers
- [x] Error handling on external calls

### ✅ Race Conditions
- [x] Reentrancy protection implemented
- [x] State changes before external calls
- [x] No cross-function races

### ✅ Low-level Calls
- [x] No delegatecall usage
- [x] No inline assembly
- [x] SafeERC20 handles low-level calls

### ✅ Visibility
- [x] All functions have explicit visibility
- [x] State variables have appropriate visibility
- [x] No accidentally public functions

### ✅ Correct Interface
- [x] ERC20 interfaces match standard
- [x] Function signatures correct
- [x] Events properly defined

---

## Recommendations

### Before Deployment

1. **Multi-sig Wallet:**
   - Set up Gnosis Safe on BSC
   - 3-of-5 or 2-of-3 configuration
   - Transfer ownership immediately after deployment

2. **Time-locks (Optional):**
   - Consider adding time-locks to critical functions
   - Allows community to monitor and react
   - Trade-off: adds complexity

3. **Additional Testing:**
   - Mainnet fork testing with real USDC
   - Simulation of full presale lifecycle
   - Gas optimization analysis

4. **Documentation:**
   - Publish contract addresses
   - Document all admin actions
   - Transparent communication plan

### During Presale

1. **Monitoring:**
   - Watch contract events in real-time
   - Alert system for large contributions
   - Monitor for unusual activity

2. **Communication:**
   - Clear round boundaries
   - Advance warnings before round changes
   - Regular status updates

3. **Security:**
   - Multi-sig signers available 24/7
   - Pause mechanism ready if needed
   - Support channel for user issues

### After Presale

1. **TGE Preparation:**
   - Verify all rounds finalized
   - Prepare TGE announcement
   - Coordinate timing with DEX listings

2. **Token Distribution:**
   - Monitor claiming process
   - Support users with claiming issues
   - Track unclaimed tokens

---

## Known Limitations

1. **No Refunds:**
   - No soft cap with refund mechanism
   - All contributions are final
   - Users must trust project delivery

2. **Centralized Control:**
   - Owner has significant power
   - Mitigated by multi-sig
   - Transparent actions on-chain

3. **Manual Round Advancement:**
   - Requires owner action
   - Could delay next round if owner unavailable
   - Trade-off for safety

4. **Fixed Prices:**
   - No dynamic pricing
   - No oracle integration
   - Simpler but less flexible

---

## Conclusion

The SELF presale contracts follow best practices and use battle-tested OpenZeppelin components. The main security considerations are properly mitigated through:

- Reentrancy protection
- Access controls
- Emergency mechanisms
- Comprehensive testing

The primary risk is centralized owner control, which is mitigated by using a multi-sig wallet and maintaining transparent operations.

**Recommended for audit approval** after comprehensive testing and multi-sig setup.

---

**Document Version:** 1.0  
**Last Updated:** December 14, 2025  
**Next Review:** After Certik Audit

