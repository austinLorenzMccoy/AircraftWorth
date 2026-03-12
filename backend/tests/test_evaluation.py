from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_evaluations():
    response = client.get("/api/evaluation/user123")
    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == "user123"
    assert isinstance(data["evaluations"], list)
    assert data["reputation"] >= 0
    assert "lastUpdated" in data
    assert "source" in data
