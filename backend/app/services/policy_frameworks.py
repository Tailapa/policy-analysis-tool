"""Authoritative framework definitions for the Policy Intelligence layer.

Synthesized from knowledge/knowledge.pdf (Lowi, SCTP, the 5 engagement
dimensions, the policy life cycle, street-level bureaucrats/blind spots, and
Lindblom's muddling through). This is the single place framework definitions
live — every LLM prompt is grounded against this text rather than the
model's own training-data notion of these terms, and it's the place to edit
when a framework's definition needs to change or a 7th framework is added.
"""

SPECIFICITY_MANDATE = """\
CRITICAL — SPECIFICITY REQUIREMENT
Generic descriptors ("small farmers," "large corporations," "high-tech sectors") are not acceptable on \
their own. Wherever the policy domain supports it, name the REAL, SPECIFIC Indian institutions, schemes, \
designations, official lists, or programs involved — the kind of concrete detail a policy professional \
would recognize immediately. Use the web research findings below (when provided) to identify these \
precisely; if none are provided and you are not confident of a specific name, say so explicitly with \
confidence="low" rather than inventing one.

Worked example of the specificity bar expected (Foreign Trade Policy, SCTP applied) — this is an \
illustration of the LEVEL OF CONCRETENESS required, not a template to copy for unrelated policies:
- Advantaged: Status Holders (1 to 5 Star Export Houses), Towns of Export Excellence (TEE), high-tech \
manufacturing sectors named in the policy.
- Contender: large multinational corporations or industries perceived to be involved in crony capitalism.
- Dependent: small-scale artisans, weavers, and craftsmen in the hinterland; small-scale farmers in \
Agri-Export Zones (AEZs).
- Deviant: entities on the Denied Entity List (DEL), firms engaged in illicit trade, violators of SCOMET \
(dual-use items) regulations.
Apply this same standard of naming real schemes, designations, and lists across ALL SIX frameworks below \
— e.g. specific bureaucratic roles for street-level implementers (not just "officials"), the actual \
scheme/act/notification a policy extends or departs from for the Lindblom scale, named institutional \
bodies for Lowi's typology, etc.
"""

FRAMEWORK_PRIMER = f"""\
You are a public policy analyst applying six established analytical frameworks. \
Use ONLY the definitions below — do not substitute your own understanding of these terms.

{SPECIFICITY_MANDATE}

1. LOWI'S POLICY TYPOLOGY (Theodore Lowi)
Classifies policy actions into three types, which can coexist in one policy at different weights:
- Regulatory: uses coercive techniques (rules, licensing, standards, bans, sanctions) to control \
individual or business conduct. Costs and benefits are both concentrated on the regulated party. Name \
the specific regulatory instrument or body involved (e.g. a named Act, licensing regime, or regulator) \
where the text or research supports it.
- Distributive: grants benefits, subsidies, or services to specific interest groups or sectors, \
with costs spread across the general taxpayer base. Low visibility, little public scrutiny. Name the \
specific scheme, subsidy program, or beneficiary designation involved.
- Redistributive: manipulates the allocation of wealth, property, or rights among broad social \
classes or groups. High visibility, high conflict, "zero-sum" framing between winners and losers.

2. SOCIAL CONSTRUCTION OF TARGET POPULATIONS (SCTP — Schneider & Ingram, house convention)
Every policy constructs the group(s) it targets along two axes: POLITICAL POWER (low..high) and \
SOCIAL CONSTRUCTION (negatively/"undeserving" .. positively/"deserving"). This dashboard uses the \
following quadrant convention — apply it exactly as given, even where it departs from other summaries \
of the framework you may have seen:
- Advantaged: LOW power, POSITIVE construction (e.g. small communities or groups held in high public \
regard without needing much lobbying power). Receive beneficial tools — outreach, entitlements without \
means-testing — because their positive image alone makes support politically safe.
- Contender: HIGH power, POSITIVE construction (e.g. established industries, veterans' bodies, scientific \
institutions with both real influence and a favorable public image). Receive visible, generous benefits — \
subsidies, tax breaks, entitlements — justified openly since both power and image support it.
- Dependent: LOW power, NEGATIVE construction (e.g. groups seen as needy but without leverage — poor \
farmers, marginalized communities). Receive paternalistic tools — means-tested subsidies, symbolic \
gestures, inadequate funding relative to need.
- Deviant: HIGH power, NEGATIVE construction (e.g. powerful actors viewed with suspicion — large \
corporations accused of exploitative or evasive practices). Nominally face coercive or punitive tools, \
though their power often lets them blunt enforcement in practice.
A single policy virtually always touches far more distinct groups than it first appears — direct \
beneficiaries, indirect beneficiaries, implementing intermediaries, regulated parties, excluded/adjacent \
groups, and groups affected only by second-order effects all count as distinct stakeholder groups. \
IDENTIFY AT LEAST 8 DISTINCT, SPECIFICALLY NAMED groups for every policy (official designations, scheme \
beneficiary categories, listed entities, sub-sectors, regional variants — see the worked example above), \
spread across whichever quadrants genuinely apply — not generic labels, and not near-duplicates of each \
other. Only return fewer than 8 if you are highly confident the policy genuinely cannot support that many \
meaningfully distinct groups, and say so explicitly in overall_reasoning. Set each group's power_score \
and construction_score (both 0.0-1.0) first from the concrete textual/research evidence, then derive the \
quadrant label from those two scores using the convention above (power ≥ 0.5 is "high", < 0.5 is "low"; \
construction ≥ 0.5 is "positive", < 0.5 is "negative") — never assign a quadrant that contradicts the \
two scores. Each group's rationale must be a concise 2-3 sentence explanation specific to that group — \
not a restatement of the quadrant definition (this rationale is shown on hover over that group's point on \
the plot, not printed below it).
`overall_reasoning` is the ONLY SCTP interpretation printed directly in the UI (not hover-gated), so it \
must be a substantive ~75-WORD plain-English explanation of what this SCTP mapping means for the policy \
as a whole — which quadrant(s) dominate, what that implies about whose interests the policy actually \
serves versus who bears the costs of its tools, and any equity or political-risk implications worth a \
policy professional's attention. Do not restate individual group scores or rationale — synthesize across \
them.

3. FIVE DIMENSIONS TO ENGAGE PEOPLE IN PUBLIC POLICY
- Educate: inform/"soften up" the public or policy community with information (reports, campaigns, hearings).
- Persuade: coordinate behavior through reasoning, framing, and discourse rather than force.
- Coerce: compel behavior via the state's legal/authoritative power (bans, mandates, sanctions).
- Strengthen: build capacity — training, technical assistance, institutional support, resource allocation.
- Incentivize: align self-interest with policy goals via rewards (carrots: subsidies, tax credits) or \
penalties (sticks: fines, withdrawal of benefits).
Score how strongly the policy relies on each dimension — a single policy typically uses several at once. \
Name the specific mechanism behind each non-trivial score (e.g. a named training program for Strengthen, \
a named subsidy for Incentivize) rather than describing the dimension abstractly.

4. POLICY LIFE CYCLE (six stages)
- Problem Identification & Agenda Setting: a condition is publicized and rises onto the government's \
active agenda.
- Policy Formulation: alternatives are drafted and debated by specialists/bureaucrats/think tanks.
- Legitimation & Adoption: a specific alternative is formally enacted (law, executive order, notification).
- Implementation: the policy is put into practice — agencies assigned, budgets allocated, rules issued.
- Evaluation: the policy's actual effects are being assessed against its intended results.
- Maintenance, Succession & Termination: the policy is continued as-is, replaced/amended, or discontinued.
Classify which stage this specific item's text places it at RIGHT NOW (e.g. "notified" implies \
Legitimation & Adoption or early Implementation; "proposed"/"draft" implies Formulation; a mid-course \
review implies Evaluation). Cite the specific notification, order, or scheme phase that anchors this \
classification where possible.

5. STREET-LEVEL BUREAUCRATS & POLICY BLIND SPOTS
Street-level bureaucrats (Lipsky) are the front-line public employees who actually deliver a policy and \
exercise discretion in doing so. Name the SPECIFIC role/designation this policy would realistically be \
implemented through (e.g. "DGFT Regional Authority licensing officers," "Block Development Officers," \
"Customs preventive officers at ICDs") rather than a generic "officials." Blind spots are unseen or \
under-considered gaps in a policy's design: groups filtered out of consideration, unanticipated side \
effects, institutional fragmentation between agencies, or issues assumed to be someone else's \
jurisdiction. Identify blind spots concretely tied to THIS policy's mechanism, not generic government \
failure modes.

6. LINDBLOM'S DISJOINTED INCREMENTALISM ("MUDDLING THROUGH") vs. THE RATIONAL-COMPREHENSIVE MODEL
The rational-comprehensive model (score near 0.0) exhaustively canvasses goals and alternatives before \
choosing the option that maximizes net value — typically a sweeping, from-first-principles redesign. \
Disjointed incrementalism (score near 1.0) makes small, marginal adjustments to the existing status quo, \
using successive limited comparisons rather than a comprehensive rethink. Score where this policy falls \
on that 0.0-1.0 continuum based on how much it departs from vs. extends the specific prior scheme, act, \
or notification it amends or replaces — name that prior policy where it is identifiable.

For every sub-result, ground the reasoning in concrete details from the policy text and any research \
findings provided — do not give generic reasoning that could apply to any policy. Every "reasoning" field \
(lowi.reasoning, engagement.reasoning, lifecycle.reasoning, implementation.reasoning, lindblom.reasoning) \
must be a CONCISE 3-4 SENTENCE explanation a policy professional could read in a few seconds — substantive \
and specific, not padded, not a restatement of the framework definition. If the text does not clearly \
support a confident classification, say so explicitly and use confidence="low" rather than guessing or \
inventing specific names that aren't supported by the evidence.
"""


def build_research_planning_prompt(
    title: str,
    description: str,
    ministry_name: str,
    pillar: str,
) -> str:
    return f"""You are about to analyze the following Indian government policy item using established \
public policy frameworks (Lowi's typology, SCTP, engagement dimensions, policy lifecycle, implementation \
analysis, Lindblom's incrementalism scale). The analysis needs to name real, specific institutions, \
schemes, designations, or official lists (e.g. a specific beneficiary scheme name, a specific regulatory \
list, a specific implementing agency) rather than generic descriptions.

POLICY ITEM
Title: {title}
Ministry: {ministry_name}
Pillar: {pillar}
Description: {description}

Decide whether searching the web would help you identify specific, current, real institutional detail \
for this policy (e.g. the exact scheme name, eligibility designations, current beneficiary figures, \
related official lists, or recent developments) that isn't already clear from the description above. \
If so, call web_search with up to 3 well-targeted queries. If the description already gives you enough \
specific detail to work with, don't call the tool at all — just respond with a brief note saying no \
search is needed."""


def build_intelligence_prompt(
    title: str,
    description: str,
    ministry_name: str,
    pillar: str,
    tags: list[str],
    research_context: str = "",
) -> str:
    tags_str = ", ".join(tags) if tags else "(none)"
    research_block = f"\n{research_context}\n" if research_context else ""
    return f"""{FRAMEWORK_PRIMER}

Analyze the following policy item using all six frameworks above. Return your answer as JSON matching \
the required schema exactly.

POLICY ITEM
Title: {title}
Ministry: {ministry_name}
Pillar: {pillar}
Tags: {tags_str}
Description: {description}
{research_block}"""
