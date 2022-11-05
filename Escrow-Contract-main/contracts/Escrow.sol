// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Helpers} from "./libraries/Helpers.sol";

contract Escrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // price of token in eth.
    uint256 public price;

    // rodo token address
    IERC20 public rodo;

    // fee that will be received on top of price. 5000 = 5%
    uint256 public feePercentage;

    // Admin address that will receive the 40% share and tokens price.
    address public admin;

    // fee receiver that will receive 10% share and fee on top of tokens price.
    address public feeReceiver;

    constructor(
        IERC20 _rodo,
        uint256 _price,
        uint256 _feePercentage,
        address _admin,
        address _feeReceiver
    ) {
        Helpers.requireNonZeroAddress(address(_rodo));
        Helpers.requireNonZeroAddress(address(_admin));
        Helpers.requireNonZeroAddress(address(_feeReceiver));
        price = _price;
        rodo = _rodo;
        feePercentage = _feePercentage;
        admin = _admin;
        feeReceiver = _feeReceiver;
    }

    function buy(uint256 _amount, address _to) public payable nonReentrant {
        uint256 balance = rodo.balanceOf(address(this));
        uint256 tokensPrice = (_amount * price) / 1e18;
        uint256 fee = (tokensPrice * feePercentage) / 1e5;
        uint256 ethRequired = tokensPrice + fee;
        require(_amount > 0, "Escrow: Amount cannot be 0");
        require(_amount <= balance / 2, "Escrow: Cannot buy more that 50%");
        require(ethRequired <= msg.value, "Escrow: low price");
        rodo.transfer(_to, _amount);
        rodo.transfer(feeReceiver, (_amount * 20) / 100);
        rodo.transfer(admin, (_amount * 80) / 100);
        payable(feeReceiver).transfer(fee);
        payable(admin).transfer(tokensPrice);
        payable(msg.sender).transfer(msg.value - ethRequired);
    }

    function availableTokens() public view returns (uint256) {
        return rodo.balanceOf(address(this)) / 2;
    }

    function requiredEth(uint256 _amount) public view returns (uint256) {
        uint256 tokensPrice = (_amount * price) / 1e18;
        uint256 fee = (tokensPrice * feePercentage) / 1e5;
        return tokensPrice + fee;
    }

    function updatePrice(uint256 _price) public onlyOwner {
        price = _price;
    }

    function updateAdmin(address _admin) public onlyOwner {
        Helpers.requireNonZeroAddress(_admin);
        admin = _admin;
    }

    function updateFeeReceiver(address _feeReceiver) public onlyOwner {
        Helpers.requireNonZeroAddress(_feeReceiver);
        feeReceiver = _feeReceiver;
    }

    function updateFeePercentage(uint256 _feePercentage) public onlyOwner {
        feePercentage = _feePercentage;
    }

    function updateRodo(IERC20 _rodo) public onlyOwner {
        Helpers.requireNonZeroAddress(address(_rodo));
        rodo = _rodo;
    }

    function withdrawToken(IERC20 _token, uint256 _amount) public onlyOwner {
        _token.transfer(owner(), _amount);
    }
}
