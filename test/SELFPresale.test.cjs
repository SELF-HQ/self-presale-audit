const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SELFPresale - Comprehensive Test Suite", function () {
  let presale, selfToken, mockUSDC;
  let owner, user1, user2, user3, treasury;
  let startTimes, endTimes;

  beforeEach(async function () {
    [owner, user1, user2, user3, treasury] = await ethers.getSigners();

    // Deploy mock USDC (18 decimals for BSC)
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();

    // Deploy SELF token (500M supply)
    const SELFToken = await ethers.getContractFactory("SELFToken");
    selfToken = await SELFToken.deploy();

    // Deploy presale
    const SELFPresale = await ethers.getContractFactory("SELFPresale");
    presale = await SELFPresale.deploy(
      await mockUSDC.getAddress(),
      await selfToken.getAddress()
    );

    // Setup round times (5 rounds, each 12 days)
    const now = await time.latest();
    startTimes = [
      now + 3600,           // Round 1: 1 hour from now
      now + 3600 + 86400 * 12,
      now + 3600 + 86400 * 24,
      now + 3600 + 86400 * 36,
      now + 3600 + 86400 * 48
    ];
    endTimes = [
      now + 3600 + 86400 * 12 - 1,
      now + 3600 + 86400 * 24 - 1,
      now + 3600 + 86400 * 36 - 1,
      now + 3600 + 86400 * 48 - 1,
      now + 3600 + 86400 * 60 - 1
    ];

    // Initialize rounds
    await presale.initializeRounds(startTimes, endTimes);

    // Transfer SELF tokens to presale contract (42M = 37.7M presale + 4.3M bonus)
    const presaleAllocation = ethers.parseEther("42000000");
    await selfToken.transfer(await presale.getAddress(), presaleAllocation);

    // Mint USDC to users for testing
    await mockUSDC.mint(user1.address, ethers.parseEther("50000")); // $50k
    await mockUSDC.mint(user2.address, ethers.parseEther("50000"));
    await mockUSDC.mint(user3.address, ethers.parseEther("50000"));
  });

  describe("Deployment & Initialization", function () {
    it("Should set correct USDC and SELF addresses", async function () {
      expect(await presale.USDC()).to.equal(await mockUSDC.getAddress());
      expect(await presale.SELF()).to.equal(await selfToken.getAddress());
    });

    it("Should initialize with correct round parameters", async function () {
      const round1 = await presale.rounds(0);
      expect(round1.price).to.equal(ethers.parseEther("0.06")); // 6¢
      expect(round1.target).to.equal(ethers.parseEther("1500000")); // $1.5M
      expect(round1.tgeUnlock).to.equal(50);
      expect(round1.bonus).to.equal(15);
    });

    it("Should set owner correctly", async function () {
      expect(await presale.owner()).to.equal(owner.address);
    });

    it("Should have received SELF tokens", async function () {
      const balance = await selfToken.balanceOf(await presale.getAddress());
      expect(balance).to.equal(ethers.parseEther("42000000"));
    });

    it("Should prevent double initialization", async function () {
      await expect(
        presale.initializeRounds(startTimes, endTimes)
      ).to.be.revertedWith("Already initialized");
    });
  });

  describe("Round 1 Contributions", function () {
    beforeEach(async function () {
      // Fast forward to round 1 start
      await time.increaseTo(startTimes[0]);
    });

    it("Should accept valid contribution", async function () {
      const amount = ethers.parseEther("1000"); // $1000
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(presale.connect(user1).contribute(amount))
        .to.emit(presale, "Contribution");
      
      const contribution = await presale.contributions(user1.address);
      expect(contribution.totalUSDC).to.equal(amount);
    });

    it("Should calculate correct SELF allocation for Round 1", async function () {
      const usdcAmount = ethers.parseEther("1000"); // $1000
      await mockUSDC.connect(user1).approve(await presale.getAddress(), usdcAmount);
      await presale.connect(user1).contribute(usdcAmount);
      
      // Round 1: 6¢ = 0.06 USDC per SELF
      // $1000 / $0.06 = 16,666.67 SELF
      // Bonus: 15% = 2,500 SELF
      // Total: 19,166.67 SELF
      const contribution = await presale.contributions(user1.address);
      const expectedBase = ethers.parseEther("16666.666666666666666666");
      const expectedBonus = expectedBase * 15n / 100n;
      const expectedTotal = expectedBase + expectedBonus;
      
      expect(contribution.totalSELF).to.be.closeTo(expectedTotal, ethers.parseEther("0.1"));
    });

    it("Should calculate correct TGE unlock (50% + bonus)", async function () {
      const usdcAmount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), usdcAmount);
      await presale.connect(user1).contribute(usdcAmount);
      
      const contribution = await presale.contributions(user1.address);
      const baseAmount = ethers.parseEther("16666.666666666666666666");
      const bonusAmount = baseAmount * 15n / 100n;
      const expectedTgeUnlock = baseAmount * 50n / 100n + bonusAmount;
      
      expect(contribution.tgeUnlockAmount).to.be.closeTo(expectedTgeUnlock, ethers.parseEther("0.1"));
    });

    it("Should reject contributions below minimum ($100)", async function () {
      const amount = ethers.parseEther("99"); // $99
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.be.revertedWith("Below minimum");
    });

    it("Should reject contributions above maximum ($10k)", async function () {
      const amount = ethers.parseEther("10001"); // $10,001
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.be.revertedWith("Exceeds maximum");
    });

    it("Should reject contributions before round starts", async function () {
      // Deploy a fresh presale contract for this test to control timing
      const MockUSDC2 = await ethers.getContractFactory("MockUSDC");
      const mockUSDC2 = await MockUSDC2.deploy();
      
      const SELFToken2 = await ethers.getContractFactory("SELFToken");
      const selfToken2 = await SELFToken2.deploy();
      
      const SELFPresale2 = await ethers.getContractFactory("SELFPresale");
      const presale2 = await SELFPresale2.deploy(
        await mockUSDC2.getAddress(),
        await selfToken2.getAddress()
      );
      
      // Set rounds that start in the future
      const now = await time.latest();
      const futureStart = now + 7200; // 2 hours from now
      const futureStartTimes = [
        futureStart,
        futureStart + 86400 * 12,
        futureStart + 86400 * 24,
        futureStart + 86400 * 36,
        futureStart + 86400 * 48
      ];
      const futureEndTimes = [
        futureStart + 86400 * 12 - 1,
        futureStart + 86400 * 24 - 1,
        futureStart + 86400 * 36 - 1,
        futureStart + 86400 * 48 - 1,
        futureStart + 86400 * 60 - 1
      ];
      
      await presale2.initializeRounds(futureStartTimes, futureEndTimes);
      
      const amount = ethers.parseEther("1000");
      await mockUSDC2.mint(user1.address, amount);
      await mockUSDC2.connect(user1).approve(await presale2.getAddress(), amount);
      
      // Try to contribute before round starts
      await expect(
        presale2.connect(user1).contribute(amount)
      ).to.be.revertedWith("Round not started");
    });

    it("Should enforce maximum contribution per wallet", async function () {
      const amount1 = ethers.parseEther("8000"); // $8k
      const amount2 = ethers.parseEther("3000"); // $3k (total $11k)
      
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount1 + (amount2));
      await presale.connect(user1).contribute(amount1);
      
      await expect(
        presale.connect(user1).contribute(amount2)
      ).to.be.revertedWith("Exceeds maximum");
    });

    it("Should track multiple contributors", async function () {
      const amount = ethers.parseEther("1000");
      
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await mockUSDC.connect(user2).approve(await presale.getAddress(), amount);
      
      await presale.connect(user1).contribute(amount);
      await presale.connect(user2).contribute(amount);
      
      expect(await presale.totalParticipants()).to.equal(2);
    });

    it("Should update round raised amount", async function () {
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
      
      const round1 = await presale.rounds(0);
      expect(round1.raised).to.equal(amount);
    });

    it("Should auto-finalize when target reached", async function () {
      // Contribute close to target ($1.5M)
      const amount = ethers.parseEther("10000"); // $10k per user
      
      for (let i = 0; i < 150; i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await owner.sendTransaction({ to: wallet.address, value: ethers.parseEther("1") });
        await mockUSDC.mint(wallet.address, amount);
        await mockUSDC.connect(wallet).approve(await presale.getAddress(), amount);
        await presale.connect(wallet).contribute(amount);
      }
      
      const round1 = await presale.rounds(0);
      expect(round1.finalized).to.be.true;
    });
  });

  describe("Multi-Round Flow", function () {
    let freshPresale, freshSelfToken, freshMockUSDC;
    let freshStartTimes, freshEndTimes;
    
    beforeEach(async function () {
      // Deploy fresh contracts for multi-round testing
      const MockUSDC = await ethers.getContractFactory("MockUSDC");
      freshMockUSDC = await MockUSDC.deploy();

      const SELFToken = await ethers.getContractFactory("SELFToken");
      freshSelfToken = await SELFToken.deploy();

      const SELFPresale = await ethers.getContractFactory("SELFPresale");
      freshPresale = await SELFPresale.deploy(
        await freshMockUSDC.getAddress(),
        await freshSelfToken.getAddress()
      );

      // Setup fresh round times - add large offset to avoid conflicts
      const now = await time.latest();
      const offset = now + 86400 * 365; // Start 1 year in future to avoid time conflicts
      freshStartTimes = [
        offset + 3600,
        offset + 3600 + 86400 * 12,
        offset + 3600 + 86400 * 24,
        offset + 3600 + 86400 * 36,
        offset + 3600 + 86400 * 48
      ];
      freshEndTimes = [
        offset + 3600 + 86400 * 12 - 1,
        offset + 3600 + 86400 * 24 - 1,
        offset + 3600 + 86400 * 36 - 1,
        offset + 3600 + 86400 * 48 - 1,
        offset + 3600 + 86400 * 60 - 1
      ];

      await freshPresale.initializeRounds(freshStartTimes, freshEndTimes);
      
      const presaleAllocation = ethers.parseEther("42000000");
      await freshSelfToken.transfer(await freshPresale.getAddress(), presaleAllocation);

      await freshMockUSDC.mint(user1.address, ethers.parseEther("50000"));
      await freshMockUSDC.mint(user2.address, ethers.parseEther("50000"));
    });
    
    it("Should advance through all 5 rounds", async function () {
      // Round 1
      let currentTime = await time.latest();
      let timeToIncrease = Number(freshStartTimes[0] - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      const amount1 = ethers.parseEther("1000");
      await freshMockUSDC.connect(user1).approve(await freshPresale.getAddress(), amount1);
      await freshPresale.connect(user1).contribute(amount1);
      
      currentTime = await time.latest();
      timeToIncrease = Number(freshEndTimes[0] + 1 - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      await freshPresale.finalizeRound();
      await freshPresale.advanceRound();
      
      expect(await freshPresale.currentRound()).to.equal(1);
      
      // Round 2
      currentTime = await time.latest();
      timeToIncrease = Number(freshStartTimes[1] - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      const amount2 = ethers.parseEther("1000");
      await freshMockUSDC.connect(user2).approve(await freshPresale.getAddress(), amount2);
      await freshPresale.connect(user2).contribute(amount2);
      
      const round2 = await freshPresale.rounds(1);
      expect(round2.raised).to.equal(amount2);
    });

    it("Should apply different prices per round", async function () {
      const amount = ethers.parseEther("1000");
      
      // Round 1: 6¢
      let currentTime = await time.latest();
      let timeToIncrease = Number(freshStartTimes[0] - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      await freshMockUSDC.connect(user1).approve(await freshPresale.getAddress(), amount);
      await freshPresale.connect(user1).contribute(amount);
      
      currentTime = await time.latest();
      timeToIncrease = Number(freshEndTimes[0] + 1 - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      await freshPresale.finalizeRound();
      await freshPresale.advanceRound();
      
      // Round 2: 7¢
      currentTime = await time.latest();
      timeToIncrease = Number(freshStartTimes[1] - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      await freshMockUSDC.connect(user2).approve(await freshPresale.getAddress(), amount);
      await freshPresale.connect(user2).contribute(amount);
      
      const user1Contrib = await freshPresale.contributions(user1.address);
      const user2Contrib = await freshPresale.contributions(user2.address);
      
      // User1 should have more SELF (lower price)
      expect(user1Contrib.totalSELF > user2Contrib.totalSELF).to.be.true;
    });

    it("Should apply declining bonuses", async function () {
      const amount = ethers.parseEther("1000");
      
      // Round 1: 15% bonus
      let currentTime = await time.latest();
      let timeToIncrease = Number(freshStartTimes[0] - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      await freshMockUSDC.connect(user1).approve(await freshPresale.getAddress(), amount);
      await freshPresale.connect(user1).contribute(amount);
      
      currentTime = await time.latest();
      timeToIncrease = Number(freshEndTimes[0] + 1 - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      await freshPresale.finalizeRound();
      await freshPresale.advanceRound();
      
      // Round 2: 12% bonus
      currentTime = await time.latest();
      timeToIncrease = Number(freshStartTimes[1] - currentTime);
      if (timeToIncrease > 0) {
        await time.increase(timeToIncrease);
      }
      await freshMockUSDC.connect(user2).approve(await freshPresale.getAddress(), amount);
      await freshPresale.connect(user2).contribute(amount);
      
      const user1Contrib = await freshPresale.contributions(user1.address);
      const user2Contrib = await freshPresale.contributions(user2.address);
      
      // User1 should have higher bonus
      expect(user1Contrib.totalBonus > user2Contrib.totalBonus).to.be.true;
    });
  });

  describe("TGE and Claiming", function () {
    beforeEach(async function () {
      // Make contributions in round 1
      await time.increaseTo(startTimes[0]);
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
      
      // Finalize all rounds
      await time.increaseTo(endTimes[0] + 1);
      await presale.finalizeRound();
      await presale.advanceRound();
      
      await time.increaseTo(endTimes[1] + 1);
      await presale.finalizeRound();
      await presale.advanceRound();
      
      await time.increaseTo(endTimes[2] + 1);
      await presale.finalizeRound();
      await presale.advanceRound();
      
      await time.increaseTo(endTimes[3] + 1);
      await presale.finalizeRound();
      await presale.advanceRound();
      
      await time.increaseTo(endTimes[4] + 1);
      await presale.finalizeRound();
    });

    it("Should enable TGE after all rounds finalized", async function () {
      const tgeTime = (await time.latest()) + 86400; // 1 day from now
      await presale.enableTGE(tgeTime);
      
      expect(await presale.tgeEnabled()).to.be.true;
      expect(await presale.tgeTime()).to.equal(BigInt(tgeTime));
    });

    it("Should allow claiming at TGE", async function () {
      const tgeTime = (await time.latest()) + 86400;
      await presale.enableTGE(tgeTime);
      await time.increaseTo(tgeTime);
      
      await presale.connect(user1).claimTokens();
      
      const contribution = await presale.contributions(user1.address);
      expect(contribution.claimed).to.be > (0);
    });

    it("Should unlock correct amount at TGE (50% + bonus)", async function () {
      const tgeTime = (await time.latest()) + 86400;
      await presale.enableTGE(tgeTime);
      await time.increaseTo(tgeTime);
      
      const claimable = await presale.getClaimableAmount(user1.address);
      const contribution = await presale.contributions(user1.address);
      
      // Should be able to claim TGE unlock amount
      expect(claimable).to.equal(contribution.tgeUnlockAmount);
    });

    it("Should vest remaining linearly over 10 months", async function () {
      const tgeTime = (await time.latest()) + 86400;
      await presale.enableTGE(tgeTime);
      await time.increaseTo(tgeTime);
      
      const contribution = await presale.contributions(user1.address);
      const claimableAtTGE = await presale.getClaimableAmount(user1.address);
      
      // Fast forward 5 months (50% of vesting)
      await time.increase(5 * 30 * 86400);
      const claimableAt5Months = await presale.getClaimableAmount(user1.address);
      
      // Should have TGE unlock + 50% of vested
      const expectedMidVest = contribution.tgeUnlockAmount + (
        contribution.vestedAmount * 50n / 100n
      );
      
      expect(claimableAt5Months).to.be.closeTo(expectedMidVest, ethers.parseEther("0.1"));
    });

    it("Should unlock all after vesting complete", async function () {
      const tgeTime = (await time.latest()) + 86400;
      await presale.enableTGE(tgeTime);
      await time.increaseTo(tgeTime);
      
      // Fast forward 10 months
      await time.increase(10 * 30 * 86400);
      
      const contribution = await presale.contributions(user1.address);
      const claimable = await presale.getClaimableAmount(user1.address);
      
      // Should be able to claim everything
      expect(claimable).to.equal(contribution.totalSELF);
    });

    it("Should prevent double claiming", async function () {
      const tgeTime = (await time.latest()) + 86400;
      await presale.enableTGE(tgeTime);
      
      // Fast forward past vesting period to unlock everything
      await time.increaseTo(tgeTime + 10 * 30 * 86400 + 1);
      
      // Claim all tokens
      await presale.connect(user1).claimTokens();
      
      // Try to claim again - should fail
      await expect(
        presale.connect(user1).claimTokens()
      ).to.be.revertedWith("Nothing to claim");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to finalize round", async function () {
      await time.increaseTo(startTimes[0]);
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
      
      await time.increaseTo(endTimes[0] + 1);
      await presale.finalizeRound();
      
      const round1 = await presale.rounds(0);
      expect(round1.finalized).to.be.true;
    });

    it("Should reject finalization before round ends", async function () {
      await time.increaseTo(startTimes[0]);
      
      await expect(
        presale.finalizeRound()
      ).to.be.revertedWith("Round not complete");
    });

    it("Should allow owner to withdraw USDC", async function () {
      await time.increaseTo(startTimes[0]);
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
      
      const balanceBefore = await mockUSDC.balanceOf(owner.address);
      await presale.withdrawFunds();
      const balanceAfter = await mockUSDC.balanceOf(owner.address);
      
      expect(balanceAfter - (balanceBefore)).to.equal(amount);
    });

    it("Should reject non-owner withdraw", async function () {
      await expect(
        presale.connect(user1).withdrawFunds()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to pause", async function () {
      await presale.pause();
      expect(await presale.paused()).to.be.true;
    });

    it("Should reject contributions when paused", async function () {
      await time.increaseTo(startTimes[0]);
      await presale.pause();
      
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to transfer ownership", async function () {
      await presale.transferOwnership(treasury.address);
      expect(await presale.owner()).to.equal(treasury.address);
    });
  });

  describe("Security & Edge Cases", function () {
    it("Should protect against reentrancy", async function () {
      // SafeERC20 and ReentrancyGuard protect against this
      await time.increaseTo(startTimes[0]);
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      // Normal contribution should work
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.not.be.reverted;
    });

    it("Should handle exact target contribution", async function () {
      await time.increaseTo(startTimes[0]);
      
      // Contribute exactly to target
      const target = ethers.parseEther("1500000"); // $1.5M
      const perUser = ethers.parseEther("10000"); // $10k
      const usersNeeded = 150;
      
      for (let i = 0; i < usersNeeded; i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await owner.sendTransaction({ to: wallet.address, value: ethers.parseEther("1") });
        await mockUSDC.mint(wallet.address, perUser);
        await mockUSDC.connect(wallet).approve(await presale.getAddress(), perUser);
        await presale.connect(wallet).contribute(perUser);
      }
      
      const round1 = await presale.rounds(0);
      expect(round1.raised).to.equal(target);
      expect(round1.finalized).to.be.true;
    });

    it("Should reject contributions exceeding target", async function () {
      await time.increaseTo(startTimes[0]);
      
      // Fill to near target using multiple wallets (respecting $10k max per wallet)
      const amountPerWallet = ethers.parseEther("10000"); // $10k max
      const walletsNeeded = 149; // 149 * $10k = $1,490,000
      
      for (let i = 0; i < walletsNeeded; i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await owner.sendTransaction({ to: wallet.address, value: ethers.parseEther("1") });
        await mockUSDC.mint(wallet.address, amountPerWallet);
        await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
        await presale.connect(wallet).contribute(amountPerWallet);
      }
      
      // Now we're at $1,490,000. Target is $1,500,000. Try to add $10k + $1
      const justRight = ethers.parseEther("10000");
      await mockUSDC.mint(user1.address, justRight);
      await mockUSDC.connect(user1).approve(await presale.getAddress(), justRight);
      await presale.connect(user1).contribute(justRight); // This should work ($1,500,000 exactly)
      
      // Now target is reached, try to add more
      const excess = ethers.parseEther("1000");
      await mockUSDC.mint(user2.address, excess);
      await mockUSDC.connect(user2).approve(await presale.getAddress(), excess);
      
      await expect(
        presale.connect(user2).contribute(excess)
      ).to.be.revertedWith("Round finalized");
    });

    it("Should handle zero contribution", async function () {
      await time.increaseTo(startTimes[0]);
      
      await expect(
        presale.connect(user1).contribute(0)
      ).to.be.revertedWith("Below minimum");
    });
  });
});

