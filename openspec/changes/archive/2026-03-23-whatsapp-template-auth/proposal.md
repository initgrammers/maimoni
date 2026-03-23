# Proposal: WhatsApp Template Auth

## Intent

Switch the OpenAuth WhatsApp authentication flow from plain-text messages to Twilio's pre-approved message templates. This ensures compliance with WhatsApp's Business Messaging policy, which requires all outbound messages to use approved templates. The current plain-text approach will fail once WhatsApp enforces template requirements.

## Scope

### In Scope
- Add `TWILIO_WHATSAPP_TEMPLATE_SID` environment variable for the template SID
- Update `_sendWhatsAppCode()` in `apps/auth/src/providers.ts` to use `contentSid` for templated messages
- Change `AUTH_CHANNEL` from `'sms'` to `'whatsapp'` to enable the WhatsApp flow
- Uncomment the WhatsApp code path in `WhatsAppCodeProvider`
- Update `getCodeInfoMessage()` to reflect the active channel

### Out of Scope
- SMS fallback logic (SMS is deprecated for auth in this change)
- Changes to Twilio messaging service configuration
- Modifications to the `CustomCodeUI` component
- Testing with actual Twilio API calls (manual verification only)

## Approach

Replace the plain-text `body` parameter in the Twilio Messages API call with Twilio's template-based `contentSid`. The template `HX8c2079fcec8af506be41b602fb46c777` (maimoni_opt_es) will be used for the verification code delivery.

**Twilio Message Create Changes:**
- Remove: `body: 'Tu codigo de verificacion para Maimoni es: ${code}'`
- Add: `contentSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID`
- Add: `contentVariables: JSON.stringify({ 1: code })`

The template variable `{{1}}` in the maimoni_opt_es template will be substituted with the verification code.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/auth/src/providers.ts` | Modified | `_sendWhatsAppCode` switches to template-based messaging; AUTH_CHANNEL updated |
| `apps/auth/src/index.ts` | None | No changes required (handler re-exports app) |
| Environment configuration | Modified | Add `TWILIO_WHATSAPP_TEMPLATE_SID` to `.env` and infrastructure config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Template not approved by Twilio/WhatsApp | Low | Verify template status in Twilio Console before deployment |
| Wrong content variable index mapping | Medium | Template uses index 1 (`{{1}}`); ensure contentVariables maps correctly |
| WhatsApp flow regression if template SID is invalid | Medium | Revert `AUTH_CHANNEL` to `'sms'` as emergency rollback |
| Environment variable not set in production | Medium | Add to SST infrastructure config before deployment |

## Rollback Plan

1. Set `AUTH_CHANNEL` back to `'sms'` in `apps/auth/src/providers.ts`
2. Comment out the WhatsApp code path in `WhatsAppCodeProvider`
3. The SMS fallback (`_sendSMSCode`) will resume automatically
4. No database migrations or schema changes required

## Dependencies

- Twilio account with pre-approved `maimoni_opt_es` template (SID: `HX8c2079fcec8af506be41b602fb46c777`)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` already configured
- New env var `TWILIO_WHATSAPP_TEMPLATE_SID` must be added to infrastructure

## Success Criteria

- [ ] `_sendWhatsAppCode` uses `contentSid` instead of `body` for WhatsApp messages
- [ ] `AUTH_CHANNEL` is set to `'whatsapp'`
- [ ] `TWILIO_WHATSAPP_TEMPLATE_SID` is documented and added to environment configs
- [ ] WhatsApp code path is uncommented in `WhatsAppCodeProvider`
- [ ] `bun run check` passes without errors
- [ ] Manual verification: WhatsApp message received with template (not plain text)
