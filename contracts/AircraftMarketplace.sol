// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title AircraftWorth Marketplace
 * @dev Smart contract for buying and selling aircraft sensor data
 * @author AircraftWorth Team
 */
contract AircraftMarketplace is Ownable, ReentrancyGuard {
    using Math for uint256;

    // Structs
    struct DataOffering {
        uint256 id;
        address seller;
        uint256 price; // in HBAR (tinybars)
        string dataType; // "raw_modes", "mlat_positions", "both"
        uint256 duration; // in seconds
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 maxPurchases;
        uint256 currentPurchases;
        string description;
        uint256 minConfidence; // minimum confidence score (0-100)
        uint256 minSensors; // minimum number of sensors
    }

    struct Purchase {
        uint256 id;
        uint256 offeringId;
        address buyer;
        uint256 amount;
        uint256 timestamp;
        bool isCompleted;
        bool isRefunded;
    }

    struct SensorOperator {
        address operator;
        string name;
        uint256 reputation;
        uint256 totalEarnings;
        uint256 completedSales;
        uint256 activeOfferings;
        bool isVerified;
        uint256 joinTime;
    }

    // State variables
    uint256 public offeringCounter;
    uint256 public purchaseCounter;
    uint256 public operatorCounter;
    
    mapping(uint256 => DataOffering) public offerings;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => SensorOperator) public operators;
    mapping(address => uint256[]) public operatorOfferings;
    mapping(uint256 => address) public offeringToSeller;
    mapping(address => uint256) public earnings;
    
    // Platform fee (2.5% in basis points = 250)
    uint256 public constant PLATFORM_FEE_BPS = 250;
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Events
    event OfferingCreated(
        uint256 indexed offeringId,
        address indexed seller,
        uint256 price,
        string dataType,
        uint256 duration
    );
    
    event OfferingUpdated(
        uint256 indexed offeringId,
        bool isActive
    );
    
    event PurchaseInitiated(
        uint256 indexed purchaseId,
        uint256 indexed offeringId,
        address indexed buyer,
        uint256 amount
    );
    
    event PurchaseCompleted(
        uint256 indexed purchaseId,
        uint256 indexed offeringId,
        address indexed buyer,
        address indexed seller
    );
    
    event PurchaseRefunded(
        uint256 indexed purchaseId,
        address indexed buyer,
        uint256 amount
    );
    
    event OperatorRegistered(
        address indexed operator,
        string name,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        address indexed operator,
        uint256 newReputation,
        string reason
    );
    
    event EarningsWithdrawn(
        address indexed operator,
        uint256 amount
    );

    // Modifiers
    modifier onlyVerifiedOperator() {
        require(operators[msg.sender].isVerified, "Operator not verified");
        _;
    }
    
    modifier onlyOfferingSeller(uint256 _offeringId) {
        require(offerings[_offeringId].seller == msg.sender, "Not the offering seller");
        _;
    }

    // Functions
    
    /**
     * @dev Register a new sensor operator
     */
    function registerOperator(string memory _name) external {
        require(bytes(operators[msg.sender].name).length == 0, "Operator already registered");
        
        operatorCounter++;
        operators[msg.sender] = SensorOperator({
            operator: msg.sender,
            name: _name,
            reputation: 100, // Start with perfect reputation
            totalEarnings: 0,
            completedSales: 0,
            activeOfferings: 0,
            isVerified: false, // Requires manual verification
            joinTime: block.timestamp
        });
        
        emit OperatorRegistered(msg.sender, _name, block.timestamp);
    }
    
    /**
     * @dev Verify an operator (owner only)
     */
    function verifyOperator(address _operator) external onlyOwner {
        require(operators[_operator].operator != address(0), "Operator not registered");
        operators[_operator].isVerified = true;
        emit ReputationUpdated(_operator, 100, "Verified operator");
    }
    
    /**
     * @dev Create a new data offering
     */
    function createOffering(
        uint256 _price,
        string memory _dataType,
        uint256 _duration,
        string memory _description,
        uint256 _minConfidence,
        uint256 _minSensors,
        uint256 _maxPurchases
    ) external onlyVerifiedOperator {
        require(_price > 0, "Price must be greater than 0");
        require(bytes(_dataType).length > 0, "Data type required");
        require(_duration > 0, "Duration must be greater than 0");
        require(bytes(_description).length > 0, "Description required");
        require(_minConfidence <= 100, "Confidence must be <= 100");
        require(_minSensors >= 3, "Minimum sensors must be >= 3");
        require(_maxPurchases > 0, "Max purchases must be > 0");
        
        offeringCounter++;
        uint256 offeringId = offeringCounter;
        
        offerings[offeringId] = DataOffering({
            id: offeringId,
            seller: msg.sender,
            price: _price,
            dataType: _dataType,
            duration: _duration,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            isActive: true,
            maxPurchases: _maxPurchases,
            currentPurchases: 0,
            description: _description,
            minConfidence: _minConfidence,
            minSensors: _minSensors
        });
        
        offeringToSeller[offeringId] = msg.sender;
        
        // Update operator stats
        operators[msg.sender].activeOfferings++;
        operatorOfferings[msg.sender].push(offeringId);
        
        emit OfferingCreated(offeringId, msg.sender, _price, _dataType, _duration);
    }
    
    /**
     * @dev Update offering status
     */
    function updateOffering(uint256 _offeringId, bool _isActive) external onlyOfferingSeller(_offeringId) {
        offerings[_offeringId].isActive = _isActive;
        emit OfferingUpdated(_offeringId, _isActive);
    }
    
    /**
     * @dev Purchase a data offering
     */
    function purchaseOffering(uint256 _offeringId) external payable nonReentrant {
        DataOffering memory offering = offerings[_offeringId];
        
        require(offerings[_offeringId].seller != address(0), "Offering not found");
        require(offerings[_offeringId].isActive, "Offering not active");
        require(block.timestamp <= offerings[_offeringId].endTime, "Offering expired");
        require(offerings[_offeringId].currentPurchases < offerings[_offeringId].maxPurchases, "Offering sold out");
        require(msg.value >= offerings[_offeringId].price, "Insufficient payment");
        require(block.timestamp >= offerings[_offeringId].startTime, "Offering not started");
        
        purchaseCounter++;
        uint256 purchaseId = purchaseCounter;
        
        // Calculate platform fee
        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / FEE_DENOMINATOR;
        uint256 sellerAmount = msg.value - platformFee;
        
        purchases[purchaseId] = Purchase({
            id: purchaseId,
            offeringId: _offeringId,
            buyer: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            isCompleted: false,
            isRefunded: false
        });
        
        offerings[_offeringId].currentPurchases++;
        
        // Update seller earnings
        earnings[offerings[_offeringId].seller] += sellerAmount;
        operators[offerings[_offeringId].seller].totalEarnings += sellerAmount;
        operators[offerings[_offeringId].seller].completedSales++;
        
        // Refund excess payment if any
        if (msg.value > offerings[_offeringId].price) {
            payable(msg.sender).transfer(msg.value - offerings[_offeringId].price);
        }
        
        emit PurchaseInitiated(purchaseId, _offeringId, msg.sender, offerings[_offeringId].price);
    }
    
    /**
     * @dev Complete a purchase (after data delivery confirmed)
     */
    function completePurchase(uint256 _purchaseId) external onlyOfferingSeller(_purchaseId) {
        Purchase memory purchase = purchases[_purchaseId];
        
        require(purchases[_purchaseId].buyer != address(0), "Purchase not found");
        require(!purchases[_purchaseId].isCompleted, "Purchase already completed");
        require(!purchases[_purchaseId].isRefunded, "Purchase was refunded");
        
        purchases[_purchaseId].isCompleted = true;
        
        emit PurchaseCompleted(_purchaseId, purchase.offeringId, purchase.buyer, purchase.seller);
    }
    
    /**
     * @dev Refund a purchase
     */
    function refundPurchase(uint256 _purchaseId, string memory _reason) external onlyOwner {
        Purchase memory purchase = purchases[_purchaseId];
        
        require(purchases[_purchaseId].buyer != address(0), "Purchase not found");
        require(!purchases[_purchaseId].isCompleted, "Purchase already completed");
        require(!purchases[_purchaseId].isRefunded, "Purchase already refunded");
        
        purchases[_purchaseId].isRefunded = true;
        
        // Return funds to buyer
        payable(purchases[_purchaseId].buyer).transfer(purchase.amount);
        
        emit PurchaseRefunded(_purchaseId, purchase.buyer, purchase.amount);
    }
    
    /**
     * @dev Update operator reputation
     */
    function updateReputation(address _operator, uint256 _newReputation, string memory _reason) external onlyOwner {
        require(operators[_operator].operator != address(0), "Operator not found");
        require(_newReputation <= 1000, "Reputation too high");
        
        operators[_operator].reputation = _newReputation;
        emit ReputationUpdated(_operator, _newReputation, _reason);
    }
    
    /**
     * @dev Withdraw earnings
     */
    function withdrawEarnings() external {
        uint256 amount = earnings[msg.sender];
        require(amount > 0, "No earnings to withdraw");
        earnings[msg.sender] = 0;
        
        payable(msg.sender).transfer(amount);
        emit EarningsWithdrawn(msg.sender, amount);
    }
    
    // View functions
    
    /**
     * @dev Get offering details
     */
    function getOffering(uint256 _offeringId) external view returns (DataOffering memory) {
        return offerings[_offeringId];
    }
    
    /**
     * @dev Get purchase details
     */
    function getPurchase(uint256 _purchaseId) external view returns (Purchase memory) {
        return purchases[_purchaseId];
    }
    
    /**
     * @dev Get operator details
     */
    function getOperator(address _operator) external view returns (SensorOperator memory) {
        return operators[_operator];
    }
    
    /**
     * @dev Get operator's offerings
     */
    function getOperatorOfferings(address _operator) external view returns (uint256[] memory) {
        return operatorOfferings[_operator];
    }
    
    /**
     * @dev Get active offerings
     */
    function getActiveOfferings(uint256 _offset, uint256 _limit) external view returns (DataOffering[] memory) {
        uint256[] memory activeIds = new uint256[](_limit);
        uint256 count = 0;
        
        for (uint256 i = 0; i < offeringCounter && count < _limit; i++) {
            if (offerings[i + 1].isActive && block.timestamp <= offerings[i + 1].endTime) {
                activeIds[count] = i + 1;
                count++;
            }
        }
        
        DataOffering[] memory activeOfferings = new DataOffering[](count);
        for (uint256 i = 0; i < count; i++) {
            activeOfferings[i] = offerings[activeIds[i]];
        }
        
        return activeOfferings;
    }
    
    /**
     * @dev Get operator earnings
     */
    function getOperatorEarnings(address _operator) external view returns (uint256) {
        return earnings[_operator];
    }
}
