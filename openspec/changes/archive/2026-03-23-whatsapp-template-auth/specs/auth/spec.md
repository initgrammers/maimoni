# Auth Specification

## Purpose

WhatsApp-based verification code delivery via Twilio pre-approved message templates. Ensures compliance with WhatsApp Business Messaging policy by replacing plain-text message delivery with template-based messaging.

## Environment Requirements

### Requirement: WhatsApp Template SID Configuration

The system SHALL have `TWILIO_WHATSAPP_TEMPLATE_SID` configured as an environment variable containing the Twilio Content SID for the approved WhatsApp template.

#### Scenario: Environment variable is set

- GIVEN `TWILIO_WHATSAPP_TEMPLATE_SID` is present in the environment
- WHEN the WhatsApp code provider initializes
- THEN the variable is accessible via `getEnv('TWILIO_WHATSAPP_TEMPLATE_SID')`

#### Scenario: Environment variable is missing

- GIVEN `TWILIO_WHATSAPP_TEMPLATE_SID` is NOT present in the environment
- WHEN `_sendWhatsAppCode` attempts to send a message
- THEN the system SHALL throw an error indicating the missing variable

## WhatsApp Message Delivery

### Requirement: Templated Message Delivery

The system MUST use Twilio's `contentSid` and `contentVariables` parameters when sending WhatsApp verification codes, replacing plain-text `body` parameter.

#### Scenario: Send WhatsApp verification code with template

- GIVEN a valid phone number and verification code
- AND `TWILIO_WHATSAPP_TEMPLATE_SID` is configured with SID `HX8c2079fcec8af506be41b602fb46c777`
- WHEN `_sendWhatsAppCode(phoneNumber, code)` is called
- THEN the Twilio Messages API is called with:
  - `contentSid` set to the template SID
  - `contentVariables` set to `JSON.stringify({ 1: code })`
  - `from` set to `whatsapp:${TWILIO_WHATSAPP_NUMBER}`
  - `to` set to `whatsapp:${normalizedPhoneNumber}`
- AND the `body` parameter SHALL NOT be present

#### Scenario: Template variable substitution

- GIVEN template `maimoni_opt_es` with variable `{{1}}`
- AND verification code `123456`
- WHEN the message is sent
- THEN `{{1}}` in the template SHALL be replaced with `123456`

### Requirement: Phone Number Normalization

The system SHALL normalize phone numbers to E.164 format with WhatsApp prefix before sending.

#### Scenario: Phone number without country code

- GIVEN phone number `0981234567`
- WHEN `normalizePhoneNumber` is called
- THEN it returns `+593981234567`
- AND the WhatsApp destination is `whatsapp:+593981234567`

#### Scenario: Phone number with country code

- GIVEN phone number `+593981234567`
- WHEN `normalizePhoneNumber` is called
- THEN it returns `+593981234567` unchanged

## Authentication Channel Selection

### Requirement: WhatsApp as Primary Channel

The system SHALL use `whatsapp` as the `AUTH_CHANNEL` for production verification code delivery.

#### Scenario: AUTH_CHANNEL set to whatsapp

- GIVEN `AUTH_CHANNEL` is `'whatsapp'`
- WHEN `getCodeInfoMessage()` is called
- THEN it returns `'Te enviaremos un codigo por WhatsApp.'`

#### Scenario: WhatsApp code path execution

- GIVEN `AUTH_CHANNEL` is `'whatsapp'`
- AND a user requests a verification code
- WHEN the code is sent
- THEN `_sendWhatsAppCode` is invoked (not `_sendSMSCode`)

### Requirement: WhatsApp Code Path Uncommented

The `WhatsAppCodeProvider` SHALL have the WhatsApp code path uncommented and active.

#### Scenario: Code sending with active WhatsApp path

- GIVEN the WhatsApp code path is uncommented in `WhatsAppCodeProvider`
- AND `AUTH_CHANNEL === 'whatsapp'`
- WHEN `sendCode` is called with a phone number and code
- THEN `_sendWhatsAppCode` is executed

## Error Handling

### Requirement: Missing Template SID Handling

The system SHALL provide a meaningful error when `TWILIO_WHATSAPP_TEMPLATE_SID` is not configured.

#### Scenario: Template SID environment variable missing

- GIVEN `TWILIO_WHATSAPP_TEMPLATE_SID` is not set
- WHEN `_sendWhatsAppCode` is called
- THEN a descriptive error SHALL be thrown indicating the missing configuration

### Requirement: Invalid Template SID Handling

The system SHALL propagate Twilio API errors when the template SID is invalid or the template is not approved.

#### Scenario: Invalid or unapproved template

- GIVEN a valid but unapproved template SID
- WHEN `_sendWhatsAppCode` is called
- THEN the Twilio API error SHALL propagate to the caller
- AND the verification flow SHALL fail gracefully with user feedback

## Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | `_sendWhatsAppCode` uses `contentSid` instead of `body` | Code review |
| AC-2 | `contentVariables` is `{"1": code}` where code is the 6-digit verification | Code review |
| AC-3 | `AUTH_CHANNEL` is set to `'whatsapp'` | Code review |
| AC-4 | `TWILIO_WHATSAPP_TEMPLATE_SID` env var is documented | `.env.example` update |
| AC-5 | WhatsApp code path is uncommented in `WhatsAppCodeProvider` | Code review |
| AC-6 | `bun run check` passes without errors | CI/local verification |
| AC-7 | Manual verification: WhatsApp message received with template substitution | Manual test |
