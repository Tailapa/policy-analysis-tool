"""Governance Genome Index (GGI): a deterministic composite score built from
six independently-scored policy-science frameworks. See
methodology_documentation.md at the repo root for the full rationale behind
each sub-index formula and the equal-weighted composite.

Computed fresh from already-persisted `intelligence`/`governance` subdocuments
on every read — never stored, never LLM-generated. This is deliberate: it
means the formula can be revised at any time without a migration or backfill,
and a governance record generated before this feature existed still produces
a fully valid GGI as long as its `governance.streams` and
`governance.punctuated_equilibrium` fields are present (they always are,
since GGI only reads fields that predate this feature)."""

from app.services.policy_governance import CONFIDENCE_RANK, RANK_CONFIDENCE

NEUTRAL_SUB_INDEX = 50.0

# Ordinal position (0-100) of each stage in the standard policy cycle —
# used to score Policy Lifecycle Maturity (PLMI).
LIFECYCLE_STAGE_SCORE = {
    "Problem Identification & Agenda Setting": 0.0,
    "Policy Formulation": 20.0,
    "Legitimation & Adoption": 40.0,
    "Implementation": 60.0,
    "Evaluation": 80.0,
    "Maintenance, Succession & Termination": 100.0,
}

# Ordinal position (0-100) on the stability -> disruption cycle — used to
# score the Punctuated Equilibrium Index (PEI).
PE_STAGE_SCORE = {
    "Policy Monopoly (Stasis)": 10.0,
    "Image Erosion & Venue Shopping": 40.0,
    "Positive Feedback Punctuation": 75.0,
    "New Equilibrium (Post-Punctuation)": 100.0,
}


def _min_confidence(levels: list[str]) -> str:
    if not levels:
        return "medium"
    worst = min(CONFIDENCE_RANK.get(level, 1) for level in levels)
    return RANK_CONFIDENCE[worst]


def compute_ggi(intelligence: dict | None, governance: dict) -> dict:
    """Returns {lti, cei, plmi, lii, kmsi, pei, ggi_score, window_open,
    confidence} — all six sub-indices and the composite on a 0-100 scale.

    `governance` must already exist (callers only invoke this once a
    governance record is present). `intelligence` may be None if the
    6-framework Policy Intelligence layer hasn't run yet for this item —
    the four intelligence-sourced sub-indices (LTI, CEI, PLMI, LII) then
    default to a neutral 50, mirroring _compute_genome's existing
    graceful-degradation pattern for the same situation."""
    streams = governance.get("streams", {})
    pe = governance.get("punctuated_equilibrium", {})

    problem = streams.get("problem_score", 0.0)
    policy = streams.get("policy_score", 0.0)
    politics = streams.get("politics_score", 0.0)
    kmsi = ((problem + policy + politics) / 15) * 100
    window_open = bool(streams.get("window_open", False))

    pe_stage = pe.get("stage")
    pei = PE_STAGE_SCORE.get(pe_stage, NEUTRAL_SUB_INDEX)

    confidences = [streams.get("confidence", "medium"), pe.get("confidence", "medium")]

    if intelligence is None:
        lti = cei = plmi = lii = NEUTRAL_SUB_INDEX
    else:
        lowi = intelligence.get("lowi", {})
        engagement = intelligence.get("engagement", {})
        lifecycle = intelligence.get("lifecycle", {})
        lindblom = intelligence.get("lindblom", {})

        regulatory = lowi.get("regulatory_score", 0.5)
        distributive = lowi.get("distributive_score", 0.5)
        redistributive = lowi.get("redistributive_score", 0.5)
        lti = (0.25 * regulatory + 0.35 * distributive + 0.40 * redistributive) * 100

        educate = engagement.get("educate_score", 0.5)
        persuade = engagement.get("persuade_score", 0.5)
        strengthen = engagement.get("strengthen_score", 0.5)
        incentivize = engagement.get("incentivize_score", 0.5)
        coerce = engagement.get("coerce_score", 0.5)
        cei = (
            0.25 * educate
            + 0.25 * persuade
            + 0.20 * strengthen
            + 0.15 * incentivize
            + 0.15 * (1 - coerce)
        ) * 100

        stage = lifecycle.get("current_stage")
        plmi = LIFECYCLE_STAGE_SCORE.get(stage, NEUTRAL_SUB_INDEX)

        lii = lindblom.get("score", 0.5) * 100

        confidences.extend(
            [
                lowi.get("confidence", "medium"),
                engagement.get("confidence", "medium"),
                lifecycle.get("confidence", "medium"),
                lindblom.get("confidence", "medium"),
            ]
        )

    ggi_score = (lti + cei + plmi + lii + kmsi + pei) / 6

    return {
        "lti": round(lti, 1),
        "cei": round(cei, 1),
        "plmi": round(plmi, 1),
        "lii": round(lii, 1),
        "kmsi": round(kmsi, 1),
        "pei": round(pei, 1),
        "ggi_score": round(ggi_score, 1),
        "window_open": window_open,
        "confidence": _min_confidence(confidences),
    }
