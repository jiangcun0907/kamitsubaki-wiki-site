# AI Observer Assistant Design

## Summary

Build a Kamitsubaki-themed AI assistant for the Astro fan wiki. The assistant appears as a polished chat widget in the lower-right corner of the site and is backed by a Cloudflare edge API. It helps new users understand KAMITSUBAKI STUDIO, summarizes wiki content, extends answers with trusted web sources, and answers questions with cited sources.

The selected architecture is:

- Astro remains a static wiki frontend.
- A Cloudflare Worker provides the AI API, search orchestration, streaming responses, auth, Turnstile validation, rate limiting, and persistence.
- Cloudflare D1 stores users, anonymous sessions, chat history, source citations, usage metadata, and abuse audit events.
- Durable Objects, KV, or cache-backed counters handle realtime rate limiting and high-frequency abuse controls when D1 is not the right realtime primitive.

The assistant persona is an "observer guide": warm, clear, and lightly aligned with the KAMITSUBAKI world view, without becoming a rigid customer-service bot or inventing unverified lore.

## Goals

- Add a full-site AI chat entry point that feels native to the existing KAMITSUBAKI visual system.
- Support smooth open/close transitions, thinking animation, streaming answer display, and a collapsed thinking state.
- Retrieve information from trusted KAMITSUBAKI-related sources, then expand to broader web search only when needed.
- Help new users quickly understand KAMITSUBAKI, artists, projects, wiki entries, and the site structure.
- Save complete chat history for logged-in users and anonymous users, with safe identity and IP handling.
- Support anonymous use, GitHub login, and Google login.
- Use Cloudflare Turnstile from the first release as part of a layered anti-abuse system.
- Keep provider choice configurable so OpenAI can be the initial default while Cloudflare Workers AI or other providers can be added later.

## Non-Goals

- Do not convert the Astro site into a traditional server-rendered app.
- Do not expose model, search, OAuth, Turnstile, or database secrets to the browser.
- Do not build a full admin dashboard in the first release.
- Do not make the assistant answer every topic as a general-purpose chatbot.
- Do not display full IP addresses or precise city-level location in greeting copy.
- Do not store internal prompts, hidden chain-of-thought, or secrets in chat logs.

## Existing Project Context

The current site is a static Astro wiki with localized routes under `/zh/`, `/ja/`, and `/en/`. Global UI and metadata are composed through `src/layouts/BaseLayout.astro`, with shared browser interactions in `src/scripts/siteInteractions.js` and the main visual language in `src/styles/global.css`.

The site already uses a dark, high-contrast, fine-line visual system with noise texture, monospace labels, subtle cyan-green accents, and "observation terminal" language. The AI assistant should extend this design instead of introducing a generic SaaS support widget.

## Architecture

### Frontend

Add a full-site chat widget mounted from the shared layout.

Suggested modules:

- `src/components/AiChatWidget.astro`: static HTML shell and localized labels.
- `src/scripts/aiChatWidget.js`: widget state, streaming parser, Turnstile flow, local anonymous session handling, and UI events.
- `src/styles/global.css`: assistant visual system and animation classes, or a dedicated imported stylesheet if the CSS grows too large.
- `src/content/site/*.json`: localized assistant labels if the copy should remain content-managed.

The widget should call the Worker API using same-origin paths when deployed on Cloudflare:

- `GET /api/ai/bootstrap`
- `POST /api/ai/chat`
- `GET /api/ai/history`
- `DELETE /api/ai/history`
- `GET /api/auth/github/start`
- `GET /api/auth/github/callback`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/auth/logout`

If static hosting and Worker API use different domains, the API must explicitly support CORS and secure cookie settings for that deployment. Same-origin deployment is the preferred production shape.

### Cloudflare Worker Backend

The Worker owns all privileged behavior:

- Validate Turnstile tokens server-side.
- Create and recover anonymous sessions.
- Handle GitHub and Google OAuth.
- Merge anonymous chat history into a logged-in user after login.
- Apply rate limits and anti-abuse checks.
- Retrieve trusted source material.
- Construct model-safe context packs.
- Stream model responses to the browser.
- Store chat messages, source citations, usage metadata, and abuse events.

### Storage

D1 is the authoritative relational database for users, sessions, messages, sources, and audit records. Realtime rate-limit counters should use Durable Objects, KV, cache, or another low-latency primitive when needed, with D1 storing durable abuse events and usage summaries.

### Provider Abstraction

The backend exposes a stable model provider interface so the frontend never depends on OpenAI-specific or Cloudflare-specific event formats.

Initial provider:

- OpenAI API, because multilingual reasoning, Chinese/Japanese handling, and summarization quality matter for this wiki.

Future providers:

- Cloudflare Workers AI.
- Other OpenAI-compatible providers.

Provider interface:

- `generateStream({ messages, sources, locale, userContext, safetyContext })`
- `summarizeSources({ query, sources, locale })`
- `classifyIntent({ message, locale })`

The Worker emits normalized stream events:

- `status`: retrieval and generation status shown by the UI.
- `delta`: answer text fragments.
- `source`: source citation card metadata.
- `challenge_required`: Turnstile challenge is needed before continuing.
- `done`: stream completed.
- `error`: recoverable failure.

## User Experience

### Entry Button

The lower-right button is an "observation beacon", not a generic chat bubble. It should use:

- A fine-line circular or rounded-square frame.
- Subtle breathing light.
- Cyan-green accent state.
- Small status dot.
- Tooltip bubble with short copy such as "需要观测线索吗".

When the chat is collapsed and the assistant is thinking, the button changes state:

- Animated scan ring or pulse.
- Small step text in the tooltip, such as "正在检索档案".
- Completion hint, such as "观测结果已抵达".

### Chat Window

Desktop:

- Lower-right floating panel.
- Dark translucent surface.
- Fine borders, subtle noise, and monospace system labels.
- Responsive width that does not cover core article content.

Mobile:

- Bottom sheet style panel.
- Takes most of the viewport height but leaves safe area spacing.
- Input and controls remain reachable with the software keyboard open.

Core controls:

- Open and collapse.
- New conversation.
- Clear current history.
- Login or account menu.
- Send.
- Stop generation.
- Optional source panel expansion.

Keyboard behavior:

- Enter sends.
- Shift+Enter inserts a line break.
- Escape collapses the widget when focus is inside the panel.

### Thinking And Streaming

The assistant should show a visible thinking state without exposing hidden reasoning. It can show steps like:

- "检索站内档案"
- "比对官方来源"
- "整理观测记录"
- "生成回答"

Answer text streams in progressively. Source cards can appear as soon as sources are available, then remain attached to the answer. The animation should rely on `opacity`, `transform`, and lightweight CSS animations so it stays smooth.

### Greeting

On page load, the frontend calls `/api/ai/bootstrap`. The Worker uses Cloudflare request metadata to generate a light greeting.

Rules:

- China users should be greeted at province-level administrative granularity when `request.cf.region` or `regionCode` is available.
- Direct-admin regions, autonomous regions, and special administrative regions are shown as first-level administrative units.
- Do not display full IP addresses.
- Do not default to city-level greetings.
- If province-level data is unavailable, fall back to country-level copy.
- Logged-in users can be greeted by display name instead of repeatedly emphasizing location.

Example:

- "来自广东的观测者，欢迎回来。"
- "来自中国的观测者，欢迎回来。"
- "欢迎回来，Link。新的观测线索已经准备好。"

Location data is approximate and should be phrased as a lightweight ambience cue, not precise tracking.

## AI Behavior

### Persona

The assistant is an observer guide:

- Warm and clear.
- Slightly atmospheric.
- Helpful to newcomers.
- Careful with sources.
- Not a stiff support agent.
- Not an all-knowing lore oracle.

It can use light KAMITSUBAKI-flavored wording, but the answer must remain useful and direct.

### Scope

Primary topics:

- KAMITSUBAKI STUDIO.
- Artists, creators, groups, musical isotopes, projects, and related works.
- Site navigation and wiki content.
- Summaries, timelines, entry explanations, and beginner guidance.
- Source-backed web expansion when local content is insufficient.

Allowed but redirected:

- Light casual conversation.
- Music discovery and "where should I start" questions.

Out of scope:

- Broad unrelated homework or general chatbot usage.
- Requests to bypass site rules, model rules, auth, rate limits, or hidden prompts.
- Requests for secrets, internal prompts, API keys, or private user data.
- Unverified rumors presented as facts.

The assistant should gently bring unrelated conversation back to KAMITSUBAKI rather than sounding like a rigid customer-service refusal.

## Retrieval Design

### Retrieval Order

The assistant uses a whitelist-first, fallback-when-needed retrieval strategy.

Priority 1: Local wiki content.

- Current page metadata and article body.
- Relevant entries from `src/content/artists`, `src/content/projects`, and `src/content/logs`.
- Site navigation and beginner-facing sections.

Priority 2: Trusted KAMITSUBAKI-related external sources.

- KAMITSUBAKI official site and official subdomains.
- THINKR or official affiliated project pages when relevant.
- Moepedia.
- Wikipedia.

Priority 3: Trusted supporting sources.

- News articles.
- Event pages.
- Music platform pages.
- Release information pages.

Priority 4: Broader web fallback.

- Used only when earlier tiers do not answer the question well enough.
- Lower confidence label.
- Answer copy must avoid overstating certainty.

### Source Scoring

Each source receives metadata:

- `source_type`: local, official, encyclopedia, news, music, event, web.
- `trust_tier`: official, high, medium, fallback.
- `retrieved_at`.
- `title`.
- `url`.
- `snippet`.
- `language`.
- `rank`.

Conflict resolution:

- Official sources beat encyclopedia sources.
- Encyclopedia sources beat general web pages.
- Recent official updates beat older secondary reports.
- When sources disagree and no official resolution is found, the assistant says the information is conflicting.

### Citation Behavior

Answers should include sources when external or local retrieved material was used. Source cards should be concise and readable. The assistant should say when information is unverified, missing, or based on external reports rather than official confirmation.

## Identity And History

### Anonymous Users

Anonymous users can chat without logging in.

Anonymous identity is based on:

- `anonymous_session_id`: a secure random browser session identifier.
- `ip_hash`: an HMAC hash of the connecting IP using a server-side secret.
- Optional `ua_hash`: hashed user-agent for risk signals, not as a sole identity.

Anonymous history retrieval must match both `anonymous_session_id` and `ip_hash`. It must not use only IP, because shared networks can cause accidental record exposure.

### Logged-In Users

GitHub and Google login are supported.

Logged-in chat history is attached to `user_id`.

OAuth identities are stored separately so one user can bind both providers:

- GitHub identity.
- Google identity.

When an anonymous user logs in, the current anonymous session can be merged into the logged-in user after explicit or implicit confirmation in the login flow. After merge, future history reads use `user_id`.

### History Controls

Users can:

- Continue previous conversations.
- Start a new conversation.
- Clear a current thread.
- Delete all visible chat history.
- Log out.

Deletion hides or removes user-visible chat content. Short-lived, de-identified abuse audit records can remain for security and rate-limit integrity.

## Database Design

The D1 schema should be migration-managed and designed for stable ownership, clean deletion, OAuth expansion, and auditability.

### Core Tables

`users`

- `id`
- `display_name`
- `avatar_url`
- `primary_locale`
- `created_at`
- `updated_at`
- `deleted_at`

`user_identities`

- `id`
- `user_id`
- `provider`
- `provider_user_id`
- `provider_username`
- `provider_email_hash`
- `created_at`
- `updated_at`
- Unique index on `provider, provider_user_id`.

`anonymous_sessions`

- `id`
- `session_token_hash`
- `ip_hash`
- `ua_hash`
- `country`
- `region`
- `region_code`
- `created_at`
- `last_seen_at`
- `merged_user_id`
- `deleted_at`

`chat_threads`

- `id`
- `user_id`
- `anonymous_session_id`
- `title`
- `locale`
- `status`
- `created_at`
- `updated_at`
- `deleted_at`

Exactly one of `user_id` or `anonymous_session_id` should own a thread before merge. After merge, the thread should move to `user_id` while preserving merge audit metadata.

`chat_messages`

- `id`
- `thread_id`
- `role`
- `content`
- `status`
- `model_provider`
- `model_name`
- `token_input`
- `token_output`
- `latency_ms`
- `error_code`
- `created_at`
- `updated_at`
- `deleted_at`

Do not store internal hidden prompts or chain-of-thought. Store user-visible messages and necessary model metadata only.

`chat_sources`

- `id`
- `message_id`
- `source_type`
- `trust_tier`
- `title`
- `url`
- `snippet`
- `language`
- `rank`
- `retrieved_at`
- `created_at`

`search_events`

- `id`
- `thread_id`
- `message_id`
- `query`
- `search_scope`
- `result_count`
- `used_fallback_web`
- `created_at`

`usage_events`

- `id`
- `user_id`
- `anonymous_session_id`
- `ip_hash`
- `event_type`
- `model_provider`
- `model_name`
- `token_input`
- `token_output`
- `latency_ms`
- `created_at`

`abuse_events`

- `id`
- `user_id`
- `anonymous_session_id`
- `ip_hash`
- `event_type`
- `severity`
- `reason`
- `turnstile_required`
- `turnstile_passed`
- `created_at`

`deletion_requests`

- `id`
- `user_id`
- `anonymous_session_id`
- `request_type`
- `status`
- `created_at`
- `completed_at`

### Indexing

Required indexes:

- `user_identities(provider, provider_user_id)`
- `anonymous_sessions(session_token_hash, ip_hash)`
- `chat_threads(user_id, updated_at)`
- `chat_threads(anonymous_session_id, updated_at)`
- `chat_messages(thread_id, created_at)`
- `chat_sources(message_id, rank)`
- `usage_events(user_id, created_at)`
- `usage_events(anonymous_session_id, created_at)`
- `usage_events(ip_hash, created_at)`
- `abuse_events(ip_hash, created_at)`

### Data Protection

- Store `ip_hash`, not plaintext IP.
- Use HMAC with a server-side secret for IP hashing.
- Do not expose anonymous session IDs in API responses beyond the client cookie/token that owns the session.
- Do not store API keys, OAuth secrets, Turnstile secrets, or provider secrets in D1.
- Do not store complete internal prompts.
- Keep user-visible deletion behavior clear.

## Anti-Abuse Design

The system uses layered controls so normal users are not bothered.

Controls:

- Per-IP hash rate limits.
- Per-anonymous-session rate limits.
- Per-user rate limits.
- Message length limits.
- Concurrent generation limits.
- Prompt-injection and secret-extraction intent checks.
- Turnstile challenge on suspicious or high-frequency anonymous requests.
- Stricter limits for unauthenticated users, higher limits for logged-in users.
- Abuse event logging with de-identified IP hash.

Turnstile rules:

- Turnstile is enabled in v1.
- Client-side token alone is not trusted.
- Worker validates token server-side with Cloudflare Siteverify.
- Challenge tokens are single-use and short-lived, so failed or expired tokens require a new challenge.
- If Turnstile is required mid-flow, the frontend keeps the user's draft and resumes the request after successful verification.

Tone:

- Do not sound like a hard customer-service script.
- When limiting a user, use short observer-themed copy such as "观测频率过高，先确认一下信标。"

## API Design

### `GET /api/ai/bootstrap`

Purpose:

- Create or recover anonymous session.
- Read login state.
- Return greeting, region-level ambience, Turnstile site key, active thread summary, and feature flags.

Response fields:

- `viewer`
- `greeting`
- `turnstile`
- `limits`
- `recentThreads`
- `featureFlags`

### `POST /api/ai/chat`

Purpose:

- Accept a user message and stream back normalized AI events.

Request fields:

- `threadId`
- `message`
- `locale`
- `pageContext`
- `turnstileToken`

Response:

- `text/event-stream` or another streaming format with normalized events.

### `GET /api/ai/history`

Purpose:

- Return visible chat threads and messages for the current logged-in user or matching anonymous session.

### `DELETE /api/ai/history`

Purpose:

- Clear current thread or all visible chat history for the current identity.

### Auth Routes

OAuth routes:

- `GET /api/auth/github/start`
- `GET /api/auth/github/callback`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/auth/logout`

OAuth state must be signed and short-lived. Login callback should safely merge the current anonymous session into the logged-in user when appropriate.

## Error Handling

Model provider failure:

- Return a friendly error event.
- Preserve the user's message.
- Allow retry.

Search failure:

- Answer from local wiki context when possible.
- Clearly say external retrieval is temporarily unavailable.

Turnstile failure:

- Show the verification UI inline.
- Do not lose the user's draft.

Network interruption:

- Frontend keeps the last unsent draft.
- If stream disconnects, show retry affordance.

Collapsed window during generation:

- Stream continues.
- Entry button shows thinking state.
- Completion bubble appears when done.

## Configuration

Public frontend configuration:

- API base path.
- Turnstile site key.
- Feature flag for enabling the assistant.
- Optional default locale labels.

Private Worker secrets:

- OpenAI API key.
- Optional Cloudflare Workers AI binding.
- OAuth GitHub client secret.
- OAuth Google client secret.
- Turnstile secret key.
- IP hash HMAC secret.
- Search provider key if the selected search implementation requires one.

No private secret is available to browser JavaScript.

## Rollout Plan

Phase 1: Full vertical slice.

- Frontend widget shell.
- Mock streaming provider.
- Bootstrap API.
- Anonymous session creation.
- Basic D1 schema and migrations.
- Basic Turnstile flow.

Phase 2: Real AI and retrieval.

- OpenAI provider.
- Local wiki context pack.
- Trusted external source search.
- Source cards.
- Streamed answer generation.

Phase 3: Identity and history.

- GitHub login.
- Google login.
- History persistence and merge.
- Clear/delete history.

Phase 4: Abuse hardening.

- Per-IP hash, per-session, and per-user limits.
- Turnstile escalation policy.
- Abuse and usage events.
- Provider failure handling.

Phase 5: Polish and QA.

- Desktop and mobile animation tuning.
- Collapsed thinking state.
- Province-level China greeting.
- Accessibility pass.
- Production deployment checks.

## Testing Strategy

Existing project checks remain required:

- `pnpm test`
- `pnpm check`
- `pnpm build`

Frontend tests:

- Widget opens and collapses.
- Input sends with Enter and supports Shift+Enter.
- Streaming events append text without layout jumps.
- Thinking animation appears in panel and collapsed button state.
- Turnstile challenge preserves the pending message.
- Mobile layout does not overlap input or primary page content.
- History clear/delete UI updates state.

Worker tests:

- Bootstrap creates and recovers anonymous sessions.
- China greeting uses region-level data when available and falls back safely.
- Turnstile validation happens server-side.
- Anonymous history requires both session and IP hash.
- Logged-in history uses `user_id`.
- Login merge moves anonymous threads to the user.
- Rate limits trigger before expensive model calls.
- Retrieval respects trust tiers and fallback rules.
- Stream output follows normalized event schema.

Database tests:

- Migrations create expected tables and indexes.
- OAuth identities enforce provider uniqueness.
- Soft-deleted threads are not returned in history.
- Source records attach to the correct assistant message.

Security tests:

- No private secrets appear in browser bundles.
- Prompt-injection requests do not reveal hidden instructions.
- Over-limit users get Turnstile or rate-limit responses.
- Shared-IP anonymous sessions do not leak history across different session IDs.

## References

- Cloudflare Turnstile server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Cloudflare Workers request metadata: https://developers.cloudflare.com/workers/runtime-apis/request/
- Cloudflare Workers streams: https://developers.cloudflare.com/workers/runtime-apis/streams/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- OpenAI streaming responses: https://developers.openai.com/api/docs/guides/streaming-responses
