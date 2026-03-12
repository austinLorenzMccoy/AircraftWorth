// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title AircraftWorth Escrow Service
 * @dev Secure escrow contract for marketplace transactions
 * @author AircraftWorth Team
 */
contract EscrowService is Ownable, ReentrancyGuard {
    using Math for uint256;

    // Structs
    struct Escrow {
        uint256 id;
        uint256 offeringId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 platformFee;
        uint256 deadline;
        uint256 createdAt;
        bool isReleased;
        bool isRefunded;
        string reason; // Reason for refund if applicable
    }

    // State variables
    uint256 public escrowCounter;
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => address) public escrowToSeller;
    mapping(uint256 => address) public escrowToBuyer;
    
    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 indexed offeringId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 deadline
    );
    
    event EscrowReleased(
        uint256 indexed escrowId,
        address indexed seller,
        uint256 amount
    );
    
    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 amount,
        string reason
    );
    
    // Modifiers
    modifier onlyEscrowParticipant(uint256 _escrowId) {
        require(
            escrows[_escrowId].buyer == msg.sender || 
            escrows[_escrowId].seller == msg.sender ||
            owner() == msg.sender,
            "Not authorized"
        );
        _;
    }

    // Functions
    
    /**
     * @dev Create a new escrow for a purchase
     */
    function createEscrow(
        uint256 _offeringId,
        address _buyer,
        address _seller,
        uint256 _amount,
        uint256 _platformFee,
        uint256 _duration
    ) external onlyOwner {
        require(_buyer != address(0), "Invalid buyer");
        require(_seller != address(0), "Invalid seller");
        require(_amount > _platformFee, "Invalid amount");
        require(_duration > 0, "Invalid duration");
        
        escrowCounter++;
        uint256 escrowId = escrowCounter;
        
        uint256 deadline = block.timestamp + _duration;
        
        escrows[escrowId] = Escrow({
            id: escrowId,
            offeringId: _offeringId,
            buyer: _buyer,
            seller: _seller,
            amount: _amount - _platformFee, // Net amount to seller
            platformFee: _platformFee,
            deadline: deadline,
            createdAt: block.timestamp,
            isReleased: false,
            isRefunded: false,
            reason: ""
        });
        
        escrowToSeller[escrowId] = _seller;
        escrowToBuyer[escrowId] = _buyer;
        
        emit EscrowCreated(escrowId, _offeringId, _buyer, _seller, _amount, deadline);
    }
    
    /**
     * @dev Release funds from escrow to seller
     */
    function releaseEscrow(uint256 _escrowId) external onlyEscrowParticipant(_escrowId) nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        
        require(!escrow.isReleased, "Escrow already released");
        require(!escrow.isRefunded, "Escrow was refunded");
        require(block.timestamp <= escrow.deadline, "Escrow expired");
        require(msg.sender == escrow.seller || msg.sender == owner(), "Not authorized to release");
        
        escrow.isReleased = true;
        
        // Transfer funds to seller
        payable(escrow.seller).transfer(escrow.amount);
        
        emit EscrowReleased(_escrowId, escrow.seller, escrow.amount);
    }
    
    /**
     * @dev Refund escrow to buyer
     */
    function refundEscrow(uint256 _escrowId, string memory _reason) external onlyEscrowParticipant(_escrowId) nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        
        require(!escrow.isReleased, "Escrow already released");
        require(!escrow.isRefunded, "Escrow already refunded");
        require(
            msg.sender == escrow.buyer || 
            msg.sender == owner() ||
            block.timestamp > escrow.deadline, // Allow refund after deadline
            "Not authorized to refund"
        );
        
        escrow.isRefunded = true;
        escrow.reason = _reason;
        
        // Transfer full amount back to buyer
        payable(escrow.buyer).transfer(escrow.amount + escrow.platformFee);
        
        emit EscrowRefunded(_escrowId, escrow.buyer, escrow.amount + escrow.platformFee, _reason);
    }
    
    // View functions
    
    /**
     * @dev Get escrow details
     */
    function getEscrow(uint256 _escrowId) external view returns (Escrow memory) {
        return escrows[_escrowId];
    }
    
    /**
     * @dev Check if escrow can be released
     */
    function canReleaseEscrow(uint256 _escrowId) external view returns (bool) {
        Escrow memory escrow = escrows[_escrowId];
        return !escrow.isReleased && !escrow.isRefunded && block.timestamp <= escrow.deadline;
    }
    
    /**
     * @dev Check if escrow can be refunded
     */
    function canRefundEscrow(uint256 _escrowId) external view returns (bool) {
        Escrow memory escrow = escrows[_escrowId];
        return !escrow.isReleased && !escrow.isRefunded;
    }
    
    /**
     * @dev Get escrow deadline
     */
    function getEscrowDeadline(uint256 _escrowId) external view returns (uint256) {
        return escrows[_escrowId].deadline;
    }
}
