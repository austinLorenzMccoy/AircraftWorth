import json
import logging
import os
from typing import List

from groq import Groq

from models import Profile, SkillEvaluation


logger = logging.getLogger(__name__)

class GroqService:
    def __init__(self):
        self.model = os.getenv("GROQ_MODEL", "llama3-8b-8192")
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key) if api_key else None

        if not api_key:
            logger.warning("GROQ_API_KEY not set – using deterministic fallback responses.")

    async def evaluate_skills(self, skills: list[str]) -> list[SkillEvaluation]:
        if not skills:
            return []

        if not self.client:
            return self._fallback_skill_evaluations(skills)

        prompt = f"""
        Evaluate the following skills on a scale of 1-100 for expertise level.
        Skills: {', '.join(skills)}
        Return JSON array of objects with skill, level (beginner/intermediate/advanced/expert), score.
        """

        response = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("No response from Groq")

        try:
            data = json.loads(content)
            return [SkillEvaluation(**item) for item in data]
        except:
            # Fallback
            return self._fallback_skill_evaluations(skills)

    async def calculate_confidence(self, profile: Profile) -> int:
        if not self.client:
            return self._fallback_confidence(profile)

        prompt = f"""
        Based on the profile: {profile.model_dump_json()}
        Calculate a confidence score (0-100) for the accuracy of skill assessments.
        Return only the number.
        """

        response = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
        )

        content = response.choices[0].message.content
        if content:
            import re
            match = re.search(r'\d+', content)
            return int(match.group()) if match else 50
        return self._fallback_confidence(profile)

    async def simulate_career(self, profile: Profile) -> str:
        if not self.client:
            return self._fallback_career(profile)

        prompt = f"""
        Simulate career trajectory for: {profile.model_dump_json()}
        Provide a brief summary of potential career path.
        """

        response = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
        )

        return response.choices[0].message.content or "Career trajectory analysis unavailable"

    def _fallback_skill_evaluations(self, skills: List[str]) -> List[SkillEvaluation]:
        tiers = ["intermediate", "advanced", "expert"]
        base_score = 65
        return [
            SkillEvaluation(
                skill=skill,
                level=tiers[idx % len(tiers)],
                score=min(100, base_score + (idx * 5)),
            )
            for idx, skill in enumerate(skills)
        ]

    def _fallback_confidence(self, profile: Profile) -> int:
        length_bonus = min(20, len(profile.skills) * 3)
        return 70 + length_bonus

    def _fallback_career(self, profile: Profile) -> str:
        return (
            f"{profile.name} evolves into a lead contributor across Hedera-aligned agent networks, "
            "monetising {len(profile.skills)} core skills with verifiable audit trails."
        )
