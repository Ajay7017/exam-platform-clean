// src/app/(admin)/admin/questions/new/page.tsx

// We use a relative import here to ensure the file is found regardless of alias configuration
import { QuestionForm } from '../../../../../components/admin/QuestionForm'

export default function NewQuestionPage() {
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <QuestionForm />
    </div>
  )
}