// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract BRICSFoodToken is ERC20, ERC20Burnable, AccessControl {
    error UnsupportedPaymentToken();
    error ExceededMaxTokenSupply();
    error ZeroAddress();
    error SaleHasStopped();
    error InvalidValue();
    error InvalidPrice();
    error InvalidLimit();
    error MissingRole();
    error DataLengthsNotMatch();

    uint256 public constant MAX_TOTAL_SUPPLY = 19000000000e18;
    uint8 public constant MIN_TOKEN_PRICE = 1;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");

    uint256 public mintedCount;
    bool public saleStopped;
    address public fundingWallet;
    uint16 public price = 1;
    uint16 public priceLowerLimit;
    uint16 public priceUpperLimit;

    mapping(address => uint256) public tokenPaymentAmounts;

    event Minted(address indexed _user, uint256 _amount);
    event Bought(
        address indexed _buyer,
        uint256 _amount,
        address _paymentToken,
        uint256 _price
    );
    event SaleStopped(bool _enabled);

    /**
     * @dev Initializes the contract.
     *
     * @param name_ The name of the token.
     * @param symbol_ The symbol of the token.
     * @param tokenContractAddresses The addresses of the supported payment tokens.
     * @param paymentAmounts The corresponding payment amounts for each payment token.
     * @param fundingWallet_ The address of the funding wallet.
     * @param admin_ The address of the admin role.
     * @param minter_ The address of the minter role.
     *
     * @dev The `tokenContractAddresses` and `paymentAmounts` arrays must have the same length.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory tokenContractAddresses,
        uint256[] memory paymentAmounts,
        address fundingWallet_,
        address admin_,
        address minter_
    ) ERC20(name_, symbol_) {
        uint256 dataLength = tokenContractAddresses.length;

        if (dataLength != paymentAmounts.length) {
            revert DataLengthsNotMatch();
        }

        for (uint256 i = 0; i < dataLength; i++) {
            tokenPaymentAmounts[tokenContractAddresses[i]] = paymentAmounts[i];
        }

        fundingWallet = fundingWallet_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(MINTER_ROLE, minter_);
    }

    modifier onlyDefaultAdminOrBot() {
        if (
            !hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) &&
            !hasRole(BOT_ROLE, _msgSender())
        ) {
            revert MissingRole();
        }
        _;
    }

    /**
     * @notice Allows users to buy tokens with a specified payment token.
     *
     * @param _amount The amount of tokens to buy.
     * @param _paymentToken The address of the payment token used for the purchase.
     *
     * @dev Reverts if the sale is stopped, the purchase amount is zero, or the total supply exceeds the maximum limit.
     * @dev Transfers the corresponding payment tokens to the funding wallet.
     * @dev Mints new tokens to the buyer's address.
     * @dev Emits a `Bought` event with purchase details.
     */
    function buy(uint256 _amount, address _paymentToken) external {
        if (saleStopped) {
            revert SaleHasStopped();
        }
        if (_amount == 0) {
            revert InvalidValue();
        }
        if (mintedCount + _amount > MAX_TOTAL_SUPPLY) {
            revert ExceededMaxTokenSupply();
        }

        uint256 totalPrice = calculateTotalPrice(_amount, _paymentToken);

        IERC20(_paymentToken).transferFrom(
            msg.sender,
            fundingWallet,
            totalPrice
        );

        mintedCount += _amount;

        _mint(msg.sender, _amount);

        emit Bought(msg.sender, _amount, _paymentToken, totalPrice);
    }

    /**
     * @notice Mints tokens to a specified user.
     *
     * @param _user The address of the user to mint tokens for.
     * @param _amount The amount of tokens to mint.
     *
     * @dev Reverts if the sale is stopped, the mint amount is zero, or the total supply exceeds the maximum limit.
     * @dev Mints new tokens to the specified user's address.
     * @dev Emits a `Minted` event with minting details.
     */
    function mint(
        address _user,
        uint256 _amount
    ) external onlyRole(MINTER_ROLE) {
        if (saleStopped) {
            revert SaleHasStopped();
        }
        if (_amount == 0) {
            revert InvalidValue();
        }
        if (mintedCount + _amount > MAX_TOTAL_SUPPLY) {
            revert ExceededMaxTokenSupply();
        }
        mintedCount += _amount;

        _mint(_user, _amount);

        emit Minted(_user, _amount);
    }

    /**
     * @notice Sets a new funding wallet address to receive payments.
     *
     * @param _fundingWallet The address of the new funding wallet.
     *
     * @dev Reverts if the new funding wallet address is the zero address.
     * @dev Updates the funding wallet address.
     */
    function setFundingWallet(
        address _fundingWallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_fundingWallet == address(0)) {
            revert ZeroAddress();
        }
        fundingWallet = _fundingWallet;
    }

    /**
     * @notice Stops/starts the sale of tokens.
     *
     * @dev Sets the `saleStopped` flag.
     * @dev Emits a `SaleStopped` event.
     */
    function stopSale(bool _enabled) external onlyDefaultAdminOrBot {
        saleStopped = _enabled;

        emit SaleStopped(_enabled);
    }

    /**
     * @notice Sets the payment amount for a specified token.
     *
     * @param _tokenContractAddress The address of the token contract.
     * @param _paymentAmount The payment amount for the token.
     *
     * @dev Reverts if the token contract address is the zero address.
     * @dev Updates the payment amount for the specified token.
     */
    function setTokenPaymentAmount(
        address _tokenContractAddress,
        uint256 _paymentAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_tokenContractAddress == address(0)) {
            revert ZeroAddress();
        }
        tokenPaymentAmounts[_tokenContractAddress] = _paymentAmount;
    }

    /**
     * @notice Sets the price for the token.
     *
     * @param _newPrice The new price to be set for the token.
     *
     * @dev This function can be called by the default admin or the bot role.
     * @dev The new price must be greater than or equal to the minimum token price.
     * @dev If the caller has the bot role, the new price can be within the allowed price range.
     * @dev The bot can increase the price up to `priceUpperLimit` and decrease it down to `priceLowerLimit`.
     * @dev Reverts with 'InvalidPrice' error if the new price does not meet the requirements.
     */
    function setPrice(uint16 _newPrice) external onlyDefaultAdminOrBot {
        if (_newPrice < MIN_TOKEN_PRICE) {
            revert InvalidPrice();
        }
        if (hasRole(BOT_ROLE, _msgSender())) {
            if (
                _newPrice > priceUpperLimit ||
                _newPrice < priceLowerLimit
            ) {
                revert InvalidPrice();
            }
        }

        price = _newPrice;
    }

    /**
     * @notice Sets the price limits for the token.
     *
     * @param _lowerLimit The lower limit for the token price.
     * @param _upperLimit The upper limit for the token price.
     *
     * @dev This function can only be called by the default admin role.
     * @dev The lower limit must be greater than the sum of `MIN_TOKEN_PRICE`.
     * @dev The upper limit must be greater than or equal to the lower limit.
     * @dev Reverts with 'InvalidLimit' error if the new price limits do not meet the requirements.
     */
    function setPriceLimits(
        uint16 _lowerLimit,
        uint16 _upperLimit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_lowerLimit < MIN_TOKEN_PRICE) {
            revert InvalidLimit();
        }
        if (_upperLimit < _lowerLimit) {
            revert InvalidLimit();
        }

        priceLowerLimit = _lowerLimit;
        priceUpperLimit = _upperLimit;
    }

    /**
     * @dev Calculates the total price for a given amount of tokens and payment token.
     *
     * @param _amount The amount of tokens.
     * @param _paymentToken The address of the payment token.
     *
     * @return The total price.
     *
     * @dev Reverts if the payment token is not supported (payment amount is zero).
     */
    function calculateTotalPrice(
        uint256 _amount,
        address _paymentToken
    ) public view returns (uint256) {
        // Get the payment amount for the specified token
        uint256 paymentAmount = tokenPaymentAmounts[_paymentToken];

        // Revert if the payment token is not supported
        if (paymentAmount == 0) {
            revert UnsupportedPaymentToken();
        }

        return _amount * price * paymentAmount;
    }
}
