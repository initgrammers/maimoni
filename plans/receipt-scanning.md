# Plan: Receipt and Photo Scanning for Expenses/Income

## Overview
Implement a feature to allow users to take a photo or upload an image of a receipt/document. The system will use AI (LlamaParse + Gemini) to extract transaction details (amount, category, note, type) and pre-fill the movement form.

## Context
- **Current State**: Users manually fill the form in `/add`. There is a placeholder endpoint `POST /api/expenses/scan` in the Hono API that uses LlamaParse + Groq.
- **Goal**: Transition to Gemini for extraction (free/fast) and integrate the full flow from the UI.
- **Tech Stack**: 
    - **Frontend**: TanStack Start (React), Lucide Icons.
    - **Backend**: Hono (API), `@maimoni/ai` (package).
    - **AI**: LlamaCloud (for document parsing) + Google Gemini (for structured extraction).

## Proposed Changes

### 1. AI Package (`packages/ai`)
- Update `@maimoni/ai` to support Gemini.
- Implement a new extraction function using `@google/generative-ai`.
- Keep the interface consistent to allow the API to switch models easily.

### 2. Backend API (`apps/api`)
- Refine the `POST /api/expenses/scan` endpoint.
- Ensure it handles multipart/form-data for image uploads.
- Return structured data compatible with the frontend form state.

### 3. Frontend Webapp (`apps/webapp`)
- **UI Enhancements in `/add`**:
    - Add a "Scan Receipt" button/icon.
    - Implement file selection and camera access.
    - Show a loading state while scanning.
- **Form Integration**:
    - Map the AI result (amount, category, note) to the existing form state.
    - Highlight pre-filled fields for user verification.

## Step-by-Step Implementation

### Phase 1: AI Integration (Packages)
1. Install `@google/generative-ai` in `packages/ai`.
2. Update `packages/ai/src/index.ts`:
    - Add Gemini configuration using `GEMINI_API_KEY`.
    - Create `extractWithGemini` function.
    - Maintain LlamaParse for initial text extraction if needed, or use Gemini's native vision capabilities directly for better performance/simplicity.

### Phase 2: API Updates
1. Verify `apps/api/src/index.ts` has access to the necessary environment variables via `getEnv`.
2. Update the `/api/expenses/scan` handler to use the new Gemini-based extraction.

### Phase 3: Frontend Implementation
1. Add a hidden `<input type="file" accept="image/*" capture="environment" />` in `AddMovement` component.
2. Add a button to trigger the input.
3. Handle the file change:
    - Upload to `/api/expenses/scan`.
    - Parse the response.
    - Update `amount`, `note`, `type`, and `selectedCategory` states.
4. Add visual feedback (e.g., a toast or a "Magic" icon indicating AI is working).

## Success Criteria
- [ ] User can select an image from their gallery.
- [ ] User can take a photo directly from the app.
- [ ] The form pre-fills with the correct amount and a reasonable category.
- [ ] The user can still edit any field before saving.
- [ ] Error handling for failed scans or unsupported images.

## Testing Strategy

### 1. Unit Testing (`packages/ai`)
- **Gemini Extraction**: Mock the Google Generative AI SDK to verify that the extraction logic correctly parses different receipt formats and handles edge cases (e.g., missing amounts, unreadable text).
- **LlamaParse Integration**: Mock LlamaIndex responses to ensure the parsing flow is robust.

### 2. Integration Testing (`apps/api`)
- **Scan Endpoint**: Test `POST /api/expenses/scan` with sample image files (using multi-part form data) to ensure it returns the expected structured JSON.
- **Error States**: Verify the API correctly handles invalid files, network timeouts from AI providers, and empty results.

### 3. End-to-End Testing (`apps/webapp`)
- **Scanning Workflow**: Using Playwright, simulate a user uploading a receipt image and verify that:
    - The loading state is displayed.
    - Form fields (`amount`, `note`, `type`) are populated correctly upon success.
    - A success notification or visual indicator appears.
- **Manual Overrides**: Ensure that after an AI scan, the user can still manually change the category and amount, and that saving works as expected.

## Environment Variables Needed
- `GEMINI_API_KEY`: For Google Gemini API access.
- `LLAMA_CLOUD_API_KEY`: For LlamaParse (if used for complex document parsing).
