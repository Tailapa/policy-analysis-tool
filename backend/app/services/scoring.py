"""Small scoring helpers shared across policy_intelligence.py and
policy_governance.py."""


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))
