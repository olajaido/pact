'use client'

import { useState } from 'react'

interface ConditionInput { title: string; description: string }
interface Counterparty { email: string; name: string; conditions: ConditionInput[] }

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

const emptyCondition = (): ConditionInput => ({ title: '', description: '' })
const emptyCounterparty = (): Counterparty => ({ email: '', name: '', conditions: [emptyCondition()] })

export function CreatePactForm({ creatorEmail, creatorName }: { creatorEmail: string; creatorName: string }) {
  const [state, setState] = useState<FormState>({
    step: 1, title: '', description: '', outcomeStatement: '',
    counterparties: [emptyCounterparty()], creatorConditions: [emptyCondition()],
    pactId: '', resultParties: [], error: null, loading: false,
  })

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setState((p) => ({ ...p, [key]: val }))
  }
  function advance() { setState((p) => ({ ...p, step: (p.step + 1) as FormState['step'] })) }
  function back() { setState((p) => ({ ...p, step: (p.step - 1) as FormState['step'], error: null })) }
  function canAdvance1() { return state.title.trim().length > 0 && state.outcomeStatement.trim().length > 0 }
  function canAdvance2() { return state.counterparties.every((cp) => cp.email.trim() && cp.name.trim()) }
  function canAdvance3() {
    return state.creatorConditions.every((c) => c.title.trim()) &&
      state.counterparties.every((cp) => cp.conditions.every((c) => c.title.trim()))
  }

  function updateCp(i: number, patch: Partial<Counterparty>) {
    setState((p) => ({ ...p, counterparties: p.counterparties.map((cp, j) => j === i ? { ...cp, ...patch } : cp) }))
  }
  function updateCpCond(ci: number, di: number, patch: Partial<ConditionInput>) {
    setState((p) => ({
      ...p,
      counterparties: p.counterparties.map((cp, j) =>
        j === ci ? { ...cp, conditions: cp.conditions.map((c, k) => k === di ? { ...c, ...patch } : c) } : cp),
    }))
  }
  function updateCreatorCond(i: number, patch: Partial<ConditionInput>) {
    setState((p) => ({ ...p, creatorConditions: p.creatorConditions.map((c, j) => j === i ? { ...c, ...patch } : c) }))
  }

  async function handleSubmit() {
    setState((p) => ({ ...p, loading: true, error: null }))
    try {
      const parties = [
        { email: creatorEmail, name: creatorName || 'You', conditions: state.creatorConditions.filter((c) => c.title.trim()) },
        ...state.counterparties.map((cp) => ({
          email: cp.email.trim(), name: cp.name.trim(),
          conditions: cp.conditions.filter((c) => c.title.trim()),
        })),
      ]
      const createRes = await fetch('/api/pacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: state.title.trim(), description: state.description.trim() || undefined, outcomeStatement: state.outcomeStatement.trim(), parties }),
      })
      if (!createRes.ok) throw new Error(((await createRes.json()) as { error?: string }).error ?? 'Failed to create')
      const created = (await createRes.json()) as { pact: { id: string }; parties: FormState['resultParties'] }
      const submitRes = await fetch(`/api/pacts/${created.pact.id}/submit`, { method: 'POST' })
      if (!submitRes.ok) throw new Error(((await submitRes.json()) as { error?: string }).error ?? 'Failed to submit')
      setState((p) => ({ ...p, pactId: created.pact.id, resultParties: created.parties, loading: false, step: 5 }))
    } catch (err) {
      setState((p) => ({ ...p, loading: false, error: err instanceof Error ? err.message : 'Something went wrong' }))
    }
  }

  return (
    <div className="w-full" style={{ maxWidth: 768 }}>
      {/* Progress bar */}
      {state.step < 5 && (
        <div className="w-full mb-stack-lg">
          <div className="flex justify-between items-center mb-stack-md">
            <h2
              className="text-on-surface font-semibold"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: 28 }}
            >
              {state.step === 1 ? 'Define the Pact'
                : state.step === 2 ? 'Add Parties'
                : state.step === 3 ? 'Set Conditions'
                : 'Review & Deploy'}
            </h2>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Step {state.step} of 4
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-full transition-all duration-300"
                style={{ height: 2, flex: 1, background: state.step >= n ? '#c3f400' : '#444933' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Basics */}
      {state.step === 1 && (
        <div className="space-y-stack-lg">
          {[
            { label: 'PACT TITLE *', key: 'title' as const, placeholder: 'e.g. Website Redesign — Final Delivery', hint: '' },
            { label: 'OUTCOME STATEMENT *', key: 'outcomeStatement' as const, placeholder: 'e.g. Both parties confirm project complete and payment approved', hint: 'What happens when this Pact executes — one sentence.' },
          ].map((field) => (
            <div
              key={field.key}
              className="p-stack-lg"
              style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)', borderRadius: 12 }}
            >
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-3 uppercase tracking-widest">
                {field.label}
              </label>
              <input
                className="input-underline"
                placeholder={field.placeholder}
                value={state[field.key]}
                maxLength={200}
                onChange={(e) => set(field.key, e.target.value)}
              />
              {field.hint && (
                <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60 mt-2">{field.hint}</p>
              )}
            </div>
          ))}
          <div className="p-stack-lg" style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)', borderRadius: 12 }}>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-3 uppercase tracking-widest">
              CONTEXT (OPTIONAL)
            </label>
            <textarea
              className="input-underline"
              style={{ minHeight: 80, resize: 'vertical' }}
              placeholder="Background context about this agreement..."
              value={state.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <NextBtn disabled={!canAdvance1()} onClick={advance} label="Next: Add Parties" />
        </div>
      )}

      {/* Step 2: Parties */}
      {state.step === 2 && (
        <div className="space-y-stack-md">
          <div className="p-stack-md" style={{ background: '#201f1f', borderLeft: '2px solid #c3f400', borderRadius: 8 }}>
            <p className="font-label-sm text-label-sm text-primary-fixed mb-1">PARTY A — YOU (CREATOR)</p>
            <p className="font-bold text-on-surface">{creatorName || creatorEmail}</p>
            <p className="font-body-md text-on-surface-variant text-sm">{creatorEmail}</p>
          </div>
          {state.counterparties.map((cp, i) => (
            <div key={i} className="p-stack-md" style={{ background: '#201f1f', borderLeft: '2px solid #444933', borderRadius: 8 }}>
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-stack-sm">PARTY {i + 2}</p>
              <div className="grid grid-cols-2 gap-stack-md mb-stack-sm">
                <div>
                  <label className="block font-label-sm text-[10px] text-on-surface-variant mb-2">NAME *</label>
                  <input className="input-underline" placeholder="Sarah Chen" value={cp.name} onChange={(e) => updateCp(i, { name: e.target.value })} />
                </div>
                <div>
                  <label className="block font-label-sm text-[10px] text-on-surface-variant mb-2">EMAIL *</label>
                  <input className="input-underline" type="email" placeholder="sarah@example.com" value={cp.email} onChange={(e) => updateCp(i, { email: e.target.value })} />
                </div>
              </div>
              {state.counterparties.length > 1 && (
                <button
                  className="font-label-sm text-label-sm text-on-surface-variant hover:text-error transition-colors"
                  onClick={() => setState((p) => ({ ...p, counterparties: p.counterparties.filter((_, j) => j !== i) }))}
                >
                  Remove party
                </button>
              )}
            </div>
          ))}
          {state.counterparties.length < 4 && (
            <button
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors flex items-center gap-1"
              onClick={() => setState((p) => ({ ...p, counterparties: [...p.counterparties, emptyCounterparty()] }))}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add another party
            </button>
          )}
          <div className="flex gap-stack-md pt-stack-md">
            <BackBtn onClick={back} />
            <NextBtn disabled={!canAdvance2()} onClick={advance} label="Next: Set Conditions" />
          </div>
        </div>
      )}

      {/* Step 3: Conditions */}
      {state.step === 3 && (
        <div className="space-y-stack-md">
          <ConditionsBlock
            label={`YOUR CONDITIONS (${creatorName || creatorEmail})`}
            conditions={state.creatorConditions}
            onUpdate={(i, patch) => updateCreatorCond(i, patch)}
            onAdd={() => setState((p) => ({ ...p, creatorConditions: [...p.creatorConditions, emptyCondition()] }))}
            onRemove={(i) => setState((p) => ({ ...p, creatorConditions: p.creatorConditions.filter((_, j) => j !== i) }))}
          />
          {state.counterparties.map((cp, ci) => (
            <ConditionsBlock
              key={ci}
              label={`${cp.name || cp.email}'s CONDITIONS`}
              conditions={cp.conditions}
              onUpdate={(di, patch) => updateCpCond(ci, di, patch)}
              onAdd={() => setState((p) => ({ ...p, counterparties: p.counterparties.map((x, j) => j === ci ? { ...x, conditions: [...x.conditions, emptyCondition()] } : x) }))}
              onRemove={(di) => setState((p) => ({ ...p, counterparties: p.counterparties.map((x, j) => j === ci ? { ...x, conditions: x.conditions.filter((_, k) => k !== di) } : x) }))}
            />
          ))}
          <div className="flex gap-stack-md pt-stack-md">
            <BackBtn onClick={back} />
            <NextBtn disabled={!canAdvance3()} onClick={advance} label="Review & Deploy" />
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {state.step === 4 && (
        <div className="space-y-stack-md">
          <div className="p-stack-lg" style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)', borderRadius: 8 }}>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase tracking-widest">Pact</p>
            <h3 className="text-on-surface mb-1" style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600 }}>{state.title}</h3>
            {state.description && <p className="font-body-md text-on-surface-variant text-sm mb-2">{state.description}</p>}
            <p className="font-body-md text-on-surface-variant text-sm"><strong className="text-on-surface">Outcome:</strong> {state.outcomeStatement}</p>
          </div>
          <div className="p-stack-lg" style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)', borderRadius: 8 }}>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-stack-md uppercase tracking-widest">Parties & Conditions</p>
            {[
              { name: creatorName || 'You', email: creatorEmail, role: 'CREATOR', conditions: state.creatorConditions },
              ...state.counterparties.map((cp) => ({ name: cp.name, email: cp.email, role: 'PARTICIPANT', conditions: cp.conditions })),
            ].map((p, i) => (
              <div key={i} style={{ borderBottom: i < state.counterparties.length ? '1px solid rgba(68,73,51,0.3)' : 'none', paddingBottom: 12, marginBottom: 12 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-on-surface text-sm">{p.name}</span>
                  <span className="text-on-surface-variant text-[11px]">{p.email}</span>
                  {p.role === 'CREATOR' && (
                    <span className="font-label-sm text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(195,244,0,0.15)', color: '#c3f400' }}>you</span>
                  )}
                </div>
                {p.conditions.filter((c) => c.title.trim()).map((c, ci) => (
                  <div key={ci} className="flex items-start gap-2 ml-3">
                    <span className="font-mono text-primary-fixed-dim text-[10px] mt-0.5">{String(ci + 1).padStart(2, '0')}</span>
                    <p className="text-on-surface-variant text-[12px]">{c.title}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {state.error && (
            <div className="p-stack-md rounded-lg font-body-md text-[13px]" style={{ background: 'rgba(255,180,171,0.1)', border: '1px solid rgba(255,180,171,0.3)', color: '#ffb4ab' }}>
              {state.error}
            </div>
          )}
          <div className="flex gap-stack-md pt-stack-md">
            <BackBtn onClick={back} disabled={state.loading} />
            <button
              disabled={state.loading}
              onClick={handleSubmit}
              className="bg-primary-fixed text-on-primary-fixed font-bold py-3 px-8 rounded-full font-label-sm text-label-sm glow-hover transition-all active:scale-95 flex items-center gap-2"
              style={{ opacity: state.loading ? 0.6 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {state.loading ? 'hourglass_empty' : 'rocket_launch'}
              </span>
              {state.loading ? 'Deploying Pact…' : 'Deploy Pact'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Sent */}
      {state.step === 5 && (
        <div className="text-center space-y-stack-lg">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgba(195,244,0,0.1)', border: '2px solid #c3f400' }}
          >
            <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <div>
            <h2 className="text-on-surface mb-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 600 }}>
              Pact Deployed
            </h2>
            <p className="font-body-md text-on-surface-variant">Invites sent. Share these links if email is not configured.</p>
          </div>
          <div className="text-left space-y-stack-sm">
            {state.resultParties.filter((p) => p.role === 'PARTICIPANT').map((p) => (
              <div key={p.email} className="p-stack-md" style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)', borderRadius: 8 }}>
                <p className="font-bold text-on-surface mb-1 text-sm">{p.displayName ?? p.email}</p>
                <code
                  className="block text-[11px] font-mono text-primary-fixed-dim break-all"
                  style={{ background: 'rgba(195,244,0,0.06)', padding: '8px 12px', borderRadius: 4 }}
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
            className="inline-flex items-center gap-2 bg-primary-fixed text-on-primary-fixed font-bold py-3 px-8 rounded-full font-label-sm text-label-sm glow-hover transition-all active:scale-95"
            style={{ textDecoration: 'none' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
            View Pact
          </a>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

interface ConditionsBlockProps {
  label: string
  conditions: ConditionInput[]
  onUpdate: (i: number, patch: Partial<ConditionInput>) => void
  onAdd: () => void
  onRemove: (i: number) => void
}

function ConditionsBlock({ label, conditions, onUpdate, onAdd, onRemove }: ConditionsBlockProps) {
  return (
    <div className="p-stack-lg" style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)', borderRadius: 8 }}>
      <p className="font-label-sm text-label-sm text-on-surface-variant mb-stack-md uppercase tracking-widest">{label}</p>
      {conditions.map((c, i) => (
        <div key={i} className="mb-stack-md">
          <div className="flex gap-2 items-start">
            <input
              className="input-underline flex-1"
              placeholder="Condition title *"
              value={c.title}
              onChange={(e) => onUpdate(i, { title: e.target.value })}
            />
            {conditions.length > 1 && (
              <button className="text-on-surface-variant hover:text-error mt-2" onClick={() => onRemove(i)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            )}
          </div>
          <input
            className="input-underline mt-2"
            placeholder="Description (optional)"
            value={c.description}
            onChange={(e) => onUpdate(i, { description: e.target.value })}
          />
        </div>
      ))}
      <button
        className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors flex items-center gap-1 mt-2"
        onClick={onAdd}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
        Add condition
      </button>
    </div>
  )
}

function NextBtn({ disabled, onClick, label }: { disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="bg-primary-fixed text-on-primary-fixed font-bold py-3 px-8 rounded-full font-label-sm text-label-sm glow-hover transition-all active:scale-95 flex items-center gap-2"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {label}
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
    </button>
  )
}

function BackBtn({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border text-on-surface-variant font-bold py-3 px-6 rounded-full font-label-sm text-label-sm transition-all"
      style={{ borderColor: '#8e9379' }}
    >
      ← Back
    </button>
  )
}
