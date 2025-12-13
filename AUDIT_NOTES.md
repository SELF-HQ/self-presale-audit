# Critical Notes for Auditors

## ⚠️ BSC USDC Decimal Difference

**CRITICAL: BSC USDC uses 18 decimals, NOT 6 decimals like Ethereum USDC**

### Background

On Ethereum mainnet, USDC uses 6 decimals. However, on Binance Smart Chain (BSC), the **Binance-Peg USDC** token uses **18 decimals**.

**Official BSC USDC Address:**
`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

Verify on BscScan: https://bscscan.com/token/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d

### Impact on Contract

All calculations in `SELFPresale.sol` are based on 18-decimal USDC:

```solidity
// Price constants (18 decimals for BSC USDC)
uint256 constant PRICE_ROUND_1 = 0.06 * 1e18;  // $0.06 per token
uint256 constant PRICE_ROUND_2 = 0.07 * 1e18;  // $0.07 per token
// etc.

// Contribution limits (18 decimals)
uint256 public constant MIN_CONTRIBUTION = 100 * 1e18;      // $100 minimum
uint256 public constant MAX_CONTRIBUTION = 10_000 * 1e18;   // $10,000 maximum

// Caps (18 decimals)
uint256 public constant SOFT_CAP = 500_000 * 1e18;          // $500k
uint256 public constant HARD_CAP = 2_500_000 * 1e18;        // $2.5M
```

### Why This Matters for Audit

If auditors assume 6 decimals (Ethereum standard), the following will appear incorrect:

1. **Price calculations** - Will seem 12 orders of magnitude off
2. **Contribution limits** - Will appear to allow tiny contributions
3. **Token distribution** - Math will seem incorrect

### Verification

To verify BSC USDC uses 18 decimals:

```javascript
// On BSC mainnet
const USDC = await ethers.getContractAt("IERC20Metadata", "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d");
const decimals = await USDC.decimals();
console.log(decimals); // Returns: 18
```

### Contract Comments

The contract explicitly documents this in multiple places:

1. **Line 14:** `@dev IMPORTANT: BSC USDC uses 18 decimals (not 6 like Ethereum USDC)`
2. **Line 25:** `uint256 price; // Price in USDC (18 decimals)`
3. **Line 41:** `uint256 public constant MIN_CONTRIBUTION = 100 * 1e18; // USDC 18 decimals on BSC`

### Testing Strategy

Our test suite uses a MockUSDC with 18 decimals (`contracts/test/MockUSDC.sol`) to accurately simulate BSC USDC behavior.

**This is not an error in the contract - this is the correct implementation for BSC.**

---

## Other Important Notes

### 1. Two-Step Deployment

The presale contract deployment is a two-step process:

1. Deploy contract with token addresses
2. Call `initializeRounds()` to set round parameters

This allows for flexibility and verification before launch.

### 2. Owner Privileges

The contract owner (deployer) has significant privileges:

- Pause/unpause the contract
- Enable TGE
- Withdraw funds after soft cap
- Emergency withdrawal if soft cap not reached

**Recommendation:** Deploy with a multi-sig wallet as owner for production.

### 3. Time-Based Logic

Round transitions and vesting are based on `block.timestamp`:

- Rounds have start/end times
- Vesting calculations use time elapsed since TGE
- Emergency withdrawal only before presale start

**Standard blockchain timing caveats apply** (miner manipulation within ~15 seconds on BSC).

### 4. No Upgradability

Contracts are not upgradeable. Any bugs discovered post-deployment require:

- Pause functionality (if available)
- New deployment
- User migration

**This is intentional** - immutability provides security guarantees.

---

## Questions for Auditors?

If you have any questions about:
- BSC USDC decimals
- Design decisions
- Expected behavior
- Test cases

Please reach out via the contact information provided. We're available for clarification throughout the audit process.

---

**Last Updated:** December 13, 2025
