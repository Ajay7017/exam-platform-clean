// src/app/(admin)/admin/exams/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SafeHtml } from "@/lib/utils/safe-html";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  FileQuestion,
  Users,
  Edit,
  Loader2,
  CheckCircle2,
  Download,
} from "lucide-react";

interface Option {
  key: string;
  text: string;
  imageUrl?: string;
  isCorrect: boolean;
}

interface MatchPairs {
  leftColumn: { header: string; items: string[] };
  rightColumn: { header: string; items: string[] };
}

interface Question {
  id: string;
  statement: string;
  imageUrl?: string;
  questionType?: string;
  topic: {
    id: string;
    name: string;
    slug: string;
  };
  marks: number;
  negativeMarks: number;
  difficulty: string;
  explanation?: string;
  sequence: number;
  options: Option[];
  matchPairs?: MatchPairs | null; // ✅ added
}

interface ExamDetails {
  id: string;
  title: string;
  slug: string;
  subject?: {
    id: string;
    name: string;
    slug: string;
  };
  duration: number;
  totalMarks: number;
  price: number;
  isFree: boolean;
  difficulty: string;
  thumbnail?: string;
  instructions?: string;
  randomizeOrder: boolean;
  allowReview: boolean;
  isPublished: boolean;
  totalAttempts: number;
  totalPurchases: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

// ✅ renders Column I / Column II for match type questions
const LEFT_LABELS = ["A", "B", "C", "D", "E", "F"];
const RIGHT_LABELS = ["i", "ii", "iii", "iv", "v", "vi"];

function MatchTable({ matchPairs }: { matchPairs: MatchPairs }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 my-3">
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

export default function AdminExamViewPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    fetchExamDetails();
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/exams/${examId}`);
      if (!response.ok) throw new Error("Failed to fetch exam details");
      const data = await response.json();
      setExam(data);
    } catch (error) {
      console.error("Failed to fetch exam:", error);
      toast.error("Failed to load exam details");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const downloadExamPDF = () => {
    if (!exam) return;
    setPdfGenerating(true);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download PDF");
      setPdfGenerating(false);
      return;
    }

    const questionsHtml = exam.questions
      .map((q, index) => {
        const optionsHtml = q.options
          .map((opt) => {
            const isCorrect = opt.isCorrect;
            const border = isCorrect
              ? "2px solid #10b981"
              : "1px solid #e5e7eb";
            const bg = isCorrect ? "#ecfdf5" : "#f9fafb";
            const color = isCorrect ? "#059669" : "#374151";
            const weight = isCorrect ? "600" : "400";

            return `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:${border};background:${bg};margin-bottom:8px;">
            <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:white;border:2px solid #d1d5db;flex-shrink:0;">
              <span style="font-size:12px;font-weight:700;color:#374151;">${opt.key}</span>
            </div>
            <div style="flex:1;">
              <span style="font-size:13px;color:${color};font-weight:${weight};">${opt.text || ""}</span>
              ${opt.imageUrl ? `<div style="margin-top:6px;"><img src="${opt.imageUrl}" style="max-width:200px;border-radius:6px;border:1px solid #e5e7eb;" /></div>` : ""}
            </div>
            ${isCorrect ? `<span style="color:#10b981;font-size:16px;flex-shrink:0;">✓</span>` : ""}
          </div>`;
          })
          .join("");

        const explanationHtml = q.explanation
          ? `
        <div style="margin-top:12px;padding:10px 14px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe;">
          <div style="font-size:11px;font-weight:700;color:#1d4ed8;margin-bottom:4px;">Explanation</div>
          <div style="font-size:12px;color:#1d4ed8;">${q.explanation}</div>
        </div>`
          : "";

        const imageHtml = q.imageUrl
          ? `
        <div style="margin:10px 0;">
          <img src="${q.imageUrl}" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid #e5e7eb;" />
        </div>`
          : "";

        const diffColor =
          q.difficulty === "easy"
            ? "#16a34a"
            : q.difficulty === "medium"
              ? "#d97706"
              : "#dc2626";
        const diffBg =
          q.difficulty === "easy"
            ? "#f0fdf4"
            : q.difficulty === "medium"
              ? "#fffbeb"
              : "#fef2f2";

        return `
        <div style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:18px;overflow:hidden;page-break-inside:avoid;">
          <!-- Question Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #f1f5f9;gap:8px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:13px;font-weight:700;color:#374151;background:#e5e7eb;padding:3px 10px;border-radius:6px;">Q${index + 1}</span>
              <span style="font-size:11px;color:#6b7280;background:#f1f5f9;padding:3px 8px;border-radius:6px;border:1px solid #e5e7eb;">${q.topic?.name || ""}</span>
              <span style="font-size:11px;font-weight:600;color:${diffColor};background:${diffBg};padding:3px 8px;border-radius:6px;">${q.difficulty}</span>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <span style="font-size:12px;color:#6b7280;">Marks: </span>
              <span style="font-size:13px;font-weight:700;color:#16a34a;">+${q.marks}</span>
              ${q.negativeMarks > 0 ? `<span style="font-size:12px;font-weight:600;color:#dc2626;margin-left:6px;">-${q.negativeMarks}</span>` : ""}
            </div>
          </div>
          <!-- Question Body -->
          <div style="padding:14px;">
            <div style="font-size:14px;color:#111827;line-height:1.7;margin-bottom:12px;">${q.statement || ""}</div>
            ${imageHtml}
            <div>${optionsHtml}</div>
            ${explanationHtml}
          </div>
        </div>`;
      })
      .join("");

    const difficultyBadgeColor =
      exam.difficulty === "easy"
        ? "#16a34a"
        : exam.difficulty === "medium"
          ? "#d97706"
          : "#dc2626";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${exam.title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; color: #111827; }
          @media print {
            @page { margin: 12mm 14mm; size: A4; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>

        <!-- Header Banner -->
        <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca,#6366f1);color:white;padding:24px 28px;margin-bottom:24px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div>
              <h1 style="font-size:22px;font-weight:800;margin-bottom:6px;">${exam.title}</h1>
              <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#c7d2fe;">
                <span>📚 ${exam.subject?.name || "Multi-Subject"}</span>
                <span>❓ ${exam.questions.length} Questions</span>
                <span>⏱ ${exam.duration} minutes</span>
                <span>🏆 ${exam.totalMarks} marks</span>
                <span style="text-transform:capitalize;color:${difficultyBadgeColor === "#16a34a" ? "#86efac" : difficultyBadgeColor === "#d97706" ? "#fcd34d" : "#fca5a5"};">● ${exam.difficulty}</span>
                <span>${exam.isPublished ? "✅ Published" : "📝 Draft"}</span>
                <span>${exam.isFree ? "🆓 Free" : `💰 ₹${(exam.price / 100).toFixed(0)}`}</span>
              </div>
            </div>
            <div style="font-size:11px;color:#a5b4fc;text-align:right;">
              <div>Downloaded: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div style="margin-top:4px;">Randomize: ${exam.randomizeOrder ? "Yes" : "No"} &nbsp;|&nbsp; Review: ${exam.allowReview ? "Yes" : "No"}</div>
            </div>
          </div>
        </div>

        ${
          exam.instructions
            ? `
        <div style="margin:0 24px 20px;padding:14px 16px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;">
          <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:6px;">📋 Instructions</div>
          <div style="font-size:12px;color:#78350f;white-space:pre-wrap;">${exam.instructions}</div>
        </div>`
            : ""
        }

        <!-- Stats Row -->
        <div style="display:flex;gap:12px;margin:0 24px 20px;flex-wrap:wrap;">
          ${[
            {
              label: "Total Questions",
              value: exam.questions.length,
              color: "#6366f1",
            },
            { label: "Total Marks", value: exam.totalMarks, color: "#10b981" },
            {
              label: "Duration",
              value: `${exam.duration} min`,
              color: "#f59e0b",
            },
            { label: "Attempts", value: exam.totalAttempts, color: "#3b82f6" },
          ]
            .map(
              (s) => `
            <div style="flex:1;min-width:100px;padding:12px 14px;border-radius:10px;border:1px solid #e5e7eb;text-align:center;">
              <div style="font-size:20px;font-weight:800;color:${s.color};">${s.value}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">${s.label}</div>
            </div>`,
            )
            .join("")}
        </div>

        <!-- Questions -->
        <div style="padding:0 24px 24px;">
          <div style="font-size:15px;font-weight:700;color:#374151;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">
            Questions (${exam.questions.length})
          </div>
          ${questionsHtml}
        </div>

        <!-- Footer -->
        <div style="text-align:center;padding:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
          ${exam.title} &nbsp;•&nbsp; Generated by Mockzy Admin &nbsp;•&nbsp; ${new Date().toLocaleDateString("en-IN")}
        </div>

        <!-- Print Button -->
        <button class="no-print" onclick="window.print()"
          style="position:fixed;bottom:24px;right:24px;background:#4f46e5;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(79,70,229,0.4);z-index:1000;">
          🖨️ Save as PDF
        </button>

        <script>
          window.onload = () => setTimeout(() => window.print(), 800)
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    setPdfGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileQuestion className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg font-medium">Exam not found</p>
            <Button
              onClick={() => router.push("/admin/exams")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Exams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/admin/exams")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">
              {exam.subject?.name || "Multi-Subject"} • {exam.questions.length}{" "}
              Questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={downloadExamPDF}
            disabled={pdfGenerating}
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            {pdfGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
          <Button onClick={() => router.push(`/admin/exams/${examId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Exam
          </Button>
        </div>
      </div>

      {/* Exam Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Status</p>
            <Badge
              variant={exam.isPublished ? "default" : "secondary"}
              className="mt-2"
            >
              {exam.isPublished ? "Published" : "Draft"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {exam.duration}min
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Marks</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {exam.totalMarks}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Attempts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
              <Users className="h-5 w-5" />
              {exam.totalAttempts}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exam Details */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Difficulty</p>
              <Badge className={`mt-1 ${getDifficultyColor(exam.difficulty)}`}>
                {exam.difficulty}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Price</p>
              <p className="text-lg font-semibold mt-1">
                {exam.isFree ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  `₹${(exam.price / 100).toFixed(2)}`
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Randomize Order
              </p>
              <p className="mt-1">{exam.randomizeOrder ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Allow Review</p>
              <p className="mt-1">{exam.allowReview ? "Yes" : "No"}</p>
            </div>
          </div>
          {exam.instructions && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Instructions
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {exam.instructions}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({exam.questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {exam.questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-6 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded">
                        Q{index + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {question.topic.name}
                      </Badge>
                      <Badge
                        className={`text-xs ${getDifficultyColor(question.difficulty)}`}
                      >
                        {question.difficulty}
                      </Badge>
                    </div>
                    <p className="text-base text-gray-900 leading-relaxed">
                      <SafeHtml html={question.statement} />
                    </p>
                    {question.imageUrl && (
                      <img
                        src={question.imageUrl}
                        alt="Question"
                        className="mt-3 rounded-lg max-w-md"
                      />
                    )}
                    {/* ✅ Match table */}
                    {question.questionType === "match" &&
                      question.matchPairs && (
                        <MatchTable matchPairs={question.matchPairs} />
                      )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-600">Marks</p>
                    <p className="text-lg font-semibold text-green-600">
                      +{question.marks}
                    </p>
                    {question.negativeMarks > 0 && (
                      <p className="text-sm text-red-600">
                        -{question.negativeMarks}
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-3 md:grid-cols-2">
                  {question.options.map((option) => (
                    <div
                      key={option.key}
                      className={`p-4 rounded-lg border-2 ${option.isCorrect ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex-shrink-0">
                          <span className="text-sm font-semibold">
                            {option.key}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            <SafeHtml html={option.text} />
                          </p>
                          {option.imageUrl && (
                            <img
                              src={option.imageUrl}
                              alt={`Option ${option.key}`}
                              className="mt-2 rounded max-w-xs"
                            />
                          )}
                        </div>
                        {option.isCorrect && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {question.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                      Explanation:
                    </p>
                    <p className="text-sm text-blue-800">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
