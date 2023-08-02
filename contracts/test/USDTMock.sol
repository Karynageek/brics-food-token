// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDTMock is ERC20 {
    constructor() ERC20("USDT Mock", "USDTM") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}