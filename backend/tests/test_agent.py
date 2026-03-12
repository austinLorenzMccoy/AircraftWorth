import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_evaluate_profile(mocker):
    mocker.patch('services.groq_service.GroqService.evaluate_skills', return_value=[{"skill": "Python", "level": "expert", "score": 90}])
    mocker.patch('services.groq_service.GroqService.calculate_confidence', return_value=85)
    mocker.patch('services.groq_service.GroqService.simulate_career', return_value="Great career")

    response = client.post("/api/agent/evaluate", json={
        "profile": {
            "name": "John Doe",
            "skills": ["Python"],
            "experience": "5 years"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert "skillEvaluation" in data
    assert data["confidenceScore"] == 85
    assert data["careerTrajectory"] == "Great career"
