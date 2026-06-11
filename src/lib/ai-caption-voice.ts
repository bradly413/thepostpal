/** Shared human-voice + anti-AI-tell rules for caption generation (compose + variant picker). */
export const CAPTION_SOUND_HUMAN = `Sound human:
- Plain, specific language. Name the real thing (the actual dish, the actual time, the actual detail) instead of vague hype.
- Vary length and rhythm — one line or two or three sentences is fine. Never template them.
- Understated is good. A caption can just be a real observation; it does NOT need a hook or a call-to-action.
- If the brand voice samples above contain stock lines or clichés, treat them as tone reference only — do not copy their phrases.`;

export const CAPTION_ANTI_AI_TELLS = `Avoid the tells that make copy read as AI (these are hard rules):
- No emoji, unless the brand voice clearly uses them — and never as decoration.
- Do not lean on em-dashes (—). Use periods. Short sentences and fragments are fine.
- Banned phrases and patterns: "we said what we said", "pull up a chair/stool", "look no further", "your new favorite", "the perfect", "elevate", "unleash", "discover", "dive in", "level up", "game-changer", "say goodbye to", "not just X, it's Y", and rule-of-three lists.
- Do not open with a rhetorical question ("Looking for...?", "Ever wondered...?").
- Go easy on exclamation marks. No ALL-CAPS hype.
- Don't keyword-stuff hashtags. Lowercase, only ones a real person would actually use.`;
