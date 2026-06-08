import Link from 'next/link'
import { ParticleCanvas } from '@/components/landing/ParticleCanvas'
import { RevealWrapper } from '@/components/landing/RevealWrapper'

export default function LandingPage() {
  return (
    <RevealWrapper>
      <div className="font-body-md text-on-surface overflow-x-hidden" style={{ background: '#0A0A0A' }}>

        {/* ── Nav ──────────────────────────────────────────── */}
        <header
          className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop py-stack-md"
          style={{
            background: 'rgba(19,19,19,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(68,73,51,0.3)',
          }}
        >
          <div className="font-headline-md text-headline-md font-bold text-on-surface" style={{ fontFamily: "'Playfair Display', serif" }}>
            Pact
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a
              href="#how-it-works"
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors duration-200"
            >
              How it works
            </a>
            <a
              href="#use-cases"
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors duration-200"
            >
              Use cases
            </a>
          </div>
          <Link
            href="/sign-in"
            className="bg-primary-fixed text-on-primary-fixed font-bold py-2 px-6 rounded-full font-label-sm text-label-sm active:scale-95 transition-all btn-hover"
            style={{ textDecoration: 'none' }}
          >
            Sign In
          </Link>
        </header>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section
          className="relative flex flex-col items-center justify-center text-center px-margin-mobile md:px-margin-desktop overflow-hidden"
          style={{ minHeight: '100vh', paddingTop: 96, paddingBottom: 120 }}
        >
          <ParticleCanvas />
          <div className="relative z-10">
            <div className="hero-entrance mb-stack-lg" style={{ animationDelay: '0.1s' }}>
              <span className="font-label-sm text-label-sm text-primary-fixed tracking-[0.2em] uppercase">
                AWS × Vercel Hackathon
              </span>
            </div>
            <h1
              className="hero-entrance text-on-surface mx-auto leading-tight mb-stack-lg"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(40px, 7vw, 64px)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                maxWidth: 800,
                animationDelay: '0.2s',
              }}
            >
              Commitments that execute themselves.
            </h1>
            <p
              className="font-body-lg text-on-surface-variant mx-auto mb-stack-lg hero-entrance"
              style={{ maxWidth: 560, animationDelay: '0.3s' }}
            >
              Define obligations. All parties fulfil them. The outcome fires atomically — permanent, auditable, simultaneous.
            </p>
            <div className="flex flex-col items-center gap-4 hero-entrance" style={{ animationDelay: '0.4s' }}>
              <Link
                href="/sign-in"
                className="bg-primary-fixed text-on-primary-fixed font-bold py-4 px-10 rounded-full font-body-md flex items-center gap-2 btn-hover transition-all"
                style={{ textDecoration: 'none' }}
              >
                Start for free
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60">
                No credit card required. Backed by Aurora DSQL.
              </p>
            </div>
          </div>
        </section>

        {/* ── Use Cases ────────────────────────────────────── */}
        <section
          id="use-cases"
          className="reveal-on-scroll mx-auto px-margin-mobile md:px-margin-desktop py-section-gap"
          style={{ maxWidth: 1280 }}
        >
          <div className="text-center mb-16">
            <span className="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase opacity-60">
              Built For
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {[
              {
                label: 'FREELANCERS',
                headline: 'No more "did you accept this?"',
                body: 'Submit your deliverable. Client accepts. Both parties mark complete. Dispute-proof audit trail included.',
                flow: 'Submit design files → Client accepts → Project closes',
              },
              {
                label: 'VENDORS',
                headline: 'From delivery to invoice in one step',
                body: 'Vendor confirms shipment. Buyer confirms receipt. Invoice is automatically approved and executed.',
                flow: 'Confirm shipment → Buyer confirms → Invoice approved',
              },
              {
                label: 'PARTNERSHIPS',
                headline: 'Both sides committed, or it does not activate',
                body: 'Two business partners both commit to a joint campaign. Agreement activates only when everyone is in.',
                flow: 'Agency reaches milestone → Client signs off → Next phase unlocks',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-surface-container p-stack-lg rounded-xl border border-transparent hover:border-outline-variant transition-all electric-glow"
              >
                <span className="font-label-sm text-label-sm text-primary-fixed mb-stack-md block">
                  {card.label}
                </span>
                <h3
                  className="text-on-surface mb-stack-md"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 500, lineHeight: 1.3 }}
                >
                  {card.headline}
                </h3>
                <p className="text-on-surface-variant mb-stack-lg" style={{ fontSize: 15, lineHeight: 1.6 }}>
                  {card.body}
                </p>
                <div
                  className="p-stack-md rounded-lg font-mono text-[13px] text-primary-fixed-dim"
                  style={{ background: '#0e0e0e', border: '1px solid rgba(68,73,51,0.3)' }}
                >
                  {card.flow}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it Works — Vertical Timeline ─────────────── */}
        <section
          id="how-it-works"
          className="reveal-on-scroll mx-auto px-margin-mobile md:px-margin-desktop py-section-gap"
          style={{ maxWidth: 896 }}
        >
          <h2
            className="text-on-surface text-center mb-24"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 600, letterSpacing: '-0.01em' }}
          >
            Replace the email chain.
          </h2>
          <div className="space-y-16">
            {[
              {
                n: '01',
                title: 'Define & Invite',
                body: 'Draft clear obligations in the Pact editor. Invite stakeholders with a single permanent link. No PDF versioning required.',
              },
              {
                n: '02',
                title: 'Mutual Commitment',
                body: 'Stakeholders review and authenticate their commitment. The node verifies identity and locks the terms into the audit trail.',
              },
              {
                n: '03',
                title: 'Atomic Execution',
                body: 'Once proof of fulfillment is submitted and verified, the Pact fires. Aurora DSQL guarantees the execution is simultaneous and permanent.',
              },
            ].map((step) => (
              <div key={step.n} className="relative flex gap-8 vertical-step">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono z-10"
                  style={{ background: '#c3f400', color: '#161e00' }}
                >
                  {step.n}
                </div>
                <div className="pb-16">
                  <h4
                    className="text-primary-fixed mb-stack-sm"
                    style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 500 }}
                  >
                    {step.title}
                  </h4>
                  <p className="text-on-surface-variant" style={{ maxWidth: 512, lineHeight: 1.7 }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section
          className="reveal-on-scroll mx-auto px-margin-mobile md:px-margin-desktop py-section-gap text-center"
          style={{ maxWidth: 1280 }}
        >
          <div
            className="rounded-2xl p-16"
            style={{ background: '#1c1b1b', border: '1px solid rgba(68,73,51,0.3)' }}
          >
            <h2
              className="text-on-surface mb-stack-lg"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 40px)', fontWeight: 600, letterSpacing: '-0.01em' }}
            >
              Ready to formalize?
            </h2>
            <p className="text-on-surface-variant mb-12 mx-auto" style={{ maxWidth: 512, fontSize: 16 }}>
              Join the Network and start creating immutable commitments today.
            </p>
            <div className="flex flex-col sm:flex-row gap-gutter justify-center">
              <Link
                href="/sign-in"
                className="bg-primary-fixed text-on-primary-fixed font-bold py-4 px-10 rounded-full font-body-md hover:brightness-110 active:scale-95 transition-all btn-hover"
                style={{ textDecoration: 'none' }}
              >
                Create your first Pact
              </Link>
              <a
                href="https://github.com/olajaido/pact"
                target="_blank"
                rel="noopener noreferrer"
                className="border text-on-surface font-bold py-4 px-10 rounded-full font-body-md hover:bg-surface-container-highest active:scale-95 transition-all"
                style={{ borderColor: '#8e9379', textDecoration: 'none', display: 'inline-block' }}
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid #474746' }}>
          <div
            className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop py-stack-lg mx-auto gap-8"
            style={{ maxWidth: 1280 }}
          >
            <div className="flex flex-col items-center md:items-start gap-2">
              <div
                className="font-bold text-on-surface"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}
              >
                Pact
              </div>
              <p className="font-body-md text-on-surface-variant opacity-60">
                © 2024 Pact Protocol. Built on Aurora DSQL.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              <Link href="/privacy" className="font-body-md text-on-surface-variant hover:text-primary-fixed transition-colors">Privacy</Link>
              <Link href="/terms" className="font-body-md text-on-surface-variant hover:text-primary-fixed transition-colors">Terms</Link>
              <a href="https://github.com/olajaido/pact" target="_blank" rel="noopener noreferrer" className="font-body-md text-on-surface-variant hover:text-primary-fixed transition-colors">Documentation</a>
            </div>
          </div>
        </footer>

      </div>
    </RevealWrapper>
  )
}
