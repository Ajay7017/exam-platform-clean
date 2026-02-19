'use client'

// src/app/(admin)/admin/questions/import/page.tsx
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertCircle, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Subject { id: string; name: string }
interface Topic { id: string; name: string; subjectId: string }
interface SubTopic { id: string; name: string; topicId: string }

interface PreviewQuestion {
  statement: string
  options: { key: string; text: string }[]
  correctAnswer: string
  marks: number
  negativeMarks: number
  difficulty: string
  explanation?: string
}

export default function QuestionImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')

  // Step 1: Upload
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [subTopics, setSubTopics] = useState<SubTopic[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedSubTopic, setSelectedSubTopic] = useState('')
  const [wordFile, setWordFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Step 2: Preview
  const [importJobId, setImportJobId] = useState('')
  const [subTopicIdForConfirm, setSubTopicIdForConfirm] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewQuestion[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)

  // Step 3: Importing
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<any>(null)

  const wordFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchSubjects() }, [])

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject)
    } else {
      setTopics([])
      setSelectedTopic('')
      setSubTopics([])
      setSelectedSubTopic('')
    }
  }, [selectedSubject])

  useEffect(() => {
    if (selectedTopic) {
      fetchSubTopics(selectedTopic)
    } else {
      setSubTopics([])
      setSelectedSubTopic('')
    }
  }, [selectedTopic])

  useEffect(() => {
    if (step === 'importing' && importJobId) {
      const interval = setInterval(checkImportStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [step, importJobId])

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSubjects(data.filter((s: any) => s.isActive))
    } catch {
      toast.error('Failed to load subjects')
    }
  }

  const fetchTopics = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/admin/topics?subjectId=${subjectId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTopics(data.filter((t: any) => t.isActive))
    } catch {
      toast.error('Failed to load topics')
    }
  }

  const fetchSubTopics = async (topicId: string) => {
    try {
      const res = await fetch(`/api/admin/subtopics?topicId=${topicId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSubTopics(data.filter((s: any) => s.isActive))
    } catch {
      toast.error('Failed to load subtopics')
    }
  }

  const handleParseAndPreview = async () => {
    if (!selectedSubject || !selectedTopic) {
      toast.error('Please select subject and topic')
      return
    }
    if (!wordFile) {
      toast.error('Please upload a Word document')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('wordFile', wordFile)
      formData.append('subjectId', selectedSubject)
      formData.append('topicId', selectedTopic)
      if (selectedSubTopic) formData.append('subTopicId', selectedSubTopic)

      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to parse document')
      }

      const data = await res.json()

      setImportJobId(data.importJobId)
      setSubTopicIdForConfirm(data.subTopicId)
      setPreviewData(data.preview)
      setSummary(data.summary)
      setErrors(data.errors || [])

      if (!data.canProceed) {
        toast.error('Document has critical errors. Please fix and try again.')
        return
      }

      toast.success('Document parsed successfully!')
      setStep('preview')
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse document')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!importJobId) return
    setConfirming(true)
    try {
      const res = await fetch(`/api/admin/questions/import/${importJobId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subTopicId: subTopicIdForConfirm }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start import')
      }
      toast.success('Import started!')
      setStep('importing')
    } catch (error: any) {
      toast.error(error.message || 'Failed to start import')
    } finally {
      setConfirming(false)
    }
  }

  const checkImportStatus = async () => {
    if (!importJobId) return
    try {
      const res = await fetch(`/api/admin/questions/import/${importJobId}`)
      if (!res.ok) return
      const data = await res.json()
      setImportStatus(data)
      setImportProgress(data.progress)

      if (data.status === 'completed') {
        toast.success(`Import completed! ${data.successCount} questions imported.`)
        setTimeout(() => router.push('/admin/questions'), 2000)
      } else if (data.status === 'failed') {
        toast.error('Import failed. Please check errors.')
      }
    } catch {
      console.error('Status check error')
    }
  }

  const handleStartOver = () => {
    setStep('upload')
    setWordFile(null)
    setSelectedSubject('')
    setSelectedTopic('')
    setSelectedSubTopic('')
    setImportJobId('')
    setSubTopicIdForConfirm(null)
    setPreviewData([])
    setSummary(null)
    setErrors([])
    setImportProgress(0)
    setImportStatus(null)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Import Questions</h1>
        <p className="text-gray-600 mt-1">Bulk import questions from Word document</p>
      </div>

      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          {(['upload', 'preview', 'importing'] as const).map((s, idx) => (
            <div key={s} className="flex items-center">
              {idx > 0 && <div className="w-16 h-0.5 bg-gray-300 mr-4" />}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step === s ? 'bg-primary text-white' :
                  (step === 'preview' && s === 'upload') || step === 'importing' && s !== 'importing'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {((step === 'preview' && s === 'upload') || (step === 'importing' && s !== 'importing'))
                    ? <CheckCircle className="w-5 h-5" />
                    : idx + 1}
                </div>
                <span className="ml-2 font-medium capitalize">{s === 'importing' ? 'Import' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg border p-8 max-w-2xl mx-auto">
          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Text-only import</p>
              <p>Images are not required during import. After importing, use the <strong>Edit</strong> button on any question in the Question Bank to add images.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label>Topic *</Label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedSubject ? 'Select topic' : 'Select subject first'} />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SubTopic (optional) */}
            <div className="space-y-2">
              <Label>
                SubTopic <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Select
                value={selectedSubTopic}
                onValueChange={setSelectedSubTopic}
                disabled={!selectedTopic}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedTopic ? 'Select subtopic (optional)' : 'Select topic first'} />
                </SelectTrigger>
                <SelectContent>
                  {subTopics.map(st => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSubTopic && (
                <button
                  type="button"
                  onClick={() => setSelectedSubTopic('')}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear subtopic
                </button>
              )}
            </div>

            {/* Word File */}
            <div className="space-y-2">
              <Label>Word Document (.docx) *</Label>
              <input
                ref={wordFileRef}
                type="file"
                accept=".docx"
                onChange={e => setWordFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => wordFileRef.current?.click()}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {wordFile ? wordFile.name : 'Choose Word file'}
                </Button>
                {wordFile && (
                  <Button type="button" variant="ghost" onClick={() => setWordFile(null)}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Format hint */}
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-700">Expected .docx format per question:</p>
              <pre className="text-xs bg-white border rounded p-2 overflow-x-auto">{`Question text here
A) Option A
B) Option B
C) Option C
D) Option D
ANSWER: A
MARKS: 4
NEGATIVE: 1
DIFFICULTY: easy
EXPLANATION: Optional explanation
---`}</pre>
              <p className="text-xs text-gray-500">Separate questions with <code>---</code> on its own line</p>
            </div>

            <Button
              onClick={handleParseAndPreview}
              disabled={!selectedSubject || !selectedTopic || !wordFile || uploading}
              className="w-full"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Parsing document...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Parse & Preview</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Import Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold">{summary?.totalQuestions}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Subject</p>
                <p className="text-lg font-medium">{summary?.subjectName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Topic</p>
                <p className="text-lg font-medium">{summary?.topicName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">SubTopic</p>
                <p className="text-lg font-medium">{summary?.subTopicName || <span className="text-gray-400 text-base">None</span>}</p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">{errors.length} Warnings/Errors</p>
                    <ul className="mt-2 text-sm text-yellow-800 space-y-1">
                      {errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                      {errors.length > 5 && <li>... and {errors.length - 5} more</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Questions */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Preview (First 10 Questions)</h2>
            <div className="space-y-6">
              {previewData.map((q, idx) => (
                <div key={idx} className="border-b pb-6 last:border-0">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="font-bold text-gray-700 shrink-0">Q{idx + 1}.</span>
                    <p className="text-gray-900">{q.statement}</p>
                  </div>

                  <div className="ml-8 space-y-2">
                    {q.options.map(opt => (
                      <div
                        key={opt.key}
                        className={`flex items-center gap-2 p-2 rounded ${
                          opt.key === q.correctAnswer ? 'bg-green-50 border border-green-200' : ''
                        }`}
                      >
                        <span className="font-medium">{opt.key})</span>
                        <span className="flex-1">{opt.text}</span>
                        {opt.key === q.correctAnswer && <CheckCircle className="w-4 h-4 text-green-600" />}
                      </div>
                    ))}
                  </div>

                  <div className="ml-8 mt-3 flex gap-4 text-sm text-gray-500">
                    <span>Marks: <strong>{q.marks}</strong></span>
                    <span>Negative: <strong>{q.negativeMarks}</strong></span>
                    <span>Difficulty: <strong className="capitalize">{q.difficulty}</strong></span>
                  </div>

                  {q.explanation && (
                    <p className="ml-8 mt-2 text-sm text-gray-500 italic">
                      Explanation: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={handleStartOver}>Start Over</Button>
            <Button onClick={handleConfirmImport} disabled={confirming} size="lg">
              {confirming ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</>
              ) : (
                `Confirm & Import ${summary?.totalQuestions} Questions`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="bg-white rounded-lg border p-8 max-w-2xl mx-auto">
          <div className="text-center space-y-6">
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Importing Questions...</h2>
              <p className="text-gray-600">Please wait while we import your questions</p>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{importProgress}% complete</p>
            </div>

            {importStatus && (
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{importStatus.totalQuestions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Imported</p>
                  <p className="text-2xl font-bold text-green-600">{importStatus.successCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{importStatus.failedCount}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}