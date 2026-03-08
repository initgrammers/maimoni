import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/privacy-policy' as never)({
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          search={(current) => current}
          params={(current) => current}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Volver a Maimoni
        </Link>

        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Política de Privacidad
          </h1>
          <p className="mb-8 text-sm text-slate-500">
            Última actualización: 8 de marzo de 2026
          </p>

          <section className="space-y-6">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                1. Introducción
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Maimoni (&quot;nosotros&quot;, &quot;nostros&quot; o
                &quot;nuestra&quot;) respects your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use our mobile application and related
                services.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                2. Information We Collect
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                <p>
                  <strong>Personal Information:</strong> When you create an
                  account or authenticate via WhatsApp, we collect your phone
                  number and basic profile information.
                </p>
                <p>
                  <strong>Financial Data:</strong> We collect and store
                  information about your income, expenses, categories, and
                  financial goals that you voluntarily enter into the app.
                </p>
                <p>
                  <strong>Receipt Scans:</strong> When you use our AI-powered
                  receipt scanning feature, images are processed to extract
                  relevant financial data. Original images are not stored on our
                  servers.
                </p>
                <p>
                  <strong>Usage Data:</strong> We collect basic usage analytics
                  to improve our services, including app interactions and
                  performance metrics.
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                3. How We Use Your Information
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-slate-700">
                We use the information we collect to:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-slate-700">
                <li>Provide, maintain, and improve our services</li>
                <li>Process your financial transactions and data</li>
                <li>Authenticate your identity and secure your account</li>
                <li>Send you important updates and notifications</li>
                <li>Analyze usage patterns to enhance user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                4. Data Storage and Security
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Your financial data is stored on secure cloud infrastructure
                with industry-standard encryption. We implement appropriate
                technical and organizational measures to protect your personal
                information against unauthorized access, alteration, disclosure,
                or destruction.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                5. Data Sharing and Third Parties
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                <p>
                  We do not sell, trade, or otherwise transfer your personal
                  information to outside parties, except:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong>Service Providers:</strong> We may share data with
                    trusted third parties who assist us in operating our app and
                    providing services (e.g., cloud hosting, AI processing).
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> We may disclose
                    information when required by law or in response to valid
                    requests by public authorities.
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                6. AI and Automated Processing
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Our app uses artificial intelligence (Groq and LlamaIndex) to
                process receipt images and extract financial data. These
                services process your data solely for the purpose of providing
                the scanning feature and do not retain your images after
                processing is complete.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                7. Your Rights
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-slate-700">
                You have the right to:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-slate-700">
                <li>Access and retrieve your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>
                  Request deletion of your data (&quot;right to be
                  forgotten&quot;)
                </li>
                <li>Export your data in a portable format</li>
                <li>Object to certain processing activities</li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                To exercise these rights, please contact us at{' '}
                <a
                  href="mailto:soporte@maimoni.xyz"
                  className="text-emerald-600 underline hover:text-emerald-700"
                >
                  soporte@maimoni.xyz
                </a>
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                8. Children&apos;s Privacy
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                Our app is not intended for children under 13 years of age. We
                do not knowingly collect personal information from children
                under 13. If you become aware that a child has provided us with
                personal information, please contact us.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                9. Changes to This Policy
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new policy on this page
                and updating the &quot;Last Updated&quot; date. You are advised
                to review this Privacy Policy periodically for any changes.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                10. Contact Us
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                If you have any questions or comments about this Privacy Policy,
                please contact us at:{' '}
                <a
                  href="mailto:soporte@maimoni.xyz"
                  className="text-emerald-600 underline hover:text-emerald-700"
                >
                  soporte@maimoni.xyz
                </a>
              </p>
            </div>
          </section>

          <hr className="my-8 border-slate-200" />

          <p className="text-center text-xs text-slate-500">
            © 2026 Maimoni. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
