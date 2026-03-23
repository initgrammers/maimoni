# Tasks: WhatsApp Template Auth

## Phase 1: Foundation / Environment

- [x] 1.1 Add `TWILIO_WHATSAPP_TEMPLATE_SID` to root `.env.example` under the Twilio section with comment referencing the template SID `HX8c2079fcec8af506be41b602fb46c777`
- [x] 1.2 Update `infra/auth.ts` to add `TWILIO_WHATSAPP_TEMPLATE_SID` to the `getEnv` array in the `auth` component's `environment` block

## Phase 2: Core Implementation

- [x] 2.1 Update `_sendWhatsAppCode()` in `apps/auth/src/providers.ts` to use `contentSid` and `contentVariables` instead of `body` parameter for Twilio Messages API
- [x] 2.2 Change `AUTH_CHANNEL` constant from `'sms'` to `'whatsapp'` in `apps/auth/src/providers.ts`
- [x] 2.3 Uncomment the WhatsApp code path in `WhatsAppCodeProvider.sendCode` in `apps/auth/src/providers.ts` (lines 131-137)
- [x] 2.4 Update `getCodeInfoMessage()` to reflect WhatsApp channel message (already correct — returns `'Te enviaremos un codigo por WhatsApp.'` when `AUTH_CHANNEL === 'whatsapp'`)

## Phase 3: Testing

- [x] 3.1 Create `apps/auth/src/providers.test.ts` with unit tests for `_sendWhatsAppCode` mocking Twilio client — assert `contentSid` and `contentVariables` are passed correctly
- [x] 3.2 Add table-driven unit tests for `normalizePhoneNumber` covering: with `+` prefix, without country code, `0` prefix, Ecuador/Argentina codes
- [x] 3.3 Add unit test verifying `AUTH_CHANNEL === 'whatsapp'` routes to `_sendWhatsAppCode` (not `_sendSMSCode`)

## Phase 4: Code Quality

- [x] 4.1 Run `bun run check` (Biome lint + format) on `apps/auth/src/providers.ts` and `infra/auth.ts`
- [x] 4.2 Verify no lint errors or formatting issues

## Verification

- [ ] 5.1 Verify all spec acceptance criteria: AC-1 through AC-7 in `openspec/changes/whatsapp-template-auth/specs/auth/spec.md`
- [ ] 5.2 Confirm manual verification steps for WhatsApp template receipt (out of scope for automated testing)
