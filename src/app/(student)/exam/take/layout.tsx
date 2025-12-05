// src/app/(student)/exam/take/layout.tsx
export default function ExamTakeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="exam-fullscreen-layout">
      {children}
    </div>
  )
}