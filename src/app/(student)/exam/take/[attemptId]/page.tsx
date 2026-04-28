// src/app/(student)/exam/take/[attemptId]/page.tsx
"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { SafeHtml } from "@/lib/utils/safe-html";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2,
  User,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Delete,
} from "lucide-react";
import { ExamLockdown } from "@/components/exam/ExamLockdown";

interface Option {
  key: string;
  text: string;
  imageUrl: string | null;
}

// AFTER:
interface MatchPairs {
  leftColumn: { header: string; items: string[] };
  rightColumn: { header: string; items: string[] };
}

interface Question {
  id: string;
  sequence: number;
  statement: string;
  imageUrl: string | null;
  topic: string;
  marks: number;
  negativeMarks: number;
  difficulty: "easy" | "medium" | "hard";
  options: Option[];
  type: "mcq" | "numerical" | "match"; // ✅ added 'match'
  correctAnswerExact?: number | null;
  correctAnswerMin?: number | null;
  correctAnswerMax?: number | null;
  matchPairs?: MatchPairs | null; // ✅ added
}

interface ExamData {
  attemptId: string;
  examId: string;
  examTitle: string;
  duration: number;
  totalQuestions: number;
  expiresAt: string;
  allowReview: boolean;
  questions: Question[];
}

// ✅ NEW: renders Column I / Column II table for match questions
const LEFT_LABELS = ["A", "B", "C", "D", "E", "F"];
const RIGHT_LABELS = ["i", "ii", "iii", "iv", "v", "vi"];

function MatchTable({ matchPairs }: { matchPairs: MatchPairs }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 mb-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 font-medium w-1/2 text-gray-700">
              {matchPairs.leftColumn.header}
            </th>
            <th className="text-left px-4 py-2.5 font-medium w-1/2 text-gray-700">
              {matchPairs.rightColumn.header}
            </th>
          </tr>
        </thead>
        <tbody>
          {matchPairs.leftColumn.items.map((leftItem, index) => (
            <tr key={index} className="border-b border-gray-200 last:border-0">
              <td className="px-4 py-2.5 align-middle text-gray-700">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold mr-2 shrink-0">
                  {LEFT_LABELS[index]}
                </span>
                <SafeHtml html={leftItem} className="inline" />
              </td>
              <td className="px-4 py-2.5 align-middle text-gray-700">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold mr-2 shrink-0">
                  {RIGHT_LABELS[index]}
                </span>
                <SafeHtml
                  html={matchPairs.rightColumn.items[index]}
                  className="inline"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Numerical Calculator ───────────────────────────────────────────────────

function NumericalCalculator({
  questionId,
  value,
  onChange,
}: {
  questionId: string;
  value: string;
  onChange: (
    questionId: string,
    display: string,
    numValue: number | null,
  ) => void;
}) {
  const handleButton = (key: string) => {
    let next = value;
    if (key === "backspace") {
      next = value.slice(0, -1);
    } else if (key === "-") {
      next = value.startsWith("-") ? value.slice(1) : "-" + value;
    } else if (key === ".") {
      if (!value.includes(".")) next = value + ".";
    } else {
      next = value === "0" && key !== "." ? key : value + key;
    }
    const parsed = parseFloat(next);
    const isValid =
      next !== "" && next !== "-" && next !== "." && !isNaN(parsed);
    onChange(questionId, next, isValid ? parsed : null);
  };

  const buttons = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    [".", "0", "-"],
  ];

  return (
    <div className="flex flex-col items-start gap-4 py-4">
      <div className="w-72 bg-gray-900 text-white rounded-lg p-4 flex items-center justify-between min-h-[56px]">
        <span className="text-2xl font-mono tracking-widest">
          {value || "___"}
        </span>
        <button
          onClick={() => handleButton("backspace")}
          className="text-gray-400 hover:text-white transition-colors ml-2"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 w-72">
        {buttons.map((row, i) =>
          row.map((key) => (
            <button
              key={`${i}-${key}`}
              onClick={() => handleButton(key)}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-lg rounded-lg py-4 transition-colors"
            >
              {key}
            </button>
          )),
        )}
      </div>
    </div>
  );
}

// ─── Thank You Screen ───────────────────────────────────────────────────────

function ThankYouScreen({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [dots, setDots] = useState(".");

  // Animated dots for "Calculating"
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll status every 3 seconds, force redirect after 30 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.graded) {
          router.push(`/results/${attemptId}`);
        }
      } catch (e) {
        // silent — will retry on next interval
      }
    };

    poll();
    const interval = setInterval(poll, 3000);

    // Safety net: redirect after 30 seconds regardless of grading status
    const forceRedirect = setTimeout(() => {
      router.push(`/results/${attemptId}`);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(forceRedirect);
    };
  }, [attemptId, router]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center border border-green-100">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Exam Submitted!
        </h1>
        <p className="text-gray-500 mb-8">
          Your answers have been recorded. Calculating your results{dots}
        </p>
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            This usually takes a few seconds.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            You will be redirected automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Exam Interface ────────────────────────────────────────────────────

export default function ExamInterface() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const attemptId = params.attemptId as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState<
    Record<string, string | number | null>
  >({});
  const [numericalDisplays, setNumericalDisplays] = useState<
    Record<string, string>
  >({});
  const [markedForReview, setMarkedForReview] = useState<
    Record<string, boolean>
  >({});
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isMaximizeMode, setIsMaximizeMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const answersRef = useRef<Record<string, string | number | null>>({});
  const markedForReviewRef = useRef<Record<string, boolean>>({});
  const examRef = useRef<ExamData | null>(null);
  const submittedRef = useRef(false);
  const lockdownRef = useRef<any>(null);
  const saveTimerRef = useRef<NodeJS.Timeout>();

  // ✅ NEW: per-question time tracking (refs — never cause re-renders)
  // timePerQuestion  : accumulated seconds per questionId
  // questionEnteredAt: Date.now() when student last landed on current question (null = not timing)
  const timePerQuestion = useRef<Record<string, number>>({});
  const questionEnteredAt = useRef<number | null>(null);
  const currentQuestionRef = useRef<number>(0); // mirror of currentQuestion state for use in callbacks

  // keep currentQuestionRef in sync
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // ── time tracking helpers ──────────────────────────────────────────────────

  /** Pause timer on the question the student is LEAVING. */
  const pauseCurrentQuestionTimer = useCallback(() => {
    if (questionEnteredAt.current === null || !examRef.current) return;
    const qId = examRef.current.questions[currentQuestionRef.current]?.id;
    if (!qId) return;
    const elapsed = Math.floor((Date.now() - questionEnteredAt.current) / 1000);
    timePerQuestion.current[qId] =
      (timePerQuestion.current[qId] || 0) + elapsed;
    questionEnteredAt.current = null;
  }, []);

  /** Start/resume timer for the question the student just ARRIVED on. */
  const resumeCurrentQuestionTimer = useCallback(() => {
    questionEnteredAt.current = Date.now();
  }, []);

  /** Snapshot: flush in-flight time for the current question into the map. */
  const getTimeSnapshot = useCallback((): Record<string, number> => {
    if (questionEnteredAt.current !== null && examRef.current) {
      const qId = examRef.current.questions[currentQuestionRef.current]?.id;
      if (qId) {
        const inFlight = Math.floor(
          (Date.now() - questionEnteredAt.current) / 1000,
        );
        return {
          ...timePerQuestion.current,
          [qId]: (timePerQuestion.current[qId] || 0) + inFlight,
        };
      }
    }
    return { ...timePerQuestion.current };
  }, []);

  // ── tab visibility: pause when hidden, resume when visible ────────────────
  useEffect(() => {
    if (!exam) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseCurrentQuestionTimer();
      } else {
        resumeCurrentQuestionTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [exam, pauseCurrentQuestionTimer, resumeCurrentQuestionTimer]);

  // ── start timer for Q1 once exam loads ────────────────────────────────────
  useEffect(() => {
    if (exam && !loading) {
      resumeCurrentQuestionTimer();
    }
  }, [exam, loading, resumeCurrentQuestionTimer]);

  // ─────────────────────────────────────────────────────────────────────────

  const setAnswersWithRef = useCallback(
    (
      updater: (
        prev: Record<string, string | number | null>,
      ) => Record<string, string | number | null>,
    ) => {
      setAnswers((prev) => {
        const next = updater(prev);
        answersRef.current = next;
        return next;
      });
    },
    [],
  );

  const setMarkedWithRef = useCallback(
    (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      setMarkedForReview((prev) => {
        const next = updater(prev);
        markedForReviewRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    examRef.current = exam;
  }, [exam]);

  // ─── Fetch exam data ──────────────────────────────────────────────────────

  useEffect(() => {
    fetchExamData();
  }, [attemptId]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attempts/${attemptId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load exam");
      }
      const data = await res.json();
      setExam(data);
      examRef.current = data;

      if (data.savedAnswers && typeof data.savedAnswers === "object") {
        setAnswers(data.savedAnswers);
        answersRef.current = data.savedAnswers;
        const visitedIds = Object.entries(
          data.savedAnswers as Record<string, any>,
        )
          .filter(([, val]) => val !== null)
          .map(([id]) => id);
        setVisitedQuestions(new Set(visitedIds));
      }

      if (
        data.savedMarkedForReview &&
        typeof data.savedMarkedForReview === "object"
      ) {
        setMarkedForReview(data.savedMarkedForReview);
        markedForReviewRef.current = data.savedMarkedForReview;
      }

      if (data.savedAnswers) {
        const numericalRestored: Record<string, string> = {};
        (data.exam?.questions ?? data.questions ?? []).forEach((q: any) => {
          if (q.type === "numerical") {
            const val = data.savedAnswers[q.id];
            if (val !== null && val !== undefined) {
              numericalRestored[q.id] = String(val);
            }
          }
        });
        if (Object.keys(numericalRestored).length > 0) {
          setNumericalDisplays(numericalRestored);
        }
      }

      const expiresAt = new Date(data.expiresAt).getTime();
      const remaining = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000),
      );
      setTimeRemaining(remaining);
    } catch (error: any) {
      toast.error(error.message || "Failed to load exam");
      router.push("/exams");
    } finally {
      setLoading(false);
    }
  };

  // ─── Countdown timer ──────────────────────────────────────────────────────

  useEffect(() => {
    if (timeRemaining === 0 || !exam) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, exam]);

  // ─── Auto-save every 30 seconds ───────────────────────────────────────────

  useEffect(() => {
    if (!exam) return;
    saveTimerRef.current = setInterval(() => {
      if (!submittedRef.current) saveAnswers();
    }, 30000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [exam]);

  // ─── Security event listeners ─────────────────────────────────────────────

  useEffect(() => {
    if (!exam) return;
    const handleFSChange = () =>
      setIsMaximizeMode(!!document.fullscreenElement);
    const blockCtxMenu = (e: MouseEvent) => e.preventDefault();
    const blockCopy = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener("fullscreenchange", handleFSChange);
    document.addEventListener("contextmenu", blockCtxMenu);
    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
      document.removeEventListener("contextmenu", blockCtxMenu);
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
    };
  }, [exam]);

  // ─── Fullscreen toggle ────────────────────────────────────────────────────

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {}
    } else {
      document.exitFullscreen?.();
    }
  };

  // ─── Core save function ───────────────────────────────────────────────────

  const saveAnswers = useCallback(
    async (
      overrideAnswers?: Record<string, string | number | null>,
      overrideMarked?: Record<string, boolean>,
      isFinalSave: boolean = false,
    ) => {
      const currentExam = examRef.current;
      if (!currentExam || (submittedRef.current && !isFinalSave)) return;

      const currentAnswers = overrideAnswers ?? answersRef.current;
      const currentMarked = overrideMarked ?? markedForReviewRef.current;

      const answersToSave = Object.entries(currentAnswers).map(
        ([questionId, answer]) => {
          const question = currentExam.questions.find(
            (q) => q.id === questionId,
          );
          const isNumerical = question?.type === "numerical";
          return {
            questionId,
            selectedOption: isNumerical ? null : (answer as string | null),
            numericalAnswer: isNumerical ? (answer as number | null) : null,
            markedForReview: currentMarked[questionId] || false,
          };
        },
      );

      const markedOnlyIds = Object.keys(currentMarked).filter(
        (id) => currentMarked[id] && !(id in currentAnswers),
      );
      markedOnlyIds.forEach((questionId) => {
        answersToSave.push({
          questionId,
          selectedOption: null,
          numericalAnswer: null,
          markedForReview: true,
        });
      });

      if (answersToSave.length === 0) return;

      try {
        await fetch(`/api/attempts/${currentExam.attemptId}/save-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: answersToSave,
            timePerQuestion: getTimeSnapshot(), // ✅ NEW: include time snapshot on every save
          }),
        });
      } catch (e) {
        console.error("Save failed:", e);
      }
    },
    [getTimeSnapshot],
  );

  // ─── Answer handlers ──────────────────────────────────────────────────────

  const handleOptionSelect = useCallback(
    (questionId: string, optionKey: string) => {
      setVisitedQuestions((prev) => new Set(prev).add(questionId));
      setAnswersWithRef((prev) => ({
        ...prev,
        [questionId]: prev[questionId] === optionKey ? null : optionKey,
      }));
    },
    [setAnswersWithRef],
  );

  const handleNumericalAnswer = useCallback(
    (questionId: string, display: string, numValue: number | null) => {
      setVisitedQuestions((prev) => new Set(prev).add(questionId));
      setNumericalDisplays((prev) => ({ ...prev, [questionId]: display }));
      setAnswersWithRef((prev) => ({ ...prev, [questionId]: numValue }));
    },
    [setAnswersWithRef],
  );

  const handleClearAnswer = useCallback(() => {
    const qId = exam?.questions[currentQuestion]?.id;
    if (!qId) return;
    setVisitedQuestions((prev) => new Set(prev).add(qId));
    setAnswersWithRef((prev) => ({ ...prev, [qId]: null }));
    setNumericalDisplays((prev) => ({ ...prev, [qId]: "" }));
    setMarkedWithRef((prev) => ({ ...prev, [qId]: false }));
  }, [exam, currentQuestion, setAnswersWithRef, setMarkedWithRef]);

  // ─── Navigation handlers ──────────────────────────────────────────────────

  const handleSaveAndNext = useCallback(() => {
    const qId = exam?.questions[currentQuestion]?.id;
    if (qId) {
      setVisitedQuestions((prev) => new Set(prev).add(qId));
      if (
        answersRef.current[qId] !== null &&
        answersRef.current[qId] !== undefined
      ) {
        setMarkedWithRef((prev) => ({ ...prev, [qId]: false }));
      }
    }

    pauseCurrentQuestionTimer();

    if (currentQuestion < (exam?.totalQuestions || 0) - 1) {
      setCurrentQuestion((prev) => {
        const next = prev + 1;
        currentQuestionRef.current = next;
        resumeCurrentQuestionTimer();
        return next;
      });
    }
  }, [
    exam,
    currentQuestion,
    setMarkedWithRef,
    pauseCurrentQuestionTimer,
    resumeCurrentQuestionTimer,
  ]);

  const handleSaveAndMarkForReview = useCallback(() => {
    const qId = exam?.questions[currentQuestion]?.id;
    if (qId) {
      setVisitedQuestions((prev) => new Set(prev).add(qId));
      setMarkedWithRef((prev) => ({ ...prev, [qId]: true }));
    }
  }, [exam, currentQuestion, setMarkedWithRef]);

  const handleMarkForReviewAndNext = useCallback(() => {
    handleSaveAndMarkForReview();

    pauseCurrentQuestionTimer();

    if (currentQuestion < (exam?.totalQuestions || 0) - 1) {
      setCurrentQuestion((prev) => {
        const next = prev + 1;
        currentQuestionRef.current = next;
        resumeCurrentQuestionTimer();
        return next;
      });
    }
  }, [
    exam,
    currentQuestion,
    handleSaveAndMarkForReview,
    pauseCurrentQuestionTimer,
    resumeCurrentQuestionTimer,
  ]);

  const handlePaletteNavigate = useCallback(
    (index: number) => {
      pauseCurrentQuestionTimer();
      setCurrentQuestion(index);
      currentQuestionRef.current = index;
      resumeCurrentQuestionTimer();
    },
    [pauseCurrentQuestionTimer, resumeCurrentQuestionTimer],
  );

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (!exam) return;
      if (submittedRef.current) return;
      if (!autoSubmit) {
        setShowSubmitConfirm(true);
        return;
      }

      submittedRef.current = true;
      setSubmitting(true);
      setShowSubmitConfirm(false);

      try {
        // ✅ NEW: flush final in-flight time before the last save
        pauseCurrentQuestionTimer();

        await saveAnswers(answersRef.current, markedForReviewRef.current, true);

        const res = await fetch(`/api/attempts/${exam.attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to submit exam");
        }

        if (lockdownRef.current?.allowSubmission)
          lockdownRef.current.allowSubmission();
        if (document.fullscreenElement)
          document.exitFullscreen().catch(() => {});
        setSubmitted(true);
      } catch (error: any) {
        console.error("Submission error:", error);
        submittedRef.current = false;
        setSubmitting(false);
        toast.error(
          error.message || "Failed to submit exam. Please try again.",
        );
      }
    },
    [exam, saveAnswers, pauseCurrentQuestionTimer],
  );

  // ─── BACK button: also needs pause/resume ────────────────────────────────

  const handleBack = useCallback(() => {
    if (currentQuestion === 0) return;
    pauseCurrentQuestionTimer();
    setCurrentQuestion((prev) => {
      const next = prev - 1;
      currentQuestionRef.current = next;
      resumeCurrentQuestionTimer();
      return next;
    });
  }, [currentQuestion, pauseCurrentQuestionTimer, resumeCurrentQuestionTimer]);

  // ─── Derived state ────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const questionStatuses = useMemo(() => {
    if (!exam) return [];
    return exam.questions.map((q) => {
      const savedAns = answers[q.id];
      const isNumerical = q.type === "numerical";
      const hasValidAnswer = isNumerical
        ? savedAns !== null && savedAns !== undefined && savedAns !== ""
        : !!savedAns && q.options.some((opt) => opt.key === savedAns);
      const isMarked = !!markedForReview[q.id];
      const isVisited = visitedQuestions.has(q.id);

      if (hasValidAnswer && isMarked) return "ans_marked";
      if (hasValidAnswer) return "answered";
      if (isMarked) return "marked";
      if (isVisited) return "not_answered";
      return "not_visited";
    });
  }, [exam, answers, markedForReview, visitedQuestions]);

  const stats = useMemo(() => {
    const c = {
      notVisited: 0,
      notAnswered: 0,
      answered: 0,
      marked: 0,
      ansMarked: 0,
    };
    questionStatuses.forEach((s) => {
      if (s === "not_visited") c.notVisited++;
      if (s === "not_answered") c.notAnswered++;
      if (s === "answered") c.answered++;
      if (s === "marked") c.marked++;
      if (s === "ans_marked") c.ansMarked++;
    });
    return c;
  }, [questionStatuses]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (submitted) return <ThankYouScreen attemptId={attemptId} />;

  if (loading)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );

  if (!exam) return null;

  const question = exam.questions[currentQuestion];
  const isNumerical = question.type === "numerical";
  const isMatch = question.type === "match";

  return (
    <ExamLockdown
      ref={lockdownRef}
      attemptId={attemptId}
      onAutoSubmit={() => handleSubmit(true)}
    >
      <div className="fixed inset-0 z-[50] bg-gray-100 flex flex-col w-screen h-screen overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-white border-b shadow-sm shrink-0">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border-2 border-gray-300 rounded flex items-center justify-center bg-gray-50 overflow-hidden">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    Candidate Name:{" "}
                    <span className="font-semibold text-orange-600 uppercase">
                      {session?.user?.name || "Student"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Exam Name:{" "}
                    <span className="font-semibold text-orange-600 uppercase">
                      {exam.examTitle}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                    <span>Remaining Time:</span>
                    <span className="font-bold text-lg px-3 py-0.5 rounded bg-[#00A9E0] text-white">
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFullScreen}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition"
                >
                  {isMaximizeMode ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                  {isMaximizeMode ? "Exit Fullscreen" : "Fullscreen"}
                </button>
                <div className="px-4 py-2 bg-gray-100 rounded text-sm font-medium">
                  English
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Question Area ── */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="px-6 py-4 border-b bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-800">
                  Question No. {currentQuestion + 1}
                </h2>
                {isNumerical && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    Numerical
                  </span>
                )}
                {isMatch && (
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full">
                    Match
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-gray-500 flex gap-4">
                <span>Marks: +{question.marks}</span>
                <span>Negative: -{question.negativeMarks}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <div key={question.id} className="max-w-5xl mx-auto">
                <div className="mb-8">
                  <div className="text-lg leading-relaxed font-medium text-gray-800">
                    <SafeHtml html={question.statement} />
                  </div>
                  {question.imageUrl && (
                    <img
                      key={question.id}
                      src={question.imageUrl}
                      alt="Question"
                      className="max-w-full h-auto rounded-lg mt-4 border shadow-sm"
                    />
                  )}
                </div>
                {isMatch && question.matchPairs && (
                  <MatchTable matchPairs={question.matchPairs} />
                )}
                {/* MCQ Options */}
                {!isNumerical && (
                  <div className="space-y-4">
                    {question.options.map((option) => (
                      <div
                        key={option.key}
                        onClick={() =>
                          handleOptionSelect(question.id, option.key)
                        }
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          answers[question.id] === option.key
                            ? "border-blue-600 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                              answers[question.id] === option.key
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-400 text-gray-500"
                            }`}
                          >
                            {answers[question.id] === option.key && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <div className="text-base text-gray-700 font-medium">
                            <SafeHtml html={option.text} />
                          </div>
                        </div>
                        {option.imageUrl && (
                          <img
                            key={`${question.id}-${option.key}`}
                            src={option.imageUrl}
                            alt={`Option ${option.key}`}
                            className="max-w-full h-auto rounded mt-3 ml-9 border"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Numerical Calculator */}
                {isNumerical && (
                  <NumericalCalculator
                    questionId={question.id}
                    value={numericalDisplays[question.id] || ""}
                    onChange={handleNumericalAnswer}
                  />
                )}
              </div>
            </div>

            {/* ── Action Bar ── */}
            <div className="px-6 py-4 border-t bg-gray-50 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleSaveAndNext}
                    className="px-6 py-2 bg-green-600 text-white rounded shadow-sm font-semibold hover:bg-green-700 transition"
                  >
                    SAVE &amp; NEXT
                  </button>
                  <button
                    onClick={handleClearAnswer}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 shadow-sm rounded font-semibold hover:bg-gray-50 transition"
                  >
                    CLEAR RESPONSE
                  </button>
                  <button
                    onClick={handleSaveAndMarkForReview}
                    className="px-6 py-2 bg-orange-500 text-white rounded shadow-sm font-semibold hover:bg-orange-600 transition"
                  >
                    SAVE &amp; MARK FOR REVIEW
                  </button>
                  <button
                    onClick={handleMarkForReviewAndNext}
                    className="px-6 py-2 bg-blue-600 text-white rounded shadow-sm font-semibold hover:bg-blue-700 transition"
                  >
                    MARK FOR REVIEW &amp; NEXT
                  </button>
                </div>
                <div className="flex gap-2">
                  {/* ✅ UPDATED: BACK now uses handleBack (with timer pause/resume) */}
                  <button
                    onClick={handleBack}
                    disabled={currentQuestion === 0}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300 disabled:opacity-50"
                  >
                    &lt;&lt; BACK
                  </button>
                  <button
                    onClick={handleSaveAndNext}
                    disabled={currentQuestion === exam.totalQuestions - 1}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300 disabled:opacity-50"
                  >
                    NEXT &gt;&gt;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Question Palette Sidebar ── */}
          <div className="w-80 bg-white border-l flex flex-col shrink-0">
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-6 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  Legend
                </h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs text-gray-600 font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-50 border border-gray-300 rounded flex items-center justify-center text-gray-500 font-bold shadow-sm">
                      {stats.notVisited}
                    </div>
                    <span>Not Visited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold shadow-sm">
                      {stats.notAnswered}
                    </div>
                    <span>Not Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 text-white rounded flex items-center justify-center font-bold shadow-sm">
                      {stats.answered}
                    </div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                      {stats.marked}
                    </div>
                    <span>Marked for Review</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center relative font-bold shadow-sm">
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-white">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <span>Ans &amp; Marked for Review (Will be evaluated)</span>
                  </div>
                </div>
              </div>

              <div className="mb-2 font-bold text-gray-700 text-sm">
                Question Palette:
              </div>
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((q, index) => {
                  const status = questionStatuses[index];
                  const isCurrent = index === currentQuestion;
                  let statusClasses = "";
                  let showReviewIndicator = false;
                  switch (status) {
                    case "ans_marked":
                      statusClasses =
                        "bg-purple-600 text-white border-purple-700 rounded-full";
                      showReviewIndicator = true;
                      break;
                    case "answered":
                      statusClasses =
                        "bg-green-500 text-white border-green-600 rounded";
                      break;
                    case "marked":
                      statusClasses =
                        "bg-purple-600 text-white border-purple-700 rounded-full";
                      break;
                    case "not_answered":
                      statusClasses =
                        "bg-red-500 text-white border-red-600 rounded";
                      break;
                    default:
                      statusClasses =
                        "bg-white text-black border-gray-300 rounded hover:bg-gray-50";
                  }
                  return (
                    <button
                      key={q.id}
                      onClick={() => handlePaletteNavigate(index)}
                      className={`w-full aspect-square flex items-center justify-center text-sm font-bold border transition-all shadow-sm relative ${statusClasses} ${isCurrent ? "ring-2 ring-blue-500 ring-offset-2 z-10" : ""}`}
                    >
                      {index + 1}
                      {showReviewIndicator && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-white z-10">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 mt-auto">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded shadow font-bold hover:bg-blue-700 disabled:opacity-50 transition uppercase tracking-wide"
              >
                {submitting ? "Submitting..." : "Submit Test"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Submit Confirm Dialog ── */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
              <h3 className="text-2xl font-bold mb-2 text-gray-800">
                Submit Exam?
              </h3>
              <p className="text-gray-500 mb-6">
                You are about to submit your exam. Please confirm.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.answered + stats.ansMarked}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase">
                      Answered
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">
                      {stats.notAnswered}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase">
                      Not Answered
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.marked}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase">
                      Marked for Review
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Return to Exam
                </button>
                <button
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    handleSubmit(true);
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition shadow-lg shadow-green-600/20"
                >
                  Yes, Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExamLockdown>
  );
}
