'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import AppHeader from '@/components/AppHeader';
import SuccessOverlay from '@/components/SuccessOverlay';
import ErrorOverlay from '@/components/ErrorOverlay';
import QuestionDetail from '@/components/QuestionDetail';
import QuestionBrowser from '@/components/sidebar/QuestionBrowser';
import SolutionRevealPanel from '@/components/solution/SolutionRevealPanel';
import MobileDrawer from '@/components/layout/MobileDrawer';
import ShortcutsHelpDialog from '@/components/ShortcutsHelpDialog';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useTheme } from '@/lib/hooks/useTheme';
import type { CompilerHandle, WrongAttemptContext } from '@/components/Compiler';
import type { Question, QuestionStatus } from '@/lib/types';
import type { CurrentUser } from '@/lib/auth/user';
import type { SolveReward } from '@/lib/tracking';
import { getNextQuestion, getPrevQuestion, splitPrompt } from '@/lib/questions';
import { JS_STARTER_CODE, SQL_STARTER_CODE, STARTER_CODE } from '@/lib/config';
import {
  getAllStatuses,
  clearGuestData,
  getAllAttemptCounts,
  setQuestionStatus,
  setAttemptCount,
  getLastSession,
  setLastSession,
  getSavedCode,
} from '@/lib/storage';

const Compiler = dynamic(() => import('@/components/Compiler'), { ssr: false });

interface Props {
  questions: Question[];
  initialQuestionId?: string;
  user?: CurrentUser | null;
  /** Server-side progress for signed-in users (from question_progress). */
  serverStatuses?: Record<string, QuestionStatus>;
  serverAttemptCounts?: Record<string, number>;
}

export default function HomeClient({
  questions,
  initialQuestionId,
  user = null,
  serverStatuses = {},
  serverAttemptCounts = {},
}: Props) {
  const questionMap = useMemo(
    () => new Map<string, Question>(questions.map((q) => [q.id, q])),
    [questions]
  );

  const firstId = (questions.find((q) => q.tier === 'simple') ?? questions[0])?.id ?? 'S001';

  const [selectedId, setSelectedId] = useState<string>(
    initialQuestionId && questions.some((q) => q.id === initialQuestionId)
      ? initialQuestionId
      : firstId
  );
  const { isDark, toggle: toggleTheme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>(
    user ? serverAttemptCounts : {}
  );
  const [lastWrongContext, setLastWrongContext] = useState<Record<string, WrongAttemptContext>>({});
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>(
    user ? serverStatuses : {}
  );
  const [compilerStatus, setCompilerStatus] = useState<'idle' | 'loading' | 'running' | 'error'>('loading');
  const [bridgeReady, setBridgeReady] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [lastReward, setLastReward] = useState<SolveReward | null>(null);

  const compilerRef = useRef<CompilerHandle>(null);

  // Guest mode: load localStorage progress after hydration (avoids SSR mismatch).
  // Logged in: wipe guest data — the account's progress lives server-side.
  useEffect(() => {
    if (user) {
      clearGuestData();
      return;
    }
    setStatuses(getAllStatuses());
    setAttemptCounts(getAllAttemptCounts());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session resume on mount — only when no specific question was requested via URL
  useEffect(() => {
    if (initialQuestionId) return;
    const session = getLastSession();
    if (session && questionMap.has(session.questionId)) {
      setSelectedId(session.questionId);
    }
  }, [questionMap, initialQuestionId]);

  // Persistence is handled directly inside each handler — no bulk effects needed

  const selectedQuestion = questionMap.get(selectedId) ?? null;
  const attemptCount = attemptCounts[selectedId] ?? 0;
  const questionStatus = statuses[selectedId] ?? 'not_started';

  const defaultStarterCode =
    selectedQuestion?.language === 'sql'
      ? SQL_STARTER_CODE
      : selectedQuestion?.language === 'javascript'
        ? JS_STARTER_CODE
        : STARTER_CODE;

  // Saved code for the current question — read at selection time
  const savedCode = useMemo(() => {
    const saved = getSavedCode(selectedId);
    if (saved) return saved;
    // fill_in_the_blank (blank template) and spot_the_bug (buggy code) pre-load
    // their code into the editor so the learner edits and runs it.
    if (
      selectedQuestion &&
      (selectedQuestion.type === 'fill_in_the_blank' || selectedQuestion.type === 'spot_the_bug')
    ) {
      const { code } = splitPrompt(selectedQuestion);
      if (code) return code;
    }
    return defaultStarterCode;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleAttempt = useCallback((questionId: string, passed: boolean, wrongContext?: WrongAttemptContext, reward?: SolveReward | null) => {
    // Guest progress persists in localStorage; signed-in progress is recorded
    // server-side by the submit APIs, so skip guest storage entirely.
    const persistLocally = !user;
    if (passed) {
      setStatuses((prev) => ({ ...prev, [questionId]: 'solved' }));
      if (persistLocally) setQuestionStatus(questionId, 'solved');
      setAttemptCounts((prev) => ({ ...prev, [questionId]: 0 }));
      if (persistLocally) setAttemptCount(questionId, 0);
      setLastReward(reward ?? null);
      setShowSuccess(true);
    } else {
      setShowError(true);
      setAttemptCounts((prev) => {
        const newCount = (prev[questionId] ?? 0) + 1;
        if (persistLocally) setAttemptCount(questionId, newCount);
        return { ...prev, [questionId]: newCount };
      });
      setStatuses((prev) => {
        if (prev[questionId] === 'solved') return prev;
        if (persistLocally) setQuestionStatus(questionId, 'attempted');
        return { ...prev, [questionId]: 'attempted' };
      });
      if (wrongContext) {
        setLastWrongContext((prev) => ({ ...prev, [questionId]: wrongContext }));
      }
    }
  }, [user]);

  const handleTryAgain = useCallback(() => {
    setAttemptCounts((prev) => ({ ...prev, [selectedId]: 0 }));
    if (!user) setAttemptCount(selectedId, 0);
  }, [selectedId, user]);

  const handleMarkSolved = useCallback(() => {
    setStatuses((prev) => ({ ...prev, [selectedId]: 'solved' }));
    setAttemptCounts((prev) => ({ ...prev, [selectedId]: 0 }));
    if (!user) {
      setQuestionStatus(selectedId, 'solved');
      setAttemptCount(selectedId, 0);
    }
  }, [selectedId, user]);

  const handleNextQuestion = useCallback(() => {
    const tierQuestions = questions.filter((q) => q.tier === selectedQuestion?.tier);
    const next = getNextQuestion(selectedId, tierQuestions);
    if (next) setSelectedId(next.id);
  }, [selectedId, selectedQuestion?.tier, questions]);

  const handlePrevQuestion = useCallback(() => {
    const tierQuestions = questions.filter((q) => q.tier === selectedQuestion?.tier);
    const prev = getPrevQuestion(selectedId, tierQuestions);
    if (prev) setSelectedId(prev.id);
  }, [selectedId, selectedQuestion?.tier, questions]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const q = questionMap.get(id);
    if (q) setLastSession(id, q.tier);
    setIsMobileOpen(false);
  }, [questionMap]);

  const handleRun = useCallback(() => {
    compilerRef.current?.run();
  }, []);

  const handleSubmit = useCallback(() => {
    compilerRef.current?.submit();
  }, []);

  const handleReset = useCallback(() => {
    compilerRef.current?.reset();
  }, []);

  const handleFocusEditor = useCallback(() => {
    compilerRef.current?.focusEditor();
  }, []);

  const handleStatusChange = useCallback(
    (status: 'idle' | 'loading' | 'running' | 'error', ready: boolean, ran: boolean) => {
      setCompilerStatus(status);
      setBridgeReady(ready);
      setHasRun(ran);
    },
    []
  );

  const handleAttemptForCurrent = useCallback(
    (passed: boolean, wrongContext?: WrongAttemptContext, reward?: SolveReward | null) =>
      handleAttempt(selectedId, passed, wrongContext, reward),
    [selectedId, handleAttempt]
  );

  useKeyboardShortcuts({
    onRun: handleRun,
    onReset: handleReset,
    onNextQuestion: handleNextQuestion,
    onPrevQuestion: handlePrevQuestion,
    onToggleSidebar: () => setIsSidebarCollapsed((c) => !c),
    onToggleDetail: () => setIsDetailOpen((o) => !o),
    onFocusEditor: handleFocusEditor,
    onToggleHelp: () => setIsShortcutsOpen((o) => !o),
  });

  return (
    <div className="flex flex-col h-[100dvh]">
      <AppHeader
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onMobileMenuOpen={() => setIsMobileOpen(true)}
        onRun={handleRun}
        onSubmit={handleSubmit}
        onShowShortcuts={() => setIsShortcutsOpen(true)}
        isRunning={compilerStatus === 'running'}
        isLoading={compilerStatus === 'loading' || !bridgeReady}
        canSubmit={
          selectedQuestion?.type === 'output_prediction' || selectedQuestion?.type === 'what_is_the_result'
            ? true
            : hasRun && bridgeReady && compilerStatus === 'idle'
        }
        statuses={statuses}
        question={selectedQuestion}
        user={user}
        showBackButton={!!initialQuestionId}
        hideRun={
          selectedQuestion?.type === 'output_prediction' ||
          selectedQuestion?.type === 'what_is_the_result'
        }
        hintProps={
          selectedQuestion && lastWrongContext[selectedId]
            ? { question: selectedQuestion, wrongContext: lastWrongContext[selectedId] }
            : undefined
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex shrink-0">
          <QuestionBrowser
            questions={questions}
            selectedId={selectedId}
            statuses={statuses}
            onSelect={handleSelect}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapsed={() => setIsSidebarCollapsed((c) => !c)}
          />
        </div>

        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background text-foreground">
          <QuestionDetail
            question={selectedQuestion}
            open={isDetailOpen}
            onOpenChange={setIsDetailOpen}
          />

          <div className="flex-1 overflow-hidden">
            <Compiler
              ref={compilerRef}
              question={selectedQuestion}
              initialCode={savedCode}
              onAttempt={handleAttemptForCurrent}
              onStatusChange={handleStatusChange}
              hintProps={
                selectedQuestion && lastWrongContext[selectedId]
                  ? { question: selectedQuestion, wrongContext: lastWrongContext[selectedId] }
                  : undefined
              }
            />
          </div>

          <SolutionRevealPanel
            question={selectedQuestion}
            attemptCount={attemptCount}
            questionStatus={questionStatus}
            onTryAgain={handleTryAgain}
            onNextQuestion={handleNextQuestion}
            onMarkSolved={handleMarkSolved}
          />
        </main>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={isMobileOpen} onClose={() => setIsMobileOpen(false)}>
        <QuestionBrowser
          questions={questions}
          selectedId={selectedId}
          statuses={statuses}
          onSelect={handleSelect}
          fullWidth
        />
      </MobileDrawer>

      <ShortcutsHelpDialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />
      <SuccessOverlay
        show={showSuccess}
        reward={lastReward}
        onNext={() => { setShowSuccess(false); handleNextQuestion(); }}
        onReview={() => setShowSuccess(false)}
      />
      <ErrorOverlay show={showError} onDone={() => setShowError(false)} />
    </div>
  );
}
