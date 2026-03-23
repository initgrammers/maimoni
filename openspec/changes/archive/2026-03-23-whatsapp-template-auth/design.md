# Design: WhatsApp Template Auth

## Technical Approach

Replace the plain-text `body` parameter in the Twilio Messages API call within `_sendWhatsAppCode()` with Twilio's pre-approved template-based approach using `contentSid` and `contentVariables`. This ensures compliance with WhatsApp's Business Messaging policy which requires all outbound messages to use approved templates. The change is isolated to `apps/auth/src/providers.ts` and `infra/auth.ts`, with no modifications to the database schema or API routes.

## Architecture Decisions

### Decision: contentVariables JSON structure for Twilio template substitution

**Choice**: `JSON.stringify({ "1": code })`

**Alternatives considered**:
- `JSON.stringify({ 1: code })` (number key) — Twilio's Content API uses string keys for variables
- `JSON.stringify({ "{{1}}": code })` — incorrectly wraps the variable placeholder

**Rationale**: Twilio's WhatsApp template API requires `contentVariables` to be a JSON string where keys are the 1-indexed variable indices matching `{{1}}`, `{{2}}`, etc. in the template. The template `maimoni_opt_es` uses `{{1}}` for the verification code, so key `"1"` with string value of the code is correct. The stringification is required because Twilio's `messages.create` accepts `contentVariables` as a string.

### Decision: Environment variable validation strategy

**Choice**: Use existing `getEnv()` pattern from `@maimoni/utils` — throws descriptive error if `TWILIO_WHATSAPP_TEMPLATE_SID` is missing.

**Alternatives considered**:
- Custom validation with specific error message — adds unnecessary code; `getEnv` already throws `"Environment variable X is required but not defined."`
- Optional env var with fallback to SMS — would silently degrade; we want explicit failure

**Rationale**: The project convention (per `AGENTS.md` and `infra/AGENTS.md`) mandates `getEnv()` for all env access. When the var is missing, `getEnv` throws with the var name, which is sufficient for debugging. The Twilio API call never executes if env is missing, so the error surfaces at send time.

### Decision: Auth channel constant type

**Choice**: Keep `AUTH_CHANNEL` as `const` with literal type `'whatsapp' | 'sms' | 'beta'`

**Alternatives considered**:
- Make it a runtime string config via env var — adds complexity for a one-time switch
- Move to `AUTH_CHANNEL` env var — unnecessary indirection for permanent change

**Rationale**: The proposal states this is a permanent switch from SMS to WhatsApp. Using a TypeScript const with a literal type provides compile-time safety and self-documents the allowed values.

### Decision: Error handling for Twilio API responses

**Choice**: Let Twilio API errors propagate naturally; no custom wrapping in `_sendWhatsAppCode`.

**Alternatives considered**:
- Wrap in custom `WhatsAppTemplateError` — adds a new error type for marginal benefit
- Catch and re-throw with phone number context — obscures the real Twilio error

**Rationale**: The proposal says the verification flow "SHALL fail gracefully with user feedback." OpenAuth's `CodeProvider` already handles provider errors and displays user-facing messages. Propagating the raw Twilio error maintains debuggability.

## Data Flow

```
User submits phone number
        │
        ▼
WhatsAppCodeProvider.sendCode(phoneNumber, code)
        │
        ▼
AUTH_CHANNEL === 'whatsapp'
        │
        ▼
_sendWhatsAppCode(phoneNumber, code)
        │
        ├─ getEnv('TWILIO_WHATSAPP_TEMPLATE_SID')  ──► template SID
        ├─ getEnv('TWILIO_WHATSAPP_NUMBER')        ──► from number
        ├─ normalizePhoneNumber(phoneNumber)        ──► +593981234567
        │
        ▼
twilioClient.messages.create({
  contentSid: 'HX8c2079fcec8af506be41b602fb46c777',
  contentVariables: '{"1":"123456"}',
  from: 'whatsapp:+1234567890',
  to: 'whatsapp:+593981234567',
})
        │
        ▼
Twilio delivers WhatsApp message via maimoni_opt_es template
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/auth/src/providers.ts` | Modify | Switch `_sendWhatsAppCode` to template API; change `AUTH_CHANNEL` to `'whatsapp'`; uncomment WhatsApp code path |
| `infra/auth.ts` | Modify | Add `TWILIO_WHATSAPP_TEMPLATE_SID` to `getEnv` list and `environment` block |
| `apps/auth/.env.example` | Create | Document `TWILIO_WHATSAPP_TEMPLATE_SID` for local development |

## Interfaces / Contracts

### `_sendWhatsAppCode` function signature (unchanged)

```typescript
async function _sendWhatsAppCode(phoneNumber: string, code: string): Promise<void>
```

**Changes to internal Twilio call**:

```typescript
// BEFORE
await twilioClient.messages.create({
  body: `Tu codigo de verificacion para Maimonei es: ${code}`,
  from: `whatsapp:${whatsappNumber}`,
  to: `whatsapp:${ecuadorPhoneNumber}`,
});

// AFTER
const templateSid = getEnv('TWILIO_WHATSAPP_TEMPLATE_SID');
await twilioClient.messages.create({
  contentSid: templateSid,
  contentVariables: JSON.stringify({ '1': code }),
  from: `whatsapp:${whatsappNumber}`,
  to: `whatsapp:${ecuadorPhoneNumber}`,
});
```

### `AUTH_CHANNEL` constant

```typescript
// BEFORE
export const AUTH_CHANNEL = 'sms' as 'whatsapp' | 'sms' | 'beta';

// AFTER
export const AUTH_CHANNEL = 'whatsapp' as 'whatsapp' | 'sms' | 'beta';
```

### `WhatsAppCodeProvider.sendCode` (uncommented path)

```typescript
sendCode: async (claims, code) => {
  const phoneNumber = claims.phone ?? claims.phoneNumber;
  if (!phoneNumber) throw new Error('Phone number is required');

  console.log('Sending code via', AUTH_CHANNEL, 'to', phoneNumber);
  console.log('Code:', code);

  if (AUTH_CHANNEL === 'whatsapp') {
    await _sendWhatsAppCode(phoneNumber, code);
  } else if (AUTH_CHANNEL === 'sms') {
    await _sendSMSCode(phoneNumber, code);
  } else {
    await _sendBetaModeMessage(phoneNumber, code);
  }
},
```

### Infra environment block

```typescript
environment: {
  ...getEnv([
    'DATABASE_URL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_MESSAGING_SERVICE_SID',
    'TWILIO_WHATSAPP_NUMBER',
    'TWILIO_WHATSAPP_TEMPLATE_SID',  // NEW
  ]),
  // ...
},
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `_sendWhatsAppCode` constructs correct Twilio payload | Mock `twilioClient.messages.create`; assert `contentSid` and `contentVariables` shape |
| Unit | `normalizePhoneNumber` for edge cases | Table-driven tests: with/without `+`, with `0` prefix, Ecuador/Argentina codes |
| Unit | `AUTH_CHANNEL === 'whatsapp'` routes to correct function | Stub `_sendWhatsAppCode` and verify it's called |
| Integration | Full WhatsApp send flow with real Twilio | Manual; automatic integration tests require Twilio test credentials |
| E2E | Complete auth flow via Playwright | Mock Twilio; verify WhatsApp message trigger |

**Note**: The proposal explicitly states "manual verification only" for Twilio API calls. Unit tests use mocked Twilio clients to assert payload shape without making real API calls.

## Migration / Rollout

No migration required. This change is:
- Additive: adds a new env var, does not remove existing ones
- Reversible: rollback plan in proposal (revert `AUTH_CHANNEL` to `'sms'`, re-comment WhatsApp path)
- No database schema changes

**Rollout sequence**:
1. Add `TWILIO_WHATSAPP_TEMPLATE_SID` to `infra/auth.ts`
2. Create `apps/auth/.env.example` documenting the new var
3. Deploy `infra/auth.ts` (SST handles secret/SecretManager propagation)
4. Update `providers.ts` and deploy `apps/auth`
5. Verify template approval status in Twilio Console before traffic switch
6. Change `AUTH_CHANNEL` to `'whatsapp'` (or keep `'sms'` until template is approved)

## Open Questions

- [ ] **Template approval timeline**: The proposal assumes the template is pre-approved. Is `HX8c2079fcec8af506be41b602fb46c777` already approved in the Twilio account, or is this pending?
- [ ] **Local development env var**: Should `TWILIO_WHATSAPP_TEMPLATE_SID` be added to a `.env.example` file for local dev, or only to `infra/auth.ts` for production? (Decision: create `.env.example` to document the var for local testing.)

## Sequence Diagram — WhatsApp Auth Flow

```
┌────────┐     ┌─────────────┐     ┌──────────────────┐     ┌────────────┐
│ Browser│     │ OpenAuth    │     │ providers.ts     │     │ Twilio     │
│        │     │ CodeProvider │     │ _sendWhatsAppCode│     │ Messages   │
└───┬────┘     └──────┬──────┘     └────────┬─────────┘     └─────┬──────┘
    │                 │                      │                      │
    │ POST /auth      │                      │                      │
    │ phone=...       │                      │                      │
    │────────────────>│                      │                      │
    │                 │                      │                      │
    │                 │ sendCode(claims,     │                      │
    │                 │              code)  │                      │
    │                 │─────────────────────>│                      │
    │                 │                      │                      │
    │                 │                      │ getEnv('TWILIO_..._SID')
    │                 │                      │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─>│
    │                 │                      │                      │
    │                 │                      │ messages.create({    │
    │                 │                      │   contentSid,        │
    │                 │                      │   contentVariables, │
    │                 │                      │   from, to           │
    │                 │                      │ })                   │
    │                 │                      │─────────────────────>│
    │                 │                      │                      │
    │                 │                      │         201 Created  │
    │                 │                      │<──────────────────────│
    │                 │                      │                      │
    │ HTML (code UI)  │                      │                      │
    │<────────────────│                      │                      │
    │                 │                      │                      │
    │ POST /auth      │                      │                      │
    │ code=...        │                      │                      │
    │────────────────>│                      │                      │
```
