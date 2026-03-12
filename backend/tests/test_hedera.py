import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_log_evaluation(mocker):
    mocker.patch('services.hedera_service.HederaService.log_evaluation', return_value=123)
    response = client.post("/api/hedera/log-evaluation", json={
        "evaluationId": "eval1",
        "userId": "user1",
        "evaluationData": {
            "skillEvaluation": [],
            "confidenceScore": 80,
            "careerTrajectory": "Good",
            "timestamp": "2023-01-01T00:00:00"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["sequenceNumber"] == 123

def test_mint_skill_token(mocker):
    mocker.patch('services.hedera_service.HederaService.mint_skill_token', return_value="0.0.123")
    response = client.post("/api/hedera/mint-skill-token", json={
        "userId": "user1",
        "skillWorth": 100
    })
    assert response.status_code == 200
    data = response.json()
    assert data["tokenId"] == "0.0.123"
