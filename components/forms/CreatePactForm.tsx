'use client'

import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────

interface ConditionInput {
  title: string
  description: string
}

interface Counterparty {
  email: string
  name: string
  conditions: ConditionInput[]
}

interface FormState {
  step: 1 | 2 | 3 | 4 | 5
  title: string
  description: string
  outcomeStatement: string
  counterparties: Counterparty[]
  creatorConditions: ConditionInput[]
  pactId: string
  resultParties: Array<{
    email: string
    inviteToken: string
    role: string
    displayName: string | null
  }>
  error: string | null
  loading: boolean
}

function emptyCondition(): ConditionInput {
  return { title: '', description: '' }
}

function emptyCounterparty(): Counterparty {
  return { email: '', name: '', conditions: [emptyCondition()] }
}

const STEP_LABELS = ['Basics', 'Parties', 'Conditions', 'Review'] as const

// ─── Main component ──────────────────────────────────────────

interface Props {
  creatorEmail: string
  creatorName: string
}

export function CreatePactForm({ creatorEmail, creatorName }: Props) {
  const [state, setState] = useState<FormState>({
    step: 1,
    title: '',
    description: '',
    outcomeStatement: '',
    counterparties: [emptyCounterparty()],
    creatorConditions: [emptyCondition()],
    pactId: '',
    resultParties: [],
    error: null,
    loading: false,
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function advance() {
    setState((prev) => ({ ...prev, step: (prev.step + 1) as FormState['step'] }))
  }

  function back() {
    setState((prev) => ({
      ...prev,
      step: (prev.step - 1) as FormState['step'],
      error: null,
    }))
  }

  // ── Validation ─────────────────────────────────────────────

  function canAdvanceStep1() {
    return state.title.trim().length > 0 && state.outcomeStatement.trim().length > 0
  }

  function canAdvanceStep2() {
    return state.counterparties.every(
      (cp) => cp.email.trim().length > 0 && cp.name.trim().length > 0,
    )
  }

  function canAdvanceStep3() {
    const creatorOk = state.creatorConditions.every((c) => c.title.trim().length > 0)
    const counterOk = state.counterparties.every((cp) =>
      cp.conditions.every((c) => c.title.trim().length > 0),
    )
    return creatorOk && counterOk
  }

  // ── Counterparty helpers ───────────────────────────────────

  function updateCounterparty(index: number, patch: Partial<Counterparty>) {
    setState((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((cp, i) =>
        i === index ? { ...cp, ...patch } : cp,
      ),
    }))
  }

  function updateCpCondition(
    cpIndex: number,
    condIndex: number,
    patch: Partial<ConditionInput>,
  ) {
    setState((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((cp, i) =>
        i === cpIndex
          ? {
              ...cp,
              conditions: cp.conditions.map((c, j) =>
                j === condIndex ? { ...c, ...patch } : c,
              ),
            }
          : cp,
      ),
    }))
  }

  function addCpCondition(cpIndex: number) {
    setState((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((cp, i) =>
        i === cpIndex
          ? { ...cp, conditions: [...cp.conditions, emptyCondition()] }
          : cp,
      ),
    }))
  }

  function removeCpCondition(cpIndex: number, condIndex: number) {
    setState((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((cp, i) =>
        i === cpIndex
          ? { ...cp, conditions: cp.conditions.filter((_, j) => j !== condIndex) }
          : cp,
      ),
    }))
  }

  // ── Creator condition helpers ──────────────────────────────

  function updateCreatorCondition(index: number, patch: Partial<ConditionInput>) {
    setState((prev) => ({
      ...prev,
      creatorConditions: prev.creatorConditions.map((c, i) =>
        i === index ? { ...c, ...patch } : c,
      ),
    }))
  }

  // ── Submission ─────────────────────────────────────────────

  async function handleSubmit() {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const partiesPayload = [
        {
          email: creatorEmail,
          name: creatorName || 'You',
          conditions: state.creatorConditions.filter((c) => c.title.trim()),
        },
        ...state.counterparties.map((cp) => ({
          email: cp.email.trim(),
          name: cp.name.trim(),
          conditions: cp.conditions.filter((c) => c.title.trim()),
        })),
      ]

      // Step 1: Create pact
      const createRes = await fetch('/api/pacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.title.trim(),
          description: state.description.trim() || undefined,
          outcomeStatement: state.outcomeStatement.trim(),
          parties: partiesPayload,
        }),
      })

      if (!createRes.ok) {
        const err = (await createRes.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to create pact')
      }

      const created = (await createRes.json()) as {
        pact: { id: string }
        parties: Array<{
          email: string
          inviteToken: string
          role: string
          displayName: string | null
        }>
      }
      const pactId = created.pact.id

      // Step 2: Submit (DRAFT → PENDING_ACCEPTANCE, sends invite emails)
      const submitRes = await fetch(`/api/pacts/${pactId}/submit`, {
        method: 'POST',
      })

      if (!submitRes.ok) {
        const err = (await submitRes.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to submit pact')
      }

      setState((prev) => ({
        ...prev,
        pactId,
        resultParties: created.parties,
        loading: false,
        step: 5,
      }))
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Something went wrong',
      }))
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
        color: '#F0EFE8',
        maxWidth: 680,
        margin: '0 auto',
        padding: '48px 32px',
      }}
    >
      {/* Step indicator */}
      {state.step < 5 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
          {STEP_LABELS.map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3 | 4
            const isActive = state.step === stepNum
            const isDone = state.step > stepNum
            return (
              <div
                key={label}
                style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: isDone ? '#22C55E' : isActive ? '#D4FF4F' : '#242428',
                    color: isDone || isActive ? '#0C0C0E' : '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#F0EFE8' : '#6B7280',
                  }}
                >
                  {label}
                </span>
                {i < 3 && (
                  <div
                    style={{ flex: 1, height: 1, background: '#242428', marginLeft: 4 }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Step 1: Basics ────────────────────────────────── */}
      {state.step === 1 && (
        <div>
          <h2 style={stepHeading}>Start with the essentials</h2>
          <p style={stepSubtext}>Name the pact and describe what success looks like.</p>

          <div style={fieldGroup}>
            <label style={fieldLabel}>Pact title *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Website Redesign — Final Delivery"
              value={state.title}
              maxLength={200}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div style={fieldGroup}>
            <label style={fieldLabel}>Description (optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Context about this agreement..."
              value={state.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div style={fieldGroup}>
            <label style={fieldLabel}>Outcome statement *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Both parties confirm project complete and payment approved"
              value={state.outcomeStatement}
              onChange={(e) => set('outcomeStatement', e.target.value)}
            />
            <p style={fieldHint}>What happens when this Pact executes — one sentence.</p>
          </div>

          <button
            style={{ ...primaryBtn, opacity: canAdvanceStep1() ? 1 : 0.5 }}
            disabled={!canAdvanceStep1()}
            onClick={advance}
          >
            Next: Add parties →
          </button>
        </div>
      )}

      {/* ── Step 2: Parties ───────────────────────────────── */}
      {state.step === 2 && (
        <div>
          <h2 style={stepHeading}>Who&apos;s involved?</h2>
          <p style={stepSubtext}>Add the other parties. You are automatically Party 1.</p>

          {/* Creator — read-only */}
          <div style={{ ...sectionCard, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
              Party 1 — You (creator)
            </p>
            <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{creatorName || creatorEmail}</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>{creatorEmail}</p>
          </div>

          {state.counterparties.map((cp, i) => (
            <div key={i} style={{ ...sectionCard, marginBottom: 12 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
                Party {i + 2}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...fieldLabel, display: 'block', marginBottom: 4 }}>
                    Name *
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="Sarah Chen"
                    value={cp.name}
                    onChange={(e) => updateCounterparty(i, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ ...fieldLabel, display: 'block', marginBottom: 4 }}>
                    Email *
                  </label>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="sarah@example.com"
                    value={cp.email}
                    onChange={(e) => updateCounterparty(i, { email: e.target.value })}
                  />
                </div>
              </div>
              {state.counterparties.length > 1 && (
                <button
                  style={ghostBtn}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      counterparties: prev.counterparties.filter((_, j) => j !== i),
                    }))
                  }
                >
                  Remove party
                </button>
              )}
            </div>
          ))}

          {state.counterparties.length < 4 && (
            <button
              style={ghostBtn}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  counterparties: [...prev.counterparties, emptyCounterparty()],
                }))
              }
            >
              + Add another party
            </button>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button style={backBtn} onClick={back}>← Back</button>
            <button
              style={{ ...primaryBtn, opacity: canAdvanceStep2() ? 1 : 0.5 }}
              disabled={!canAdvanceStep2()}
              onClick={advance}
            >
              Next: Define conditions →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Conditions ────────────────────────────── */}
      {state.step === 3 && (
        <div>
          <h2 style={stepHeading}>What does each party need to do?</h2>
          <p style={stepSubtext}>
            Add at least one condition per party. The pact executes when all
            conditions are fulfilled.
          </p>

          {/* Creator conditions */}
          <ConditionsBlock
            partyLabel={`Your conditions (${creatorName || creatorEmail})`}
            conditions={state.creatorConditions}
            onUpdate={(i, patch) => updateCreatorCondition(i, patch)}
            onAdd={() =>
              setState((prev) => ({
                ...prev,
                creatorConditions: [...prev.creatorConditions, emptyCondition()],
              }))
            }
            onRemove={(i) =>
              setState((prev) => ({
                ...prev,
                creatorConditions: prev.creatorConditions.filter((_, j) => j !== i),
              }))
            }
          />

          {/* Counterparty conditions */}
          {state.counterparties.map((cp, cpIdx) => (
            <ConditionsBlock
              key={cpIdx}
              partyLabel={`${cp.name || cp.email}'s conditions`}
              conditions={cp.conditions}
              onUpdate={(condIdx, patch) => updateCpCondition(cpIdx, condIdx, patch)}
              onAdd={() => addCpCondition(cpIdx)}
              onRemove={(condIdx) => removeCpCondition(cpIdx, condIdx)}
            />
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button style={backBtn} onClick={back}>← Back</button>
            <button
              style={{ ...primaryBtn, opacity: canAdvanceStep3() ? 1 : 0.5 }}
              disabled={!canAdvanceStep3()}
              onClick={advance}
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review ────────────────────────────────── */}
      {state.step === 4 && (
        <div>
          <h2 style={stepHeading}>Ready to send?</h2>
          <p style={stepSubtext}>
            Review everything before sending invites. You cannot edit after submission.
          </p>

          <div style={{ ...sectionCard, marginBottom: 12 }}>
            <p style={reviewLabel}>Pact</p>
            <p style={{ fontWeight: 600, fontSize: 18, margin: '0 0 4px' }}>{state.title}</p>
            {state.description && (
              <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>
                {state.description}
              </p>
            )}
            <p style={{ color: '#6B7280', fontSize: 14, margin: '8px 0 0' }}>
              <strong style={{ color: '#F0EFE8' }}>Outcome:</strong>{' '}
              {state.outcomeStatement}
            </p>
          </div>

          <div style={{ ...sectionCard, marginBottom: 12 }}>
            <p style={reviewLabel}>Parties & Conditions</p>
            <ReviewParty
              name={creatorName || 'You'}
              email={creatorEmail}
              role="CREATOR"
              conditions={state.creatorConditions}
            />
            {state.counterparties.map((cp, i) => (
              <ReviewParty
                key={i}
                name={cp.name}
                email={cp.email}
                role="PARTICIPANT"
                conditions={cp.conditions}
              />
            ))}
          </div>

          {state.error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6,
                padding: '12px 16px',
                marginBottom: 20,
                color: '#EF4444',
                fontSize: 14,
              }}
            >
              {state.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button style={backBtn} onClick={back} disabled={state.loading}>
              ← Back
            </button>
            <button
              style={{ ...primaryBtn, opacity: state.loading ? 0.6 : 1 }}
              disabled={state.loading}
              onClick={handleSubmit}
            >
              {state.loading ? 'Creating pact…' : 'Submit and send invites →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Sent ──────────────────────────────────── */}
      {state.step === 5 && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(212,255,79,0.1)',
              border: '2px solid #D4FF4F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px',
              fontSize: 28,
              color: '#D4FF4F',
            }}
          >
            ✓
          </div>
          <h2
            style={{
              ...stepHeading,
              textAlign: 'center',
            }}
          >
            Pact created!
          </h2>
          <p style={{ ...stepSubtext, textAlign: 'center' }}>
            Invites have been sent. Share these links if email is not configured.
          </p>

          <div style={{ textAlign: 'left', marginBottom: 32 }}>
            {state.resultParties
              .filter((p) => p.role === 'PARTICIPANT')
              .map((p) => (
                <div
                  key={p.email}
                  style={{ ...sectionCard, marginBottom: 8 }}
                >
                  <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                    {p.displayName ?? p.email}
                  </p>
                  <code
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: '#D4FF4F',
                      background: 'rgba(212,255,79,0.06)',
                      padding: '8px 12px',
                      borderRadius: 4,
                      wordBreak: 'break-all',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/pacts/${state.pactId}/accept?token=${p.inviteToken}`
                      : `/pacts/${state.pactId}/accept?token=${p.inviteToken}`}
                  </code>
                </div>
              ))}
          </div>

          <a
            href={`/pacts/${state.pactId}`}
            style={{
              ...primaryBtn,
              display: 'inline-block',
              textDecoration: 'none',
            }}
          >
            View Pact →
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

interface ConditionsBlockProps {
  partyLabel: string
  conditions: ConditionInput[]
  onUpdate: (index: number, patch: Partial<ConditionInput>) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

function ConditionsBlock({
  partyLabel,
  conditions,
  onUpdate,
  onAdd,
  onRemove,
}: ConditionsBlockProps) {
  return (
    <div style={{ ...sectionCard, marginBottom: 12 }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
        {partyLabel}
      </p>
      {conditions.map((cond, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Condition title *"
              value={cond.title}
              onChange={(e) => onUpdate(i, { title: e.target.value })}
            />
            {conditions.length > 1 && (
              <button
                style={{ ...ghostBtn, marginTop: 0, padding: '11px 12px' }}
                onClick={() => onRemove(i)}
              >
                ✕
              </button>
            )}
          </div>
          <input
            style={{ ...inputStyle, marginTop: 6 }}
            placeholder="Description (optional)"
            value={cond.description}
            onChange={(e) => onUpdate(i, { description: e.target.value })}
          />
        </div>
      ))}
      <button style={ghostBtn} onClick={onAdd}>
        + Add condition
      </button>
    </div>
  )
}

interface ReviewPartyProps {
  name: string
  email: string
  role: string
  conditions: ConditionInput[]
}

function ReviewParty({ name, email, role, conditions }: ReviewPartyProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>{name}</span>
        <span style={{ color: '#6B7280', fontSize: 12 }}>{email}</span>
        {role === 'CREATOR' && (
          <span
            style={{
              background: '#242428',
              color: '#6B7280',
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 11,
            }}
          >
            you
          </span>
        )}
      </div>
      {conditions
        .filter((c) => c.title.trim())
        .map((c, i) => (
          <div
            key={i}
            style={{
              borderLeft: '2px solid #242428',
              paddingLeft: 12,
              marginLeft: 4,
              marginBottom: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{c.title}</p>
            {c.description && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>
                {c.description}
              </p>
            )}
          </div>
        ))}
    </div>
  )
}

// ─── Shared styles ───────────────────────────────────────────

const stepHeading: React.CSSProperties = {
  fontFamily: 'var(--font-heading), DM Serif Display, serif',
  fontSize: 28,
  fontWeight: 400,
  margin: '0 0 8px',
  color: '#F0EFE8',
}

const stepSubtext: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 15,
  margin: '0 0 32px',
  lineHeight: 1.5,
}

const fieldGroup: React.CSSProperties = { marginBottom: 20 }

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#F0EFE8',
  marginBottom: 6,
}

const fieldHint: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 12,
  margin: '6px 0 0',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#141416',
  border: '1px solid #242428',
  borderRadius: 6,
  padding: '11px 14px',
  color: '#F0EFE8',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const sectionCard: React.CSSProperties = {
  background: '#141416',
  border: '1px solid #242428',
  borderRadius: 8,
  padding: 16,
}

const primaryBtn: React.CSSProperties = {
  background: '#D4FF4F',
  color: '#0C0C0E',
  padding: '12px 24px',
  border: 'none',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const backBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#6B7280',
  padding: '12px 20px',
  border: '1px solid #242428',
  borderRadius: 6,
  fontWeight: 500,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#6B7280',
  padding: '8px 0',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'inherit',
  marginTop: 4,
}

const reviewLabel: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  margin: '0 0 12px',
}
