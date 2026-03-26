import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const metadata = {
  title: "Privacy Policy — Binge",
  description: "How Binge collects, uses, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-28 md:pb-10">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      <h1 className="mb-1 text-2xl font-black tracking-tight">Privacy Policy</h1>
      <p className="mb-10 text-sm text-white/35">Last updated: March 2025</p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-white/60">

        <Section title="1. Who we are">
          Binge is a personal movie and TV ranking app built and operated by Yash Patil.
          You can reach us at{" "}
          <a href="mailto:yash@usebinge.app" className="text-white/80 underline underline-offset-2 hover:text-white">
            yash@usebinge.app
          </a>
          .
        </Section>

        <Section title="2. What we collect">
          When you sign in with Google, we receive and store:
          <ul className="mt-2 flex flex-col gap-1.5 pl-4">
            <li className="list-disc">Your name and email address</li>
            <li className="list-disc">Your Google profile picture URL</li>
            <li className="list-disc">A unique Google account identifier (used internally to separate your data from other users&apos;)</li>
          </ul>
          <p className="mt-3">
            We also store the rankings, watchlist entries, and head-to-head comparisons you create while using the app.
            We do not collect payment information, location data, or any data beyond what is described here.
          </p>
        </Section>

        <Section title="3. How we use your data">
          Your data is used solely to provide and improve the Binge service:
          <ul className="mt-2 flex flex-col gap-1.5 pl-4">
            <li className="list-disc">To display your personal rankings and watchlist</li>
            <li className="list-disc">To generate personalised recommendations</li>
            <li className="list-disc">To keep your data separate from other users&apos; data</li>
          </ul>
          <p className="mt-3">
            We do not sell your data, share it with third parties for marketing, or use it to build advertising profiles.
          </p>
        </Section>

        <Section title="4. Third-party services">
          <ul className="flex flex-col gap-3">
            <li>
              <span className="font-semibold text-white/80">Google Sign-In</span> — We use Google OAuth to authenticate you.
              Google&apos;s own{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-white/80 underline underline-offset-2 hover:text-white">
                Privacy Policy
              </a>{" "}
              applies to that process.
            </li>
            <li>
              <span className="font-semibold text-white/80">TMDB</span> — Movie and TV data is sourced from The Movie Database (TMDB).
              This product uses the TMDB API but is not endorsed or certified by TMDB.
              No personal data is sent to TMDB.
            </li>
            <li>
              <span className="font-semibold text-white/80">Vercel</span> — The app is hosted on Vercel, which may collect standard
              server logs (IP address, request metadata). See{" "}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-white/80 underline underline-offset-2 hover:text-white">
                Vercel&apos;s Privacy Policy
              </a>
              .
            </li>
          </ul>
        </Section>

        <Section title="5. Data storage and security">
          Your data is stored in a hosted PostgreSQL database. We use industry-standard practices to protect it,
          but no internet service can guarantee absolute security. We recommend not reusing passwords across services.
        </Section>

        <Section title="6. Your rights">
          <p>You have the right to:</p>
          <ul className="mt-2 flex flex-col gap-1.5 pl-4">
            <li className="list-disc">Access the data we hold about you</li>
            <li className="list-disc">Delete your account and all associated data at any time — use the &ldquo;Delete Account&rdquo; option in the app menu</li>
            <li className="list-disc">Contact us at{" "}
              <a href="mailto:yash@usebinge.app" className="text-white/80 underline underline-offset-2 hover:text-white">
                yash@usebinge.app
              </a>{" "}
              with any privacy-related questions or requests
            </li>
          </ul>
          <p className="mt-3">
            If you are in the European Economic Area (EEA), you also have rights under GDPR including the right to
            data portability and to lodge a complaint with your local supervisory authority.
          </p>
        </Section>

        <Section title="7. Data retention">
          We retain your data for as long as you have an account. When you delete your account,
          all your personal data and rankings are permanently deleted from our database within 30 days.
        </Section>

        <Section title="8. Children">
          Binge is not directed at children under 13. We do not knowingly collect data from children under 13.
          If you believe a child has provided us with personal data, please contact us and we will delete it.
        </Section>

        <Section title="9. Changes to this policy">
          We may update this policy from time to time. The date at the top of this page reflects the most recent revision.
          Continued use of Binge after changes constitutes acceptance of the updated policy.
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-bold text-white/90">{title}</h2>
      <div className="text-white/55">{children}</div>
    </div>
  )
}
