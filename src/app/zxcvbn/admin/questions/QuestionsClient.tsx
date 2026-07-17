'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
// Modals portal to <body> so they escape .pp-screen's transform, which would
// otherwise anchor their `position: fixed` to the page instead of the viewport.
import { useRouter } from 'next/navigation'
import { Pencil, Play, Plus, Search, Trash2, X } from 'lucide-react'
import { TIER_ORDER, TIER_LABELS, TYPE_SHORT_LABELS } from '@/lib/config'
import { RUN_GRADED_TYPES, validateQuestion } from '@/lib/question-schema'
import { SolutionRunner } from '@/components/execution/solution-runner'

export type AdminQuestion = {
  id: string
  language: string
  tier: string
  topic: string
  type: string
  question: string
  answer: string
  alternative_answer: string | null
  explanation: string
  expected_output: string | null
  attempts: number
  solveRate: number | null
}

const LANGUAGES = ['python', 'javascript', 'sql']
const TYPES = [
  'write_the_code',
  'fill_in_the_blank',
  'output_prediction',
  'what_is_the_result',
  'spot_the_bug',
]

/** Per-type authoring hints — shown under the type picker for Python. */
const TYPE_HINTS: Record<string, string> = {
  write_the_code:
    'Answer = full solution code. Graded by running the learner’s code and comparing its output to “Expected output”.',
  fill_in_the_blank:
    'Question = prose, a blank line, then code with ___ markers. Answer = the completed code. Graded by output.',
  spot_the_bug:
    'Question = prose, a blank line, then the buggy code. Answer = the fixed code. Graded by output.',
  output_prediction: 'Answer = the exact output the learner must type. No code is run.',
  what_is_the_result: 'Answer = the exact output the learner must type. No code is run.',
}

const EMPTY_FORM = {
  id: '',
  language: 'python',
  tier: 'simple',
  topic: '',
  type: 'write_the_code',
  question: '',
  answer: '',
  alternative_answer: '',
  explanation: '',
  expected_output: '',
}

type FormState = typeof EMPTY_FORM

function rateClass(rate: number | null): string {
  if (rate === null) return 'text-ink-3'
  if (rate >= 60) return 'text-green'
  if (rate >= 20) return 'text-copper'
  return 'text-red'
}

export function QuestionsClient({ questions }: { questions: AdminQuestion[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState('python')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<AdminQuestion | null>(null)
  const [busy, setBusy] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Pyodide runner for deriving expected_output from the solution code.
  // Spawned on first use, kept warm across modal opens, killed on unmount.
  const runnerRef = useRef<SolutionRunner | null>(null)
  useEffect(() => () => runnerRef.current?.dispose(), [])

  const filtered = useMemo(
    () =>
      questions.filter((q) => {
        if (q.language !== langFilter) return false
        if (search) {
          const s = search.toLowerCase()
          if (!q.id.toLowerCase().includes(s) && !q.question.toLowerCase().includes(s)) return false
        }
        return true
      }),
    [questions, langFilter, search]
  )

  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, language: langFilter })
    setError('')
    setModal('add')
  }

  const openEdit = (q: AdminQuestion) => {
    setForm({
      id: q.id,
      language: q.language,
      tier: q.tier,
      topic: q.topic,
      type: q.type,
      question: q.question,
      answer: q.answer,
      alternative_answer: q.alternative_answer ?? '',
      explanation: q.explanation,
      expected_output: q.expected_output ?? '',
    })
    setError('')
    setModal('edit')
  }

  const isRunGraded = form.language === 'python' && RUN_GRADED_TYPES.has(form.type)

  /**
   * Run the solution code in Pyodide and fill expected_output with its stdout.
   * Returns the captured output, or null on failure (error state already set).
   */
  const deriveOutput = async (): Promise<string | null> => {
    if (!form.answer.trim()) {
      setError('Write the solution code in “Answer” first, then run it.')
      return null
    }
    setError('')
    setRunning(true)
    try {
      const runner = (runnerRef.current ??= new SolutionRunner())
      const result = await runner.run(form.answer)
      if (!result.ok) {
        setError(`Solution run failed: ${result.message}`)
        return null
      }
      const stdout = result.stdout.replace(/\n$/, '')
      if (!stdout.trim()) {
        setError('The solution produced no output — add a print(), or fill the expected output manually.')
        return null
      }
      set('expected_output')(stdout)
      return stdout
    } finally {
      setRunning(false)
    }
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      // Run-graded Python questions are checked against the solution's stdout —
      // if the admin left the field blank, derive it by running the solution now.
      let expected = form.expected_output
      if (isRunGraded && !expected.trim()) {
        const derived = await deriveOutput()
        if (derived === null) return
        expected = derived
      }

      const payload = { ...form, expected_output: expected }
      const { errors } = validateQuestion(payload)
      if (errors.length > 0) {
        setError(`${errors[0].field} ${errors[0].message}`)
        return
      }

      const res = await fetch('/api/admin/questions', {
        method: modal === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setModal(null)
      setNotice(`Saved ${form.id}`)
      setTimeout(() => setNotice(''), 3000)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleting.id, language: deleting.language }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      setNotice(`Deleted ${deleting.id}`)
      setTimeout(() => setNotice(''), 3000)
      setDeleting(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pp-screen mx-auto max-w-[1000px]">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-heading text-[24px] font-bold tracking-[-0.01em]">Questions</h1>
          <p className="text-[13px] text-ink-2">{questions.length} total</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-line-2 bg-surface px-3 py-1.5 text-[13px] focus-within:border-copper">
            <Search className="size-3.5 text-ink-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-36 bg-transparent outline-none placeholder:text-ink-3"
            />
          </label>
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="rounded-[10px] border-[1.5px] border-line-2 bg-surface px-2.5 py-1.5 text-[13px]"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-[9px] bg-copper px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-copper-600"
          >
            <Plus className="size-4" /> Add question
          </button>
        </div>
      </div>

      {notice && (
        <p className="mt-3 rounded-lg bg-green-100 px-3 py-2 text-[13px] font-medium text-green">
          {notice}
        </p>
      )}

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-sm)]">
        <div className="grid grid-cols-[64px_1fr_64px_56px_52px_64px] items-center gap-2 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          <span>ID</span>
          <span>Question</span>
          <span>Type</span>
          <span className="text-right">Tries</span>
          <span className="text-right">Solve</span>
          <span className="text-right">Edit</span>
        </div>
        {filtered.map((q) => (
          <div
            key={`${q.language}:${q.id}`}
            className="grid grid-cols-[64px_1fr_64px_56px_52px_64px] items-center gap-2 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-blue-050"
          >
            <span className="font-mono text-[12px] font-semibold text-blue">{q.id}</span>
            <span className="truncate text-[13.5px]">{q.question.split('\n')[0]}</span>
            <span className="truncate font-mono text-[11px] text-ink-3">
              {(TYPE_SHORT_LABELS[q.type] ?? q.type).split(' ')[0]}
            </span>
            <span className="text-right font-mono text-[12px] text-ink-2">{q.attempts}</span>
            <span className={`text-right font-mono text-[12px] font-semibold ${rateClass(q.solveRate)}`}>
              {q.solveRate === null ? '—' : `${q.solveRate}%`}
            </span>
            <span className="flex justify-end gap-1">
              <button
                onClick={() => openEdit(q)}
                aria-label={`Edit ${q.id}`}
                className="grid size-7 place-items-center rounded-lg text-ink-2 hover:bg-blue-100 hover:text-blue"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={() => setDeleting(q)}
                aria-label={`Delete ${q.id}`}
                className="grid size-7 place-items-center rounded-lg text-ink-2 hover:bg-red-100 hover:text-red"
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-ink-3">No questions match.</p>
        )}
        <div className="flex items-center justify-between px-4 py-2.5 text-[12px] text-ink-3">
          <span>
            Bulk import: <code className="font-mono">POST /api/admin/add-questions</code> (dev only)
          </span>
          <span className="font-mono">{filtered.length} shown</span>
        </div>
      </div>

      {/* Add/Edit modal */}
      {modal && createPortal(
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(20,16,10,.5)] p-4 backdrop-blur-[4px] animate-[pp-fadein_.2s_ease_both]"
          onClick={() => !busy && setModal(null)}
        >
          <div
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[760px] rounded-[18px] border border-line bg-surface shadow-[var(--shadow-lg)] animate-[pp-slideup_.3s_ease_both]"
          >
            <div className=" top-0 flex items-center justify-between rounded-t-[18px] border-b border-line bg-surface px-6 py-4">
              <h2 className="font-heading text-[18px] font-bold">
                {modal === 'add' ? 'Add question' : `Edit ${form.id}`}
              </h2>
              <button
                onClick={() => setModal(null)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-[1fr_240px]">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ID">
                    <input
                      value={form.id}
                      onChange={(e) => set('id')(e.target.value)}
                      disabled={modal === 'edit'}
                      placeholder="S031"
                      className="w-full bg-transparent font-mono outline-none disabled:text-ink-3"
                    />
                  </Field>
                  <Field label="Language">
                    <select
                      value={form.language}
                      onChange={(e) => set('language')(e.target.value)}
                      disabled={modal === 'edit'}
                      className="w-full bg-transparent outline-none"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tier">
                    <select
                      value={form.tier}
                      onChange={(e) => set('tier')(e.target.value)}
                      className="w-full bg-transparent outline-none"
                    >
                      {TIER_ORDER.map((t) => (
                        <option key={t} value={t}>
                          {TIER_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Topic">
                    <input
                      value={form.topic}
                      onChange={(e) => set('topic')(e.target.value)}
                      placeholder="loops"
                      className="w-full bg-transparent outline-none"
                    />
                  </Field>
                </div>

                <div>
                  <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => set('type')(t)}
                        className={`rounded-full border-[1.5px] px-2.5 py-1 text-[11.5px] font-medium ${
                          form.type === t
                            ? 'border-blue bg-blue-050 text-blue'
                            : 'border-line-2 text-ink-2'
                        }`}
                      >
                        {TYPE_SHORT_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  {form.language === 'python' && TYPE_HINTS[form.type] && (
                    <p className="mt-1.5 text-[11.5px] leading-snug text-ink-3">
                      {TYPE_HINTS[form.type]}
                    </p>
                  )}
                </div>

                <Field label="Question" tall>
                  <textarea
                    value={form.question}
                    onChange={(e) => set('question')(e.target.value)}
                    rows={4}
                    className="w-full resize-y bg-transparent font-mono text-[12.5px] outline-none"
                  />
                </Field>

                <div>
                  <p className="mb-1.5 text-[12.5px] font-semibold text-copper">
                    Answer (type-aware)
                  </p>
                  <textarea
                    value={form.answer}
                    onChange={(e) => set('answer')(e.target.value)}
                    rows={3}
                    placeholder={
                      form.type.includes('output') || form.type === 'what_is_the_result'
                        ? 'the exact expected output'
                        : 'full solution code'
                    }
                    className="w-full resize-y rounded-[10px] bg-code-bg p-3 font-mono text-[12.5px] text-code-ink outline-none placeholder:text-white/30"
                  />
                </div>

                <Field label="Alternative answer (optional)">
                  <input
                    value={form.alternative_answer}
                    onChange={(e) => set('alternative_answer')(e.target.value)}
                    className="w-full bg-transparent font-mono text-[12.5px] outline-none"
                  />
                </Field>

                <Field label="Explanation" tall>
                  <textarea
                    value={form.explanation}
                    onChange={(e) => set('explanation')(e.target.value)}
                    rows={2}
                    className="w-full resize-y bg-transparent text-[13px] outline-none"
                  />
                </Field>

                {isRunGraded && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-ink-2">
                        Expected output (stdout of the solution — used by the checker)
                      </span>
                      <button
                        onClick={deriveOutput}
                        disabled={running || busy}
                        className="flex shrink-0 items-center gap-1 rounded-[8px] border-[1.5px] border-line-2 px-2.5 py-1 text-[11.5px] font-semibold text-ink-2 hover:border-blue hover:text-blue disabled:opacity-60"
                      >
                        <Play className="size-3" />
                        {running ? 'Running…' : 'Run solution → fill'}
                      </button>
                    </div>
                    <div className="rounded-[10px] border-[1.5px] border-line-2 bg-surface px-3 py-2 text-[13.5px] focus-within:border-copper focus-within:shadow-[0_0_0_3px_var(--copper-050)]">
                      <textarea
                        value={form.expected_output}
                        onChange={(e) => set('expected_output')(e.target.value)}
                        rows={2}
                        placeholder="Leave blank — derived automatically by running the solution on save"
                        className="w-full resize-y bg-transparent font-mono text-[12.5px] outline-none placeholder:text-ink-3"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live preview */}
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[.14em] text-copper">
                  Live learner preview
                </p>
                <div className="rounded-xl border-2 border-dashed border-copper/40 p-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-2">
                      {TYPE_SHORT_LABELS[form.type] ?? form.type}
                    </span>
                    <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-2">
                      {form.topic || 'topic'}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[12.5px] font-medium leading-snug">
                    {form.question || 'Your question text appears here…'}
                  </p>
                  <div className="mt-3 rounded-lg bg-code-bg p-2.5 font-mono text-[11px] text-white/40">
                    # your code…
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
              {error && <p className="mr-auto text-[13px] font-medium text-red">{error}</p>}
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="rounded-[9px] border-[1.5px] border-line-2 px-4 py-2 text-[13px] font-semibold text-ink-2 hover:border-blue hover:text-blue"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-[9px] bg-blue px-4 py-2 text-[13px] font-semibold text-on-blue hover:bg-blue-600 disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Save question'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirm */}
      {deleting && createPortal(
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(20,16,10,.5)] p-4 backdrop-blur-[4px] animate-[pp-fadein_.2s_ease_both]"
          onClick={() => !busy && setDeleting(null)}
        >
          <div
            role="alertdialog"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] rounded-[18px] border border-line bg-surface p-6 shadow-[var(--shadow-lg)] animate-[pp-pop_.25s_ease_both]"
          >
            <h2 className="font-heading text-[17px] font-bold">Delete {deleting.id}?</h2>
            <p className="mt-2 text-[13.5px] text-ink-2">
              This permanently removes the question from the {deleting.language} set. Learner
              attempt history is kept.
            </p>
            {error && <p className="mt-2 text-[13px] font-medium text-red">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                disabled={busy}
                className="rounded-[9px] border-[1.5px] border-line-2 px-4 py-2 text-[13px] font-semibold text-ink-2"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={busy}
                className="rounded-[9px] bg-red px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function Field({
  label,
  tall = false,
  children,
}: {
  label: string
  tall?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">{label}</span>
      <div
        className={`rounded-[10px] border-[1.5px] border-line-2 bg-surface px-3 text-[13.5px] focus-within:border-copper focus-within:shadow-[0_0_0_3px_var(--copper-050)] ${
          tall ? 'py-2' : 'py-[9px]'
        }`}
      >
        {children}
      </div>
    </label>
  )
}
