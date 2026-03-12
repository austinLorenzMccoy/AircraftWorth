// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title AircraftWorth Reputation System
 * @dev On-chain reputation tracking for sensor operators
 * @author AircraftWorth Team
 */
contract ReputationSystem is Ownable, ReentrancyGuard {
    using Math for uint256;

    // Structs
    struct ReputationScore {
        uint256 totalScore;
        uint256 reviewCount;
        uint256 successfulTransactions;
        uint256 failedTransactions;
        uint256 lastUpdated;
        string lastReason;
    }

    struct Review {
        uint256 id;
        address reviewer;
        uint256 rating; // 1-5 stars
        string comment;
        uint256 timestamp;
        bool isValid;
    }

    struct ReputationEvent {
        uint256 id;
        address operator;
        uint256 scoreChange;
        string reason;
        uint256 timestamp;
        address updatedBy;
    }

    // State variables
    uint256 public reviewCounter;
    uint256 public eventCounter;
    
    mapping(address => ReputationScore) public reputationScores;
    mapping(uint256 => Review) public reviews;
    mapping(uint256 => ReputationEvent) public reputationEvents;
    mapping(address => uint256[]) public operatorReviews;
    
    // Constants
    uint256 public constant MAX_REPUTATION = 1000;
    uint256 public constant MIN_REPUTATION = 0;
    uint256 public constant INITIAL_REPUTATION = 100;
    uint256 public constant REVIEW_WEIGHT = 20; // Each review affects reputation by 20 points
    
    // Events
    event ReputationUpdated(
        address indexed operator,
        uint256 oldScore,
        uint256 newScore,
        string reason,
        address indexed updatedBy
    );
    
    event ReviewSubmitted(
        uint256 indexed reviewId,
        address indexed reviewer,
        address indexed operator,
        uint256 rating,
        string comment
    );
    
    event ReputationEventCreated(
        uint256 indexed eventId,
        address indexed operator,
        uint256 scoreChange,
        string reason
    );

    // Modifiers
    modifier validReputation(uint256 _score) {
        require(_score >= MIN_REPUTATION && _score <= MAX_REPUTATION, "Invalid reputation score");
        _;
    }

    modifier onlyReviewedOperator(address _operator) {
        require(reputationScores[_operator].totalScore > 0, "Operator not reviewed");
        _;
    }

    // Functions
    
    /**
     * @dev Initialize reputation for a new operator
     */
    function initializeReputation(address _operator) external onlyOwner {
        require(reputationScores[_operator].totalScore == 0, "Reputation already initialized");
        
        reputationScores[_operator] = ReputationScore({
            totalScore: INITIAL_REPUTATION,
            reviewCount: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            lastUpdated: block.timestamp,
            lastReason: "Initial reputation"
        });
        
        emit ReputationUpdated(_operator, 0, INITIAL_REPUTATION, "Initial reputation", msg.sender);
    }
    
    /**
     * @dev Submit a review for an operator
     */
    function submitReview(
        address _operator,
        uint256 _rating,
        string memory _comment
    ) external {
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        require(bytes(_comment).length > 0, "Comment required");
        require(_operator != msg.sender, "Cannot review yourself");
        require(_operator != address(0), "Invalid operator address");
        
        reviewCounter++;
        uint256 reviewId = reviewCounter;
        
        reviews[reviewId] = Review({
            id: reviewId,
            reviewer: msg.sender,
            rating: _rating,
            comment: _comment,
            timestamp: block.timestamp,
            isValid: true
        });
        
        operatorReviews[_operator].push(reviewId);
        
        // Update reputation based on review
        _updateReputationScore(_operator, _rating, "User review");
        
        emit ReviewSubmitted(reviewId, msg.sender, _operator, _rating, _comment);
    }
    
    /**
     * @dev Update reputation score manually
     */
    function updateReputation(
        address _operator,
        uint256 _newScore,
        string memory _reason
    ) external onlyOwner validReputation(_newScore) {
        ReputationScore storage score = reputationScores[_operator];
        uint256 oldScore = score.totalScore;
        
        score.totalScore = _newScore;
        score.lastUpdated = block.timestamp;
        score.lastReason = _reason;
        
        eventCounter++;
        reputationEvents[eventCounter] = ReputationEvent({
            id: eventCounter,
            operator: _operator,
            scoreChange: _newScore - oldScore,
            reason: _reason,
            timestamp: block.timestamp,
            updatedBy: msg.sender
        });
        
        emit ReputationUpdated(_operator, oldScore, _newScore, _reason, msg.sender);
        emit ReputationEventCreated(eventCounter, _operator, _newScore - oldScore, _reason);
    }
    
    /**
     * @dev Update reputation based on transaction success/failure
     */
    function updateTransactionReputation(
        address _operator,
        bool _success,
        string memory _reason
    ) external onlyOwner {
        ReputationScore storage score = reputationScores[_operator];
        uint256 oldScore = score.totalScore;
        
        if (_success) {
            score.successfulTransactions++;
            // Increase reputation for successful transactions
            score.totalScore = score.totalScore + 5 > MAX_REPUTATION ? MAX_REPUTATION : score.totalScore + 5;
        } else {
            score.failedTransactions++;
            // Decrease reputation for failed transactions
            score.totalScore = score.totalScore < 5 ? MIN_REPUTATION : score.totalScore - 5;
        }
        
        score.lastUpdated = block.timestamp;
        score.lastReason = _reason;
        
        eventCounter++;
        reputationEvents[eventCounter] = ReputationEvent({
            id: eventCounter,
            operator: _operator,
            scoreChange: score.totalScore - oldScore,
            reason: _reason,
            timestamp: block.timestamp,
            updatedBy: msg.sender
        });
        
        emit ReputationUpdated(_operator, oldScore, score.totalScore, _reason, msg.sender);
        emit ReputationEventCreated(eventCounter, _operator, score.totalScore - oldScore, _reason);
    }
    
    /**
     * @dev Batch update reputation for multiple operators
     */
    function batchUpdateReputation(
        address[] memory _operators,
        uint256[] memory _scores,
        string[] memory _reasons
    ) external onlyOwner {
        require(_operators.length == _scores.length && _operators.length == _reasons.length, "Array length mismatch");
        
        for (uint256 i = 0; i < _operators.length; i++) {
            if (_scores[i] <= MAX_REPUTATION) {
                _updateReputationScore(_operators[i], _scores[i], _reasons[i]);
            }
        }
    }
    
    /**
     * @dev Invalidate a review
     */
    function invalidateReview(uint256 _reviewId, string memory _reason) external onlyOwner {
        require(reviews[_reviewId].isValid, "Review already invalidated");
        
        reviews[_reviewId].isValid = false;
        
        // Adjust reputation if needed
        Review memory review = reviews[_reviewId];
        _updateReputationScore(review.operator, 0, "Review invalidated");
    }
    
    // Internal functions
    
    /**
     * @dev Internal function to update reputation score
     */
    function _updateReputationScore(address _operator, uint256 _rating, string memory _reason) internal {
        ReputationScore storage score = reputationScores[_operator];
        uint256 oldScore = score.totalScore;
        
        // Calculate score change based on rating
        int256 scoreChange = 0;
        if (_rating <= 2) {
            scoreChange = -10; // Poor rating
        } else if (_rating == 3) {
            scoreChange = -5;  // Average rating
        } else if (_rating == 4) {
            scoreChange = 5;   // Good rating
        } else if (_rating >= 5) {
            scoreChange = 10;  // Excellent rating
        }
        
        score.reviewCount++;
        score.totalScore = _calculateNewReputation(oldScore, scoreChange);
        score.lastUpdated = block.timestamp;
        score.lastReason = _reason;
        
        emit ReputationUpdated(_operator, oldScore, score.totalScore, _reason, msg.sender);
    }
    
    /**
     * @dev Calculate new reputation score with bounds checking
     */
    function _calculateNewReputation(uint256 _currentScore, int256 _change) internal pure returns (uint256) {
        int256 newScore = int256(_currentScore) + _change;
        
        if (newScore < int256(MIN_REPUTATION)) {
            return MIN_REPUTATION;
        } else if (newScore > int256(MAX_REPUTATION)) {
            return MAX_REPUTATION;
        } else {
            return uint256(newScore);
        }
    }
    
    // View functions
    
    /**
     * @dev Get operator reputation score
     */
    function getReputationScore(address _operator) external view returns (ReputationScore memory) {
        return reputationScores[_operator];
    }
    
    /**
     * @dev Get review details
     */
    function getReview(uint256 _reviewId) external view returns (Review memory) {
        return reviews[_reviewId];
    }
    
    /**
     * @dev Get operator's reviews
     */
    function getOperatorReviews(address _operator) external view returns (uint256[] memory) {
        return operatorReviews[_operator];
    }
    
    /**
     * @dev Get reputation events for operator
     */
    function getReputationEvents(address _operator, uint256 _offset, uint256 _limit) external view returns (ReputationEvent[] memory) {
        uint256[] memory eventIds = new uint256[](_limit);
        uint256 count = 0;
        
        // Find events for this operator
        for (uint256 i = 1; i <= eventCounter && count < _limit; i++) {
            if (reputationEvents[i].operator == _operator) {
                if (count >= _offset) {
                    eventIds[count - _offset] = i;
                    count++;
                }
            }
        }
        
        // Build result array
        ReputationEvent[] memory events = new ReputationEvent[](count);
        for (uint256 i = 0; i < count; i++) {
            events[i] = reputationEvents[eventIds[i]];
        }
        
        return events;
    }
    
    /**
     * @dev Calculate reputation tier
     */
    function getReputationTier(address _operator) external view returns (string memory) {
        uint256 score = reputationScores[_operator].totalScore;
        
        if (score >= 900) {
            return "Platinum";
        } else if (score >= 700) {
            return "Gold";
        } else if (score >= 500) {
            return "Silver";
        } else if (score >= 300) {
            return "Bronze";
        } else {
            return "Unrated";
        }
    }
    
    /**
     * @dev Check if operator is trusted (high reputation)
     */
    function isTrustedOperator(address _operator) external view returns (bool) {
        return reputationScores[_operator].totalScore >= 700;
    }
}
