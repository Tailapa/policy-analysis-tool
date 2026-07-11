"""Framework definitions for the Governance Intelligence layer — the second,
parallel analytical layer alongside policy_frameworks.py's six frameworks
(Lowi, SCTP, Engagement, Lifecycle, Blind Spots, Lindblom).

Synthesized from knowledge/knowledge.pdf: Kingdon's Multiple Streams
Framework (pp. 9-10), Wicked Problems (pp. 11-12), and Punctuated
Equilibrium Theory (pp. 14-15). Two PRD modules (Policy Instrument Mix,
Policy Window Timeline) are deliberately NOT reimplemented here — they
duplicate the existing Engagement Dimensions and Policy Life Cycle
frameworks already covered by policy_frameworks.py.
"""

from app.services.policy_frameworks import SPECIFICITY_MANDATE

GOVERNANCE_PRIMER = f"""\
You are a public policy analyst applying four additional analytical frameworks, complementary to (not \
replacing) Lowi's typology, SCTP, engagement dimensions, policy lifecycle, and Lindblom's incrementalism \
scale which are analyzed separately. Use ONLY the definitions below — do not substitute your own \
understanding of these terms.

{SPECIFICITY_MANDATE}

1. KINGDON'S MULTIPLE STREAMS FRAMEWORK (MSF)
Policymaking happens when three independent streams happen to converge, not through a linear \
problem-then-solution process:
- Problem Stream: conditions citizens/officials want addressed, gaining attention through indicators \
(e.g. rising costs, worsening statistics), focusing events (crises, disasters, high-profile incidents), \
or feedback from existing programs. Score 0-5 how strongly THIS policy is a response to an already-visible, \
attention-grabbing problem (0 = no clear problem pressure, 5 = a major crisis or focusing event drove it).
- Policy Stream: the "policy primeval soup" of specialist-generated alternatives (bureaucrats, academics, \
think tanks) — only proposals that are technically feasible, value-acceptable, and budgetarily workable \
survive. Score 0-5 how mature/ready-made the specific solution adopted was (0 = an improvised, novel \
mechanism; 5 = a well-established, oft-proposed instrument finally adopted).
- Politics Stream: national mood, election timing, administration changes, organized interest-group \
pressure. Score 0-5 how strongly political conditions (not the problem or the solution itself) explain \
the timing of this policy (0 = no discernible political driver; 5 = clearly timed to an election, new \
administration, or coalition pressure).
Set window_open=true only if the text evidences an actual, identifiable trigger event opening a policy \
window (a named crisis, a change of administration, a budget cycle, a court order, an election) — not \
merely that a policy was announced. Name that specific triggering event in the reasoning where identifiable \
rather than describing the streams abstractly.

2. PUNCTUATED EQUILIBRIUM THEORY (PET — Baumgartner & Jones)
Policy is typically stable for long periods (maintained by a "policy monopoly" — a closed set of actors \
sustained by a positive public image of the issue) and only occasionally punctuated by brief, intense \
periods of major, non-incremental change (triggered when the monopoly's image erodes, excluded groups \
"venue-shop" for a more sympathetic institution such as courts or a different government level, and \
momentum cascades via positive feedback). This dashboard operationalizes that mechanic — which the source \
material describes as a continuous process, not a literal fixed typology — into four discrete, orderable \
stages for classification purposes:
- Policy Monopoly (Stasis): the policy area is handled quietly by an established set of specialist \
actors/agencies with a stable, largely uncontested public image; this item is a routine, incremental \
adjustment within that monopoly.
- Image Erosion & Venue Shopping: the issue's public image is visibly shifting (media scrutiny, court \
challenges, a different ministry or level of government getting involved) and excluded actors are seeking \
a more favorable venue for their position.
- Positive Feedback Punctuation: the issue has moved to macro-political, high-profile attention (Cabinet, \
Parliament, PMO-level, national media) and is producing rapid, cascading, non-incremental change.
- New Equilibrium (Post-Punctuation): a major change has just been institutionalized and the policy area \
is settling into a new, stable arrangement.
Classify which stage this item's text currently evidences, naming the specific institutional actors or \
events (a named regulator, court case, ministry reassignment, media event) that place it there.

3. POLICY ENTREPRENEURS
Kingdon defines these as individuals or institutions (in or out of government) who invest time, energy, \
reputation, and political capital waiting for a policy window, ready to couple the problem, policy, and \
politics streams the moment one opens — "surfers waiting for the big wave." Identify the REAL, SPECIFICALLY \
NAMED actors who plausibly played this role for this item — a named minister, a specific ministry or \
regulatory body, a named court, an industry association, a civil society organization, or a specific \
international body — not generic labels like "the government" or "stakeholders." For each, give an \
influence score (0.0-1.0) and a concrete one-line description of what they specifically contributed (e.g. \
"petitioned the Supreme Court," "chaired the drafting committee," "publicly lobbied for the scheme's \
extension"). Identify at least 3 distinct entrepreneurs where the text and research support it; return \
fewer only with an explicit note in reasoning and confidence="low" if the text genuinely doesn't support \
more.

4. WICKEDNESS INDEX
Wicked problems (as distinct from "tamed" problems with clear technical solutions) have BOTH uncertain \
goals and uncertain means, are socially constructed rather than objectively defined, involve multiple \
actors across government levels, and addressing one facet can worsen another — as seen in India in cases \
like the Women's Reservation Bill's post-2029 rollout (constitutional mandate vs. entrenched social \
structures), DBT/digital-exclusion fraud (transparency tools creating new fraud vectors), Delhi's air \
quality crisis (fragmented, cross-jurisdictional causes), the Make in India vs. climate mandate tension, \
and infrastructure-driven displacement (national growth vs. displaced communities' rights). Score each \
dimension 0.0 (not wicked on this axis) to 1.0 (severely wicked on this axis):
- implementation_complexity: how operationally difficult this policy is to actually deliver on the ground.
- political_conflict: how much this policy pits organized groups against each other with irreconcilable \
values (not just disagreement, but a genuine goal conflict).
- federal_coordination: how much this policy's success depends on coordination across central/state/local \
government levels or across multiple ministries/agencies.
- scientific_uncertainty: how much the causal relationship between this policy's actions and its intended \
outcomes is genuinely disputed or unknown (not just complex, but contested).
- behaviour_change: how much this policy's success depends on large numbers of individuals or firms \
voluntarily changing entrenched behavior, not just complying with a rule.
- time_horizon: how long the causal chain from this policy's actions to its ultimate intended impact is \
(0 = near-immediate effect, 1 = effects only visible over years/decades).
- cross_sector: how much this policy's effects spill into sectors/domains outside its own primary pillar.
Do NOT compute or return an overall score — only the seven dimension scores; the overall score is derived \
server-side as their average. Additionally, write `brief`: a substantive analytical brief in policy/governance \
parlance, distinct from `reasoning` below (which stays short) — TARGET LENGTH 250 WORDS, and do not stop \
short of ~220 words; this is a briefing-note-length passage, not a paragraph. Structure it across several \
short paragraphs covering: which dimensions dominate this policy's wickedness profile and why (with \
specific reference to the concrete facts of this policy, not the dimension names in the abstract); what \
that combination implies for implementation strategy, sequencing, and stakeholder management; and why this \
profile matters for the officials overseeing the policy area. Write it as a policy analyst would for a \
briefing note — expand with concrete detail and implications rather than restating the dimension scores.

For every sub-result, ground the reasoning in concrete details from the policy text and any research \
findings provided — do not give generic reasoning that could apply to any policy. Every "reasoning" field \
(streams.reasoning, entrepreneurs.reasoning, punctuated_equilibrium.reasoning, wickedness.reasoning) must \
be a CONCISE 3-4 SENTENCE explanation a policy professional could read in a few seconds — substantive and \
specific, not padded, not a restatement of the framework definition. If the text does not clearly support \
a confident classification, say so explicitly and use confidence="low" rather than guessing or inventing \
specific names that aren't supported by the evidence.
"""


def build_governance_research_planning_prompt(
    title: str,
    description: str,
    ministry_name: str,
    pillar: str,
) -> str:
    return f"""You are about to analyze the following Indian government policy item using governance \
frameworks (Kingdon's Multiple Streams, Punctuated Equilibrium, Policy Entrepreneurs, the Wickedness \
Index). The analysis needs real, specific institutions, named actors, courts, events, or dates (e.g. the \
specific regulator, a named court case, a specific triggering crisis or election) rather than generic \
descriptions.

POLICY ITEM
Title: {title}
Ministry: {ministry_name}
Pillar: {pillar}
Description: {description}

Decide whether searching the web would help you identify specific, current, real institutional detail for \
this policy (e.g. named actors who pushed for it, a triggering event, related court cases, recent \
developments) that isn't already clear from the description above. If so, call web_search with up to 3 \
well-targeted queries. If the description already gives you enough specific detail to work with, don't \
call the tool at all — just respond with a brief note saying no search is needed."""


def _format_governance_summary(governance_result: dict) -> str:
    streams = governance_result["streams"]
    entrepreneurs = governance_result["entrepreneurs"]["entrepreneurs"]
    pe = governance_result["punctuated_equilibrium"]
    wickedness = governance_result["wickedness"]
    entrepreneur_lines = (
        "; ".join(f"{e['actor']} (influence {e['influence']:.2f}): {e['contribution']}" for e in entrepreneurs)
        or "none identified"
    )
    return f"""\
- Multiple Streams: problem={streams['problem_score']}/5, policy={streams['policy_score']}/5, \
politics={streams['politics_score']}/5, window_open={streams['window_open']}. {streams['reasoning']}
- Punctuated Equilibrium: {pe['stage']}. {pe['reasoning']}
- Policy Entrepreneurs: {entrepreneur_lines}
- Wickedness: {wickedness['reasoning']}"""


def _format_intelligence_summary(intelligence_doc: dict | None) -> str:
    if not intelligence_doc:
        return (
            "(The 6-framework Policy Intelligence layer hasn't been generated for this item yet — "
            "synthesize from the governance modules alone and note this gap explicitly in "
            "synthesis_conclusion rather than guessing at Lowi/SCTP/Engagement/Lifecycle/Lindblom readings.)"
        )
    lowi = intelligence_doc["lowi"]
    sctp = intelligence_doc["sctp"]
    engagement = intelligence_doc["engagement"]
    lifecycle = intelligence_doc["lifecycle"]
    implementation = intelligence_doc["implementation"]
    lindblom = intelligence_doc["lindblom"]
    return f"""\
- Lowi Typology: dominant={lowi['dominant_type']}. {lowi['reasoning']}
- SCTP: {sctp['overall_reasoning']}
- Engagement dimensions: {engagement['reasoning']}
- Lifecycle stage: {lifecycle['current_stage']}. {lifecycle['reasoning']}
- Implementation: {implementation['reasoning']}
- Lindblom incrementalism ({lindblom['score']:.2f}, 0=rational-comprehensive .. 1=disjointed incrementalism): \
{lindblom['reasoning']}"""


def build_synthesis_prompt(
    title: str,
    description: str,
    ministry_name: str,
    pillar: str,
    governance_result: dict,
    intelligence_doc: dict | None,
    genome: dict,
    sources: list[dict],
) -> str:
    """Follow-up call made after the main governance call resolves and the
    genome is computed — see generate_governance_for_item. Produces three
    long-form analytical texts the main call can't, because it needs data
    (the computed genome, the intelligence doc, the full source list) that
    doesn't exist until this point."""
    genome_lines = "\n".join(
        f"- {label}: {value:.2f}" for label, value in zip(genome["dimensions"], genome["vector"])
    )
    citation_lines = (
        "\n".join(f"[{i + 1}] {s['title']} — {s['url']} (found via: \"{s['query']}\")" for i, s in enumerate(sources))
        or "(no web research was run for this item — SERPER_API_KEY unset or no queries were needed)"
    )

    return f"""You are a public policy analyst writing the closing section of a governance intelligence \
brief for the following Indian policy item.

POLICY ITEM
Title: {title}
Ministry: {ministry_name}
Pillar: {pillar}
Description: {description}

GOVERNANCE INTELLIGENCE READINGS (just generated)
{_format_governance_summary(governance_result)}

GOVERNANCE GENOME (ten-dimension signature, 0.0-1.0 each, computed directly from the above plus the \
Policy Intelligence readings below)
{genome_lines}

POLICY INTELLIGENCE READINGS (six-framework layer, generated separately)
{_format_intelligence_summary(intelligence_doc)}

NUMBERED SOURCES CONSULTED DURING RESEARCH
{citation_lines}

Produce three pieces of text. Each has a TARGET LENGTH — treat it as a floor, not a ceiling: write in \
several short paragraphs and expand with concrete detail and implications rather than summarizing tersely \
and stopping early.

1. genome_brief — TARGET LENGTH 350 WORDS (do not stop short of ~300). Write AT LEAST 4 distinct \
paragraphs: (a) which 2-3 dimensions dominate and why, grounded in the actual policy facts; (b) what that \
combination signifies compared to a typical policy in this pillar; (c) what it predicts about how \
implementation and stakeholder reaction will actually play out; (d) why this signature matters for the \
officials overseeing this policy area. Do not describe what a "genome" is in the abstract — every sentence \
should be about this specific policy's numbers.

2. research_brief — TARGET LENGTH 500 WORDS (do not stop short of ~400). Write ONE DEDICATED PARAGRAPH PER \
NUMBERED SOURCE above that contains a substantive finding (skip only sources that add nothing beyond \
what's already covered) — state the finding, cite it with its bracket number (e.g. "...as reported in \
[2]..."), and then draw out its implication for this policy rather than just restating it. If there are \
fewer than 4 substantive sources, add a closing paragraph connecting the findings to each other. If the \
numbered sources list above says no research was run, say so explicitly in 1-2 sentences instead of \
fabricating findings — do not invent citations.

3. synthesis_conclusion — TARGET LENGTH 200 WORDS (do not stop short of ~170): drawing on ALL the readings \
above (both the governance modules and, where available, the six-framework Policy Intelligence readings), \
what does the combined picture mean for this policy — why is it relevant, what are the implications for \
implementation, stakeholders, and political risk — written in policy/governance parlance for a reader who \
has just read the full brief above. If the Policy Intelligence layer wasn't available above, synthesize \
from the governance modules alone and say so.

Return your answer as JSON matching the required schema exactly."""


def build_governance_prompt(
    title: str,
    description: str,
    ministry_name: str,
    pillar: str,
    tags: list[str],
    research_context: str = "",
) -> str:
    tags_str = ", ".join(tags) if tags else "(none)"
    research_block = f"\n{research_context}\n" if research_context else ""
    return f"""{GOVERNANCE_PRIMER}

Analyze the following policy item using all four frameworks above. Return your answer as JSON matching \
the required schema exactly.

POLICY ITEM
Title: {title}
Ministry: {ministry_name}
Pillar: {pillar}
Tags: {tags_str}
Description: {description}
{research_block}"""
