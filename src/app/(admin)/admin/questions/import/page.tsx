// src/app/(admin)/admin/questions/import/page.tsx
'use client'

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
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Subject {
  id: string
  name: string
}

interface Topic {
  id: string
  name: string
  subjectId: string
}

interface PreviewQuestion {
  statement: string
  statementImage?: string
  options: {
    key: string
    text: string
    imageUrl?: string
  }[]
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
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [wordFile, setWordFile] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Step 2: Preview
  const [importJobId, setImportJobId] = useState('')
  const [previewData, setPreviewData] = useState<PreviewQuestion[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)

  // Step 3: Importing
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<any>(null)

  const wordFileRef = useRef<HTMLInputElement>(null)
  const csvFileRef = useRef<HTMLInputElement>(null)

  // Fetch subjects
  useEffect(() => {
    fetchSubjects()
  }, [])

  // Fetch topics when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject)
    } else {
      setTopics([])
      setSelectedTopic('')
    }
  }, [selectedSubject])

  // Poll import status
  useEffect(() => {
    if (step === 'importing' && importJobId) {
      const interval = setInterval(async () => {
        await checkImportStatus()
      }, 2000) // Check every 2 seconds

      return () => clearInterval(interval)
    }
  }, [step, importJobId])

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/admin/subjects')
      if (!response.ok) throw new Error('Failed to fetch subjects')
      const data = await response.json()
      setSubjects(data.filter((s: Subject & { isActive: boolean }) => s.isActive))
    } catch (error) {
      console.error('Error fetching subjects:', error)
      toast.error('Failed to load subjects')
    }
  }

  const fetchTopics = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/admin/topics?subjectId=${subjectId}`)
      if (!response.ok) throw new Error('Failed to fetch topics')
      const data = await response.json()
      setTopics(data.filter((t: Topic & { isActive: boolean }) => t.isActive))
    } catch (error) {
      console.error('Error fetching topics:', error)
      toast.error('Failed to load topics')
    }
  }

  const handleParseAndPreview = async () => {
    if (!selectedSubject || !selectedTopic) {
      toast.error('Please select subject and topic')
      return
    }

    if (!wordFile || !csvFile) {
      toast.error('Please upload both Word document and CSV file')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('wordFile', wordFile)
      formData.append('csvFile', csvFile)
      formData.append('subjectId', selectedSubject)
      formData.append('topicId', selectedTopic)

      const response = await fetch('/api/admin/questions/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to parse document')
      }

      const data = await response.json()

      setImportJobId(data.importJobId)
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
      console.error('Parse error:', error)
      toast.error(error.message || 'Failed to parse document')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!importJobId) return

    setConfirming(true)

    try {
      const response = await fetch(
        `/api/admin/questions/import/${importJobId}/confirm`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start import')
      }

      toast.success('Import started! Processing in background...')
      setStep('importing')
    } catch (error: any) {
      console.error('Confirm error:', error)
      toast.error(error.message || 'Failed to start import')
    } finally {
      setConfirming(false)
    }
  }

  const checkImportStatus = async () => {
    if (!importJobId) return

    try {
      const response = await fetch(
        `/api/admin/questions/import/${importJobId}`
      )
      if (!response.ok) throw new Error('Failed to fetch status')

      const data = await response.json()
      setImportStatus(data)
      setImportProgress(data.progress)

      if (data.status === 'completed') {
        toast.success(
          `Import completed! ${data.successCount} questions imported successfully.`
        )
        setTimeout(() => {
          router.push('/admin/questions')
        }, 2000)
      } else if (data.status === 'failed') {
        toast.error('Import failed. Please check errors.')
      }
    } catch (error) {
      console.error('Status check error:', error)
    }
  }

  const handleStartOver = () => {
    setStep('upload')
    setWordFile(null)
    setCsvFile(null)
    setSelectedSubject('')
    setSelectedTopic('')
    setImportJobId('')
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
        <p className="text-gray-600 mt-1">
          Bulk import questions from Word document
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 'upload'
                  ? 'bg-primary text-white'
                  : 'bg-green-500 text-white'
              }`}
            >
              {step === 'upload' ? '1' : <CheckCircle className="w-6 h-6" />}
            </div>
            <span className="ml-2 font-medium">Upload</span>
          </div>

          <div className="w-16 h-0.5 bg-gray-300" />

          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 'preview'
                  ? 'bg-primary text-white'
                  : step === 'importing'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {step === 'importing' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                '2'
              )}
            </div>
            <span className="ml-2 font-medium">Preview</span>
          </div>

          <div className="w-16 h-0.5 bg-gray-300" />

          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 'importing'
                  ? 'bg-primary text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              3
            </div>
            <span className="ml-2 font-medium">Import</span>
          </div>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg border p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            {/* Subject Selection */}
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic Selection */}
            <div className="space-y-2">
              <Label>Topic *</Label>
              <Select
                value={selectedTopic}
                onValueChange={setSelectedTopic}
                disabled={!selectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Word File Upload */}
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
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setWordFile(null)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* CSV File Upload */}
            <div className="space-y-2">
              <Label>Image Mapping CSV *</Label>
              <input
                ref={csvFileRef}
                type="file"
                accept=".csv"
                onChange={e => setCsvFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => csvFileRef.current?.click()}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {csvFile ? csvFile.name : 'Choose CSV file'}
                </Button>
                {csvFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCsvFile(null)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload the CSV file from Image Upload page
              </p>
            </div>

            {/* Parse Button */}
            <Button
              onClick={handleParseAndPreview}
              disabled={
                !selectedSubject ||
                !selectedTopic ||
                !wordFile ||
                !csvFile ||
                uploading
              }
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing document...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Parse & Preview
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview - Will add in next artifact */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Summary Card */}
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
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {errors.length}
                </p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">
                      {errors.length} Warnings/Errors
                    </p>
                    <ul className="mt-2 text-sm text-yellow-800 space-y-1">
                      {errors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                      {errors.length > 5 && (
                        <li>... and {errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Questions */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">
              Preview (First 10 Questions)
            </h2>
            <div className="space-y-6">
              {previewData.map((q, idx) => (
                <div key={idx} className="border-b pb-6 last:border-0">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="font-bold text-gray-700">Q{idx + 1}.</span>
                    <div className="flex-1">
                      <p className="text-gray-900">{q.statement}</p>
                      {q.statementImage && (
                        <img
                          src={q.statementImage}
                          alt="Question diagram"
                          className="mt-2 max-w-md rounded border"
                        />
                      )}
                    </div>
                  </div>

                  <div className="ml-8 space-y-2">
                    {q.options.map(opt => (
                      <div
                        key={opt.key}
                        className={`flex items-start gap-2 p-2 rounded ${
                          opt.key === q.correctAnswer
                            ? 'bg-green-50 border border-green-200'
                            : ''
                        }`}
                      >
                        <span className="font-medium">{opt.key})</span>
                        <span className="flex-1">{opt.text}</span>
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt="Option"
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        {opt.key === q.correctAnswer && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="ml-8 mt-3 flex gap-4 text-sm text-gray-600">
                    <span>Marks: {q.marks}</span>
                    <span>Negative: {q.negativeMarks}</span>
                    <span className="capitalize">
                      Difficulty: {q.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={handleStartOver}>
              Start Over
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={confirming}
              size="lg"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                `Confirm & Import ${summary?.totalQuestions} Questions`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing - Progress */}
      {step === 'importing' && (
        <div className="bg-white rounded-lg border p-8 max-w-2xl mx-auto">
          <div className="text-center space-y-6">
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Importing Questions...
              </h2>
              <p className="text-gray-600">
                Please wait while we import your questions
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{importProgress}% complete</p>
            </div>

            {/* Status */}
            {importStatus && (
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">
                    {importStatus.totalQuestions}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Imported</p>
                  <p className="text-2xl font-bold text-green-600">
                    {importStatus.successCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {importStatus.failedCount}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}