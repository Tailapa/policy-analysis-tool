from pydantic import BaseModel

# ---------------------------------------------------------------------------
# LLM-facing schema — enforced via response_schema=DraftVerificationResult.
# ---------------------------------------------------------------------------


class DraftVerificationResult(BaseModel):
    still_draft: bool
    reasoning: str  # ~60-100 words
