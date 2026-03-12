import os

import pytest

from services.groq_service import GroqService


@pytest.fixture(autouse=True)
def groq_env(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setenv("GROQ_MODEL", "llama3-test")

@pytest.mark.asyncio
async def test_evaluate_skills(mocker):
    mock_client = mocker.patch('services.groq_service.Groq')
    mock_response = mocker.Mock()
    mock_response.choices = [mocker.Mock()]
    mock_response.choices[0].message.content = '[{"skill": "Python", "level": "expert", "score": 90}]'
    mock_client.return_value.chat.completions.create.return_value = mock_response
    service = GroqService()
    result = await service.evaluate_skills(["Python"])
    assert len(result) == 1
    assert result[0].skill == "Python"
    assert result[0].level == "expert"
    assert result[0].score == 90

@pytest.mark.asyncio
async def test_calculate_confidence(mocker):
    mock_client = mocker.patch('services.groq_service.Groq')
    mock_response = mocker.Mock()
    mock_response.choices = [mocker.Mock()]
    mock_response.choices[0].message.content = '85'
    mock_client.return_value.chat.completions.create.return_value = mock_response
    service = GroqService()
    from models import Profile
    profile = Profile(name="John", skills=["Python"], experience="5 years")
    result = await service.calculate_confidence(profile)
    assert result == 85

@pytest.mark.asyncio
async def test_simulate_career(mocker):
    mock_client = mocker.patch('services.groq_service.Groq')
    mock_response = mocker.Mock()
    mock_response.choices = [mocker.Mock()]
    mock_response.choices[0].message.content = 'Great career ahead'
    mock_client.return_value.chat.completions.create.return_value = mock_response
    service = GroqService()
    from models import Profile
    profile = Profile(name="John", skills=["Python"], experience="5 years")
    result = await service.simulate_career(profile)
    assert result == 'Great career ahead'
