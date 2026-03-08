import os
from typing import Optional, Tuple

from dotenv import load_dotenv
from openai import OpenAI
from uagents import Agent, Context, Model

load_dotenv()

ASI_CLOUD_API_KEY = os.getenv("ASICLOUD_API_KEY")
if not ASI_CLOUD_API_KEY:
    raise RuntimeError("Missing ASICLOUD API key. Please set ASICLOUD_API_KEY in your environment.")

client = OpenAI(
    api_key=ASI_CLOUD_API_KEY,
    base_url=os.getenv("ASICLOUD_BASE_URL", "https://inference.asicloud.cudos.org/v1"),
)

MODEL_NAME = os.getenv("PROMPT_IMPROVER_MODEL", "openai/gpt-oss-20b")
GENERATION_CONFIG = {"temperature": 0.7, "top_p": 0.95, "max_tokens": 400}
PROMPT_IMPROVER_SYSTEM_PROMPT = """
Role: Expert Prompt Engineer.
Goal: Transform user prompts into clear, specific, and effective instructions while preserving intent.

Instructions:

Prompt Categorization:
Analyze the provided prompt and categorize it into one of the following core categories (select the most appropriate):
- Creative Writing (e.g., novels, scripts, poetry)
- Technical Documentation (e.g., manuals, API guides)
- Marketing & Advertising (e.g., ads, social media posts)
- Academic & Research (e.g., papers, theses)
- User Interface/UX Design (e.g., wireframes, prototypes)
- Digital Art & Graphic Design (e.g., NFTs, digital paintings)
- Video Production (e.g., storyboards, editing guidelines)
- Music Composition (e.g., scores, lyrics)
- Customer Service (e.g., scripts, FAQs)
- Business Strategy (e.g., plans, proposals)
Use the selected category to tailor language, technical terms, and contextual details.

Enhancement Objectives:

Clarity:
- Replace ambiguous terms (e.g., 'some', 'a few') with exact quantities or percentages.
- Break complex instructions into step-by-step actions.
- Use active voice and imperative phrasing.

Specificity:
- Include exact measurements, technical specifications, or brand names (e.g., 'Adobe Photoshop 2023').
- Define target demographics (e.g., 'millennial urban professionals').
- Specify platforms, tools, or formats (e.g., '4K resolution video for YouTube Shorts').

Context:
- Add background on the project's purpose, audience, or cultural setting.
- Clarify industry standards (e.g., 'GDPR compliance for EU users').
- State the intended use case (e.g., 'for a corporate annual report').

Constraints:
- Define strict parameters (e.g., '200-word limit', 'budget of $5,000').
- Specify technical requirements (e.g., 'compatible with iOS 16 and above').
- Set boundaries for creativity (e.g., 'avoid political references').

Usability:
- Structure instructions with numbered steps or bullet points where appropriate.
- Use clear headings only if the user already used headings.
- Include examples or templates only if they add clarity and the user expects them.

Comprehensiveness:
- Address edge cases (e.g., 'include fallback options for low-bandwidth users').
- Cover all deliverables (e.g., 'final files in .PNG and .SVG formats').
- Anticipate user questions (e.g., 'explain how to adjust for different screen sizes').

Preservation of Intent & Format:
- Cross-reference the enhanced prompt against the original to ensure alignment.
- Preserve the user's existing structure and formatting. Do NOT introduce new titles, subtitles, or sections unless the user already used them.
- If the user used headings/sections, keep that pattern; otherwise, keep a single inline prompt.

Target-specific guidance:
- TEXT target: Focus on clarity, actionable instructions, constraints, and expected outputs without adding new headings.
- IMAGE target: Optimize visual clarity (subject, composition) and fold attributes inline (style, medium, lighting, color palette, camera/lens/angle, aspect ratio, negatives) without adding headings.

Output Rules:
- Return ONLY the improved prompt, with no meta commentary or explanations.
- Preserve the user's structural style (headings, bullets, paragraphs) and do not add titles/subtitles unless the user did so.
"""

agent = Agent(
    name="prompthash_prompt_improver",
    seed="prompthash_prompt_improver_seed_phrase",
    port=int(os.getenv("PROMPT_IMPROVER_PORT", "8011")),
    mailbox=True,
)


class ImproveRequest(Model):
    prompt: str
    target: Optional[str] = None


class ImproveResponse(Model):
    response: str
    target: str
    model: str
    error: Optional[str] = None


class HealthResponse(Model):
    status: str
    agent_name: str
    total_requests: int


def _normalize_target(target: Optional[str]) -> str:
    value = (target or "text").strip().lower()
    return "image" if value == "image" else "text"


def _build_improvement_prompt(prompt: str, target: str) -> str:
    target_section = (
        "Target: IMAGE prompt. Optimize for image models (describe visuals with concrete nouns/adjectives; fold style, lighting, camera, aspect ratio inline; avoid new headings).\n"
        if target == "image"
        else "Target: TEXT prompt. Optimize for clarity, structure, and implementable instructions without adding new headings.\n"
    )

    return (
        f"{target_section}"
        "Improve the following prompt according to the instructions.\n\n"
        "USER PROMPT:\n"
        f"{prompt}\n\n"
        "Return ONLY the improved prompt, nothing else."
    )


def _improve(prompt: str, target: str) -> Tuple[str, str]:
    normalized_target = _normalize_target(target)
    messages = [
        {"role": "system", "content": PROMPT_IMPROVER_SYSTEM_PROMPT},
        {"role": "user", "content": _build_improvement_prompt(prompt, normalized_target)},
    ]
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        **GENERATION_CONFIG,
    )
    content = response.choices[0].message.content.strip()
    return content, normalized_target


@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.storage.set("total_requests", 0)
    ctx.logger.info(f"Prompt improver agent started at {agent.address}")


@agent.on_event("shutdown")
async def shutdown(ctx: Context):
    ctx.logger.info("Shutting down prompt improver agent")


@agent.on_rest_post("/improve", ImproveRequest, ImproveResponse)
async def improve_prompt(ctx: Context, req: ImproveRequest) -> ImproveResponse:
    user_prompt = (req.prompt or "").strip()
    target = req.target or "text"

    total = ctx.storage.get("total_requests") or 0
    if not user_prompt:
        return ImproveResponse(
            response="",
            target=_normalize_target(target),
            model=MODEL_NAME,
            error="Please provide a prompt to improve.",
        )

    try:
        ctx.logger.info(f"Improving prompt for target '{target}'")
        improved, normalized_target = _improve(user_prompt, target)
        ctx.storage.set("total_requests", total + 1)
        return ImproveResponse(
            response=improved,
            target=normalized_target,
            model=MODEL_NAME,
        )
    except Exception as exc:
        ctx.logger.error(f"Error improving prompt: {exc}")
        return ImproveResponse(
            response="",
            target=_normalize_target(target),
            model=MODEL_NAME,
            error="Failed to improve prompt. Please try again.",
        )


@agent.on_rest_get("/health", HealthResponse)
async def rest_health(ctx: Context) -> HealthResponse:
    total = ctx.storage.get("total_requests") or 0
    return HealthResponse(status="ok", agent_name=agent.name, total_requests=total)


if __name__ == "__main__":
    agent.run()
