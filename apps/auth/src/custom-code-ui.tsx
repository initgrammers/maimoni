/** @jsxImportSource hono/jsx */

import { type CodeProviderOptions, UnknownStateError } from '@maimoni/auth';
import type { HtmlEscapedString } from 'hono/utils/html';

const css = `
:root {
  --color-primary: #0f172a;
  --color-primary-hover: #1e293b;
  --color-background: #ffffff;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;
  --color-border: #e2e8f0;
  --color-border-focus: #0f172a;
  --color-input-bg: #ffffff;
  --color-error: #e11d48;
  --color-error-bg: #ffe4e6;
  --color-success: #059669;
  --color-success-bg: #d1fae5;
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-family); background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.container { width: 100%; max-width: 380px; }
.card { background: var(--color-background); border-radius: 28px; border: 1px solid var(--color-border); box-shadow: 0 12px 30px rgba(15,23,42,0.08); padding: 2rem; }
.logo { text-align: center; margin-bottom: 1.5rem; }
.logo h1 { font-size: 1.75rem; font-weight: 700; color: var(--color-primary); letter-spacing: -0.025em; }
.logo p { color: var(--color-text-muted); font-size: 0.875rem; margin-top: 0.25rem; }
.form-group { margin-bottom: 1.25rem; }
label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-text); margin-bottom: 0.5rem; }
.input-row { display: flex; gap: 0.5rem; align-items: stretch; }
.country-select { 
  width: 80px; 
  padding: 0.875rem 0.375rem; 
  font-size: 0.6875rem; 
  border: 2px solid var(--color-border); 
  border-radius: 1rem; 
  background: var(--color-input-bg); 
  color: var(--color-text); 
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s;
  flex-shrink: 0;
}
.country-select:focus { outline: none; border-color: var(--color-border-focus); }
input { 
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 0.875rem 1rem; 
  font-size: 1rem; 
  border: 2px solid var(--color-border); 
  border-radius: 1rem; 
  background: var(--color-input-bg); 
  color: var(--color-text); 
  transition: border-color 0.2s, box-shadow 0.2s; 
}
input:focus { outline: none; border-color: var(--color-border-focus); box-shadow: 0 0 0 3px rgba(15,23,42,0.15); }
input::placeholder { color: var(--color-text-muted); }
button { 
  width: 100%; 
  padding: 1rem 1rem; 
  font-size: 1rem; 
  font-weight: 600; 
  color: white; 
  background: var(--color-primary); 
  border: none; 
  border-radius: 1rem; 
  cursor: pointer; 
  transition: background-color 0.2s, transform 0.1s, opacity 0.2s; 
}
button:hover { background: var(--color-primary-hover); }
button:active { transform: scale(0.98); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button:disabled:hover { background: var(--color-primary); }
.alert { padding: 0.875rem 1rem; border-radius: 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; }
.alert-error { background: var(--color-error-bg); color: var(--color-error); border: 1px solid #fda4af; }
.alert-success { background: var(--color-success-bg); color: var(--color-success); border: 1px solid #6ee7b7; }
.footer { margin-top: 1.5rem; text-align: center; font-size: 0.8125rem; color: var(--color-text-muted); }
.footer button { background: none; color: var(--color-primary); padding: 0; width: auto; text-decoration: underline; font-size: 0.8125rem; }
.footer button:hover { background: none; }
.error-text { color: var(--color-error); font-size: 0.75rem; margin-top: 0.375rem; }
`;

const COUNTRIES = [
  { code: '+593', label: '🇪🇨 ECU', minLength: 10, maxLength: 10 },
  { code: '+54', label: '🇦🇷 ARG', minLength: 10, maxLength: 10 },
];

const JS_VALIDATION = `
function validatePhone(countryCode, phone) {
  const country = ${JSON.stringify(COUNTRIES)}.find(c => c.code === countryCode);
  if (!country) return false;
  const digits = phone.replace(/\\D/g, '');
  return digits.length >= country.minLength && digits.length <= country.maxLength;
}

function updateButtonState() {
  const countrySelect = document.querySelector('.country-select');
  const phoneInput = document.querySelector('input[name="phone"]');
  const submitBtn = document.querySelector('button[type="submit"]');
  const errorDiv = document.querySelector('.error-text');
  
  if (!countrySelect || !phoneInput || !submitBtn) return;
  
  const isValid = validatePhone(countrySelect.value, phoneInput.value);
  submitBtn.disabled = !isValid;
  
  const digits = phoneInput.value.replace(/\\D/g, '');
  const country = ${JSON.stringify(COUNTRIES)}.find(c => c.code === countrySelect.value);
  
  if (phoneInput.value.length > 0 && country) {
    if (digits.length < country.minLength) {
      errorDiv.textContent = 'Número muy corto para ' + (countrySelect.value === '+593' ? 'Ecuador' : 'Argentina');
    } else if (digits.length > country.maxLength) {
      errorDiv.textContent = 'Número muy largo para ' + (countrySelect.value === '+593' ? 'Ecuador' : 'Argentina');
    } else {
      errorDiv.textContent = '';
    }
  } else {
    errorDiv.textContent = '';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const countrySelect = document.querySelector('.country-select');
  const phoneInput = document.querySelector('input[name="phone"]');
  const form = document.querySelector('form');
  
  if (countrySelect) countrySelect.addEventListener('change', updateButtonState);
  if (phoneInput) {
    phoneInput.addEventListener('input', updateButtonState);
    updateButtonState();
  }
  
  // Combine country code with phone before submit
  if (form) {
    form.addEventListener('submit', function(e) {
      const countryCode = countrySelect?.value || '+593';
      const phone = phoneInput?.value || '';
      const digits = phone.replace(/D/g, '');
      const fullPhone = countryCode + digits;
      
      // Create or update hidden input with full phone
      let hiddenInput = form.querySelector('input[name="phone"]');
      if (hiddenInput) {
        hiddenInput.value = fullPhone;
      }
    });
  }
});
`;

function Layout({ children }: { children?: unknown }) {
  return (
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Maimoni - Iniciar Sesión</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: JS_VALIDATION }} />
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <h1>Maimoni</h1>
              <p>Gestión financiera inteligente</p>
            </div>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

function FormAlert({
  message,
  color = 'error',
}: {
  message: string;
  color?: 'error' | 'success';
}) {
  return <div class={`alert alert-${color}`}>{message}</div>;
}

export interface CustomCodeUIOptions {
  sendCode: (claims: Record<string, string>, code: string) => Promise<void>;
  codeInfo?: string;
  buttonText?: string;
  placeholder?: string;
}

export function CustomCodeUI(props: CustomCodeUIOptions): CodeProviderOptions {
  return {
    sendCode: props.sendCode,
    length: 6,
    request: async (_req, state, _form, error): Promise<Response> => {
      // Start state - phone number input with country selector
      if (state.type === 'start') {
        const jsx = (
          <Layout>
            <form data-component="form" method="post">
              {error?.type === 'invalid_claim' && (
                <FormAlert message="Número de teléfono inválido" />
              )}
              <input type="hidden" name="action" value="request" />
              <div class="form-group">
                <label for="phone">Número de teléfono</label>
                <div class="input-row">
                  <select name="countryCode" class="country-select" required>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    inputmode="numeric"
                    required
                    placeholder={props.placeholder || '98 123 4567'}
                    autofocus
                  />
                </div>
                <div class="error-text"></div>
              </div>
              <button type="submit" disabled>
                {props.buttonText || 'Continuar'}
              </button>
            </form>
            <div class="footer">
              <p>
                {props.codeInfo ||
                  'Te enviaremos un código de verificación por SMS'}
              </p>
            </div>
          </Layout>
        );
        const html = await (jsx as unknown as HtmlEscapedString).toString();
        return new Response(html, { headers: { 'Content-Type': 'text/html' } });
      }

      // Code state - verification code input
      if (state.type === 'code') {
        const phoneNumber =
          state.claims.phone ?? state.claims.phoneNumber ?? '';
        const jsx = (
          <Layout>
            <form data-component="form" method="post">
              {error?.type === 'invalid_code' && (
                <FormAlert message="Código inválido. Por favor intenta de nuevo." />
              )}
              {state.type === 'code' && (
                <FormAlert
                  message={
                    (state.resend ? 'Código reenviado' : 'Código enviado') +
                    ' al ' +
                    phoneNumber
                  }
                  color="success"
                />
              )}
              <input type="hidden" name="action" value="verify" />
              <div class="form-group">
                <label for="code">Código de verificación</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  minLength={6}
                  maxLength={6}
                  required
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  placeholder="123456"
                  autofocus
                />
              </div>
              <button type="submit">Verificar</button>
            </form>
            <form method="post">
              {Object.entries(state.claims).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <input type="hidden" name="action" value="request" />
              <div class="footer">
                <p>
                  ¿No recibiste el código?{' '}
                  <button type="submit">Reenviar</button>
                </p>
              </div>
            </form>
          </Layout>
        );
        const html = await (jsx as unknown as HtmlEscapedString).toString();
        return new Response(html, { headers: { 'Content-Type': 'text/html' } });
      }

      throw new UnknownStateError();
    },
  };
}
