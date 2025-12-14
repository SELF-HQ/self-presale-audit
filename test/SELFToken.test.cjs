const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SELFToken", function () {
  let selfToken;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const SELFToken = await ethers.getContractFactory("SELFToken");
    selfToken = await SELFToken.deploy();
  });

  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      expect(await selfToken.name()).to.equal("SELF Token");
      expect(await selfToken.symbol()).to.equal("SELF");
    });

    it("Should have 18 decimals", async function () {
      expect(await selfToken.decimals()).to.equal(18n);
    });

    it("Should mint total supply to deployer", async function () {
      const totalSupply = ethers.parseEther("500000000"); // 500M
      expect(await selfToken.totalSupply()).to.equal(totalSupply);
      expect(await selfToken.balanceOf(owner.address)).to.equal(totalSupply);
    });

    it("Should set deployer as owner", async function () {
      expect(await selfToken.owner()).to.equal(owner.address);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("1000");
      await selfToken.transfer(user1.address, amount);
      
      expect(await selfToken.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialBalance = await selfToken.balanceOf(user1.address);
      
      await expect(
        selfToken.connect(user1).transfer(user2.address, ethers.parseEther("1"))
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should update balances after transfers", async function () {
      const amount = ethers.parseEther("1000");
      
      const initialOwnerBalance = await selfToken.balanceOf(owner.address);
      
      await selfToken.transfer(user1.address, amount);
      await selfToken.transfer(user2.address, amount);
      
      const finalOwnerBalance = await selfToken.balanceOf(owner.address);
      
      expect(finalOwnerBalance).to.equal(initialOwnerBalance - (amount * 2n));
      expect(await selfToken.balanceOf(user1.address)).to.equal(amount);
      expect(await selfToken.balanceOf(user2.address)).to.equal(amount);
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      await selfToken.transferOwnership(user1.address);
      expect(await selfToken.owner()).to.equal(user1.address);
    });

    it("Should reject ownership transfer from non-owner", async function () {
      await expect(
        selfToken.connect(user1).transferOwnership(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow renouncing ownership", async function () {
      await selfToken.renounceOwnership();
      
      expect(await selfToken.owner()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Allowances", function () {
    it("Should approve tokens for delegated transfer", async function () {
      const amount = ethers.parseEther("1000");
      
      await selfToken.approve(user1.address, amount);
      
      expect(await selfToken.allowance(owner.address, user1.address)).to.equal(amount);
    });

    it("Should allow delegated transfer", async function () {
      const amount = ethers.parseEther("1000");
      
      await selfToken.approve(user1.address, amount);
      await selfToken.connect(user1).transferFrom(owner.address, user2.address, amount);
      
      expect(await selfToken.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should fail delegated transfer without allowance", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        selfToken.connect(user1).transferFrom(owner.address, user2.address, amount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should decrease allowance after delegated transfer", async function () {
      const amount = ethers.parseEther("1000");
      const transferAmount = ethers.parseEther("300");
      
      await selfToken.approve(user1.address, amount);
      await selfToken.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
      
      expect(await selfToken.allowance(owner.address, user1.address))
        .to.equal(amount - transferAmount);
    });
  });
});

