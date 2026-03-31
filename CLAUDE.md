@AGENTS.md

# Session Memory Protocol

## At the start of EVERY session, you MUST:
1. Read `/Users/yashpatil/.claude/projects/-Users-yashpatil-Binge/memory/progress.md` — full current state, pending work, entire feature roadmap
2. Read `/Users/yashpatil/.claude/projects/-Users-yashpatil-Binge/memory/tech_stack.md` — tech constraints, all installed skills and MCPs
3. Read `/Users/yashpatil/.claude/projects/-Users-yashpatil-Binge/memory/feedback_preferences.md` — design rules, UX preferences, what NOT to do

Do not start any work until you have read these three files. Do not ask the user to remind you of context — it is all in those files.

After reading, do NOT ask "what do you want to tackle?" — immediately begin executing STEP 1 from progress.md without asking for permission or confirmation unless a step explicitly requires user input (like Vercel env vars or calling an endpoint).

## During every session, you MUST:
- Update `progress.md` immediately after completing any feature, fix, or meaningful task — do NOT batch to end of session
- Update `tech_stack.md` immediately after installing any skill, package, or MCP
- Update relevant memory files immediately after any decision — not at the end

## Skills — use ALL aggressively on every task (do not wait to be asked):
- Before any UI code → `ui-ux-pro-max` + `frontend-design`
- Before any feature → `superpowers` to plan
- Before any deploy → `code-review` + `security-guidance`
- Track all work with `gsd` (get-shit-done)
