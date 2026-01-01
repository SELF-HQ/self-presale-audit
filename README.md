# SELF Token Presale

Multi-round token presale with integrated vesting on Binance Smart Chain.

## Audit Scope

```
contracts/
├── SELFToken.sol         (~20 lines - Standard ERC20)
└── SELFPresale.sol        (~700 lines - Multi-round presale)
```

## Technical Overview

### SELFToken.sol
- Standard OpenZeppelin ERC20
- Fixed supply: 500,000,000 tokens
- OpenZeppelin v4.9.6

### SELFPresale.sol
- 5 sequential rounds: February 1 - March 12, 2026
- Progressive pricing: $0.06 → $0.10 per token
- Target raise: $2.5M ($500k soft cap, $2.5M hard cap)
- Contribution limits: $100 - $10,000 per wallet (cumulative)
- Vesting: 30-50% TGE unlock + linear 10-month vesting
- Payment: USDC (Binance-Peg) 18 decimals
- OpenZeppelin v4.9.6: AccessControl, ReentrancyGuard, Pausable, SafeERC20

### Security Features
- Role-based access control (5 roles)
- Timelock delays (2-7 days on critical operations)
- Circuit breaker ($500k daily withdrawal limit)
- Refund mechanism (if soft cap not met)
- Unclaimed refund recovery (after 30-day window)
- Flash loan protection (2-block cooldown)
- Whale protection (10% max per tx)
- Rate limiting ($100k/hour per wallet)
- Custom errors (gas optimized)

## BSC USDC Configuration

BSC USDC uses 18 decimals (unlike Ethereum's 6 decimals).

**Contract:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

```solidity
uint256 constant MIN_CONTRIBUTION = 100 * 1e18;      // $100
uint256 constant MAX_CONTRIBUTION = 10_000 * 1e18;   // $10,000
uint256 constant SOFT_CAP = 500_000 * 1e18;          // $500k
uint256 constant HARD_CAP = 2_500_000 * 1e18;        // $2.5M
```

## Token Distribution & Allocation

### SELF Token Supply
**Total Supply:** 500,000,000 SELF (fixed, non-mintable)

**Initial Distribution:**
- All tokens minted to multisig wallet: `0x34747FFFB47e07025b38bB7e06D92FABbc81cC20`
- Presale allocation transferred to presale contract: sufficient for all potential claims
- Remaining tokens retained by multisig for ecosystem development

**Security Measures (SEA-01):**
- 2-of-3 multisig controls all undistributed tokens
- Private key security managed via hardware wallets and geographic distribution
- Full token allocation published at: `https://docs.self.app/tokenomics`
- Team committed to implementing vesting schedules for non-presale allocations

## Governance & Security

### Multisig Wallet

All privileged contract roles and undistributed tokens are controlled by a 2-of-3 multisig wallet for security.

**Safe Multisig Address:** `0x34747FFFB47e07025b38bB7e06D92FABbc81cC20`

**Signers:**
- Signer 1: `0x0Ef1692fb24e9baFCdF599f72fBe81841E52c349`
- Signer 2: `0xD7286BB3983316FF3b2e8A27CABc976aA820Ac97`
- Signer 3: `0xF1164C0208168676DF682f7b66AFF4921ec4bF32`

**Verification:** Multisig configuration (threshold and owners) can be verified upon request via screen-share or by providing a verification script. Role assignments on the presale contract are publicly verifiable via BSCScan.

### Contract Roles Assigned to Multisig
- DEFAULT_ADMIN_ROLE
- TREASURY_ROLE
- TGE_ENABLER_ROLE
- ROUND_MANAGER_ROLE
- PAUSER_ROLE

*All privileged operations require 2-of-3 signer approval plus a timelock delay.*

### Timelock Operations (SEA-02)

All critical operations enforce mandatory timelock delays for community transparency:

| Operation | Timelock | Role Required | Guardrails |
|-----------|----------|---------------|-------------|
| Enable TGE | 2 days | TGE_ENABLER_ROLE | Requires soft cap reached, all rounds finalized |
| Withdraw USDC | 2 days | TREASURY_ROLE | Circuit breaker: $500k daily limit |
| Emergency SELF Withdrawal | 7 days | DEFAULT_ADMIN_ROLE | Blocked if any user allocations exist |
| Update Rate Limit | None | DEFAULT_ADMIN_ROLE | Bounded: $100 - $1M range |
| Pause/Unpause | None | PAUSER_ROLE | Emergency circuit breaker only |

**Monitoring Events:**
- `TimelockRequested(action, executionTime)` - Initiates countdown
- `TimelockExecuted(action)` - Confirms execution after delay
- `TimelockCancelled(action)` - Operation cancelled before execution

All events are publicly visible on BSCScan for community monitoring.

**Centralization Mitigation:**
- Short-term: Timelock + multisig combination (implemented)
- Long-term: DAO governance transition planned post-launch
- Permanent: Critical user protections enforced on-chain (solvency, soft cap)

**Published source:** `https://docs.self.app/tokenomics`

## Security Guarantees

### Hard On-Chain Invariants

The presale contract enforces critical security invariants in code, not operational policy:

#### 1. Solvency Protection
- **USDC Refunds**: Withdrawals blocked until presale succeeds (soft cap reached + ended). Refund path remains available if soft cap not met.
- **SELF Token Claims**: Contributions require sufficient SELF balance on-chain. Contract verifies `balance >= outstandingClaims + newAllocation` before accepting contributions.
- **Emergency Safeguards**: Emergency SELF withdrawals blocked once any user allocations exist.

#### 2. TGE Immutability
- Token Generation Event can only be enabled once
- Multiple layers prevent TGE time from being changed after activation:
  - Pending request check (prevents request overwrites)
  - Execution guard (prevents multiple executions)
  - Explicit cancellation required to replace pending requests

#### 3. Soft Cap Enforcement
- TGE enablement requires `totalRaised >= SOFT_CAP` (hard-checked in both request and execution)
- Refunds automatically available if soft cap not reached after presale ends
- Mutual exclusivity: TGE and refunds cannot both be active

#### 4. User Protections
- **Precision Math**: All token calculations round up in favor of users
- **Dust Handling**: Allows exact completion of rounds when remaining capacity < minimum contribution
- **Refund Accounting**: Both global (`totalRaised`) and per-round (`rounds[i].raised`) amounts decrement on refunds, maintaining accounting consistency
- **30-Day Refund Window**: Users have 30 days to claim refunds if soft cap not met

### Zero-Trust Operator Model

Even with compromised privileged keys, users remain protected:

- Cannot drain USDC before presale successfully completes
- Cannot drain SELF tokens needed for user claims
- Cannot change TGE time after activation
- Cannot bypass soft cap requirements
- Timelock delays provide transparency window (2-7 days)
- Circuit breaker limits withdrawal velocity ($500k/day)

### Transparency & Monitoring

Public view functions for external verification:

- `getExcessSELFBalance()` - Shows withdrawable excess vs. outstanding claims
- `getClaimableAmount(user)` - Shows user's vested + unlocked tokens
- `getUserContribution(user)` - Complete user allocation breakdown
- `getPresaleStats()` - Aggregate presale state

All privileged operations emit events for on-chain monitoring.

### Audit Status

**CertiK Audit:** All findings addressed (14/14)
- 2 Medium severity issues resolved with hard on-chain enforcement
- 5 Minor protocol correctness issues fixed
- 5 Design/informational improvements implemented
- 2 Centralization disclosures provided with verifiable evidence

**Post-Audit Fix (V1.4):** Per-round accounting consistency
- **Issue**: `claimRefund()` decremented `totalRaised` but did not decrement `rounds[i].raised`, causing per-round statistics to become permanently inflated after refunds
- **Resolution**: `claimRefund()` now decrements both `totalRaised` and each `rounds[i].raised` using the user's `contributionsByRound` data before clearing it
- **Invariant Maintained**: `Σ rounds[i].raised == totalRaised` holds true after refunds

**Centralization Findings:**
- **SEA-01**: Initial token distribution controlled by multisig - addressed via 2-of-3 Safe, published allocation, hardware wallet key management
- **SEA-02**: Privileged roles - mitigated via timelock delays (2-7 days), circuit breakers, multisig, and on-chain invariants

**Unsold Token Recovery (SEA-16):**

The contract implements comprehensive protection against locked tokens in both success and failure scenarios:

**Success Path (Soft Cap Reached):**
- `withdrawExcessSELF()` allows treasury to reclaim unsold tokens after TGE
- Protected: Cannot withdraw tokens needed for outstanding user claims
- Formula: `excess = balance - (totalAllocated - totalClaimed)`

**Failure Path (Soft Cap Not Reached):**
- `enableRefunds()` allows users to claim full USDC refunds
- `recoverUnclaimedRefunds()` recovers USDC after 30-day window expires
- `executeEmergencyWithdrawSELF()` recovers all SELF tokens (7-day timelock)
  - After refund deadline expires, SELF recovery is allowed even if allocations remain (users forfeited claims)

**Mutual Exclusivity:** `tgeEnabled` and `refundEnabled` cannot both be true, ensuring tokens are never permanently locked. The `withdrawExcessSELF` function correctly blocks withdrawals when refunds are active, as SELF tokens must remain available for the alternative recovery path.

**Test Coverage:** 53 passing tests, zero compiler warnings

**Deployed Contracts (BSC Mainnet):**
- SELFToken: `0xf4548acf87360DD1Fa1c3f7F868e60b423862e37` ([Verified](https://bscscan.com/address/0xf4548acf87360DD1Fa1c3f7F868e60b423862e37#code))
- SELFPresale: `0x68360D03B9B986846D86818917785ac37B800804` ([Verified](https://bscscan.com/address/0x68360D03B9B986846D86818917785ac37B800804#code))

## Testing

```bash
npm install
npx hardhat test
```

Tests cover token functionality, presale logic, vesting, and edge cases.

`contracts/test/MockUSDC.sol` is a test utility only (18-decimal USDC simulator).

## Repository Structure

```
contracts/
├── SELFToken.sol              # Audit scope
├── SELFPresale.sol            # Audit scope
└── test/MockUSDC.sol          # Test utility

test/
├── SELFToken.test.cjs
└── SELFPresale.test.cjs

scripts/
├── deploy-token.js
├── deploy-presale.js
├── initialize-rounds.js
└── verify-contracts.js

docs/
└── architecture.md
```

## Deployment

**Network:** Binance Smart Chain (BSC) Mainnet  
**USDC:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`  
**Compiler:** Solidity 0.8.20  
**Launch:** February 1, 2026

---

**Audit Ready:** December 14, 2025  
**Skyharbor Updated V1.1:** December 25, 2025  
**Skyharbor Updated V1.2:** December 30, 2025  
**SEA-16 Fix V1.3:** December 31, 2025  
**Per-Round Accounting Fix V1.4:** January 1, 2026
