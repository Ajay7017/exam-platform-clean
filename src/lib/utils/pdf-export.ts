// src/lib/utils/pdf-export.ts
//
// Client-side PDF generation for the Question Bank export feature.
//
// Architecture:
//   1. Fetch full question data from /api/admin/questions/export
//   2. Build a self-contained HTML string (KaTeX CSS inlined, all math rendered)
//   3. Open the HTML in a hidden iframe (not a div) so <head>/<link> tags work
//   4. Use html2canvas to capture the iframe's document body → jsPDF download
//
// Why iframe instead of div?
//   - Setting innerHTML on a div strips <html>/<head>/<body> tags, so <link>
//     stylesheets (KaTeX CSS) never load → blank/unstyled PDF.
//   - An iframe is a real document context: <link>, <style>, fonts all load
//     correctly before we capture.

import katex from 'katex'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportOption {
  key: string
  text: string
  isCorrect: boolean
}

interface MatchPairs {
  leftColumn: { header: string; items: string[] }
  rightColumn: { header: string; items: string[] }
}

interface ExportQuestion {
  id: string
  statement: string
  questionType: 'mcq' | 'numerical' | 'match'
  subjectName: string
  topicName: string
  subTopicName: string | null
  difficulty: string
  marks: number
  negativeMarks: number
  options: ExportOption[]
  correctAnswer: string | null
  correctAnswerExact: number | null
  correctAnswerMin: number | null
  correctAnswerMax: number | null
  matchPairs: MatchPairs | null
  explanation: string | null
}

// ─── Math processing ──────────────────────────────────────────────────────────

function processMathNodes(html: string): string {
  if (!html) return ''
  return html.replace(
    /<math-node([^>]*)><\/math-node>/g,
    (_, attrs) => {
      const latexMatch = attrs.match(/latex="([^"]*)"/)
      const displayMatch = attrs.match(/display="([^"]*)"/)
      const latex = latexMatch ? decodeURIComponent(latexMatch[1]) : ''
      const isDisplay = displayMatch ? displayMatch[1] === 'true' : false
      if (!latex) return ''
      try {
        const rendered = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: isDisplay,
          output: 'html',
        })
        return isDisplay
          ? `<div style="text-align:center;margin:6px 0;overflow-x:auto;">${rendered}</div>`
          : `<span style="display:inline-block;vertical-align:middle;">${rendered}</span>`
      } catch {
        return `<span style="color:red;">[math: ${latex}]</span>`
      }
    }
  )
}

function fixImageSrcs(html: string): string {
  return html.replace(
    /<img([^>]*)\sstyle="([^"]*)"([^>]*)>/g,
    (_, before, style, after) => {
      const newStyle = style
        .replace(/width:\s*\d+px/g, 'max-width:100%')
        .replace(/max-width:\s*100%\s*;?/g, '')
      return `<img${before} style="max-width:100%;height:auto;${newStyle}"${after}>`
    }
  )
}

function processHtml(html: string): string {
  if (!html) return ''
  return fixImageSrcs(processMathNodes(html))
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function difficultyStyle(d: string): string {
  switch (d) {
    case 'easy':   return 'background:#dcfce7;color:#166534;'
    case 'medium': return 'background:#fef9c3;color:#854d0e;'
    case 'hard':   return 'background:#fee2e2;color:#991b1b;'
    default:       return 'background:#f3f4f6;color:#374151;'
  }
}

function typeBadgeStyle(type: string): string {
  switch (type) {
    case 'numerical': return 'background:#dbeafe;color:#1e40af;'
    case 'match':     return 'background:#ede9fe;color:#5b21b6;'
    default:          return 'background:#f3e8ff;color:#6b21a8;'
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'numerical': return '# Numerical'
    case 'match':     return 'Match'
    default:          return 'MCQ'
  }
}

const LEFT_LABELS  = ['A', 'B', 'C', 'D', 'E', 'F']
const RIGHT_LABELS = ['i', 'ii', 'iii', 'iv', 'v', 'vi']

// ─── Build HTML for one question ──────────────────────────────────────────────

function buildQuestionHtml(q: ExportQuestion, index: number): string {
  const meta = `
    <span style="font-size:10px;padding:2px 7px;border-radius:12px;font-weight:600;margin-right:5px;${typeBadgeStyle(q.questionType)}">
      ${typeLabel(q.questionType)}
    </span>
    <span style="font-size:10px;padding:2px 7px;border-radius:12px;font-weight:600;margin-right:5px;${difficultyStyle(q.difficulty)}">
      ${q.difficulty}
    </span>
    <span style="font-size:10px;color:#6b7280;margin-right:5px;">
      ${q.subjectName} &rsaquo; ${q.topicName}${q.subTopicName ? ' &rsaquo; ' + q.subTopicName : ''}
    </span>
    <span style="font-size:10px;color:#059669;font-weight:600;">+${q.marks}</span>
    <span style="font-size:10px;color:#dc2626;font-weight:600;margin-left:3px;">-${q.negativeMarks}</span>
  `

  const statement = `
    <div style="margin-bottom:10px;">
      <span style="font-weight:700;font-size:14px;color:#1f2937;">Q${index + 1}.&nbsp;</span>
      <span style="font-size:13px;color:#111827;line-height:1.6;">${processHtml(q.statement)}</span>
    </div>
  `

  // MCQ options
  let optionsHtml = ''
  if (q.questionType === 'mcq') {
    optionsHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">'
    for (const opt of q.options) {
      const bg     = opt.isCorrect ? '#f0fdf4' : '#f9fafb'
      const border = opt.isCorrect ? '1.5px solid #22c55e' : '1px solid #e5e7eb'
      const keyClr = opt.isCorrect ? '#16a34a' : '#374151'
      optionsHtml += `
        <div style="padding:7px 10px;border-radius:7px;border:${border};background:${bg};display:flex;align-items:flex-start;gap:8px;">
          <span style="font-weight:700;font-size:12px;color:${keyClr};min-width:16px;padding-top:1px;">
            ${opt.key}.${opt.isCorrect ? ' \u2713' : ''}
          </span>
          <span style="font-size:12px;color:#1f2937;line-height:1.5;flex:1;">${processHtml(opt.text)}</span>
        </div>
      `
    }
    optionsHtml += '</div>'
  }

  // Numerical answer
  let numericalHtml = ''
  if (q.questionType === 'numerical') {
    numericalHtml = `
      <div style="margin-bottom:10px;padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:7px;display:inline-block;">
        <span style="font-size:11px;color:#1d4ed8;font-weight:600;display:block;margin-bottom:2px;">Correct Answer</span>
    `
    if (q.correctAnswerExact !== null && q.correctAnswerExact !== undefined) {
      numericalHtml += `<span style="font-size:18px;font-weight:700;color:#1e40af;">${q.correctAnswerExact}</span>`
    } else if (q.correctAnswerMin !== null && q.correctAnswerMax !== null) {
      numericalHtml += `<span style="font-size:15px;font-weight:700;color:#1e40af;">${q.correctAnswerMin} to ${q.correctAnswerMax}</span>`
    }
    numericalHtml += `</div>`
  }

  // Match question
  let matchHtml = ''
  if (q.questionType === 'match' && q.matchPairs) {
    const { leftColumn, rightColumn } = q.matchPairs
    matchHtml += `
      <div style="margin-bottom:10px;border:1px solid #ddd6fe;border-radius:7px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#ede9fe;">
              <th style="padding:7px 10px;text-align:left;font-weight:600;color:#5b21b6;width:50%;border-right:1px solid #ddd6fe;">${leftColumn.header}</th>
              <th style="padding:7px 10px;text-align:left;font-weight:600;color:#5b21b6;width:50%;">${rightColumn.header}</th>
            </tr>
          </thead>
          <tbody>
    `
    for (let i = 0; i < leftColumn.items.length; i++) {
      const rowBg = i % 2 === 0 ? '#faf5ff' : '#ffffff'
      matchHtml += `
        <tr style="background:${rowBg};border-top:1px solid #ede9fe;">
          <td style="padding:7px 10px;border-right:1px solid #ede9fe;vertical-align:top;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#ddd6fe;color:#5b21b6;font-size:10px;font-weight:700;margin-right:6px;">${LEFT_LABELS[i] ?? i + 1}</span>
            <span style="font-size:12px;color:#1f2937;">${processHtml(leftColumn.items[i])}</span>
          </td>
          <td style="padding:7px 10px;vertical-align:top;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#f3f4f6;color:#374151;font-size:10px;font-weight:700;margin-right:6px;">${RIGHT_LABELS[i] ?? i + 1}</span>
            <span style="font-size:12px;color:#1f2937;">${processHtml(rightColumn.items[i])}</span>
          </td>
        </tr>
      `
    }
    matchHtml += `</tbody></table></div>`
    matchHtml += `
      <div style="margin-bottom:6px;">
        <span style="font-size:11px;font-weight:600;color:#78350f;display:block;margin-bottom:5px;">Answer Combinations</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
    `
    for (const opt of q.options) {
      const bg    = opt.isCorrect ? '#f0fdf4' : '#fffbeb'
      const border = opt.isCorrect ? '1.5px solid #22c55e' : '1px solid #fde68a'
      const keyClr = opt.isCorrect ? '#16a34a' : '#92400e'
      matchHtml += `
        <div style="padding:5px 9px;border-radius:6px;border:${border};background:${bg};display:flex;align-items:center;gap:6px;">
          <span style="font-weight:700;font-size:12px;color:${keyClr};">${opt.key}.${opt.isCorrect ? ' \u2713' : ''}</span>
          <span style="font-size:12px;color:#1f2937;">${opt.text}</span>
        </div>
      `
    }
    matchHtml += `</div></div>`
  }

  // Explanation
  let explanationHtml = ''
  if (q.explanation && q.explanation.trim() && q.explanation.trim() !== '<p></p>') {
    explanationHtml = `
      <div style="margin-top:8px;padding:8px 12px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:0 6px 6px 0;">
        <span style="font-size:11px;font-weight:600;color:#1d4ed8;display:block;margin-bottom:3px;">Explanation</span>
        <div style="font-size:12px;color:#1e40af;line-height:1.6;">${processHtml(q.explanation)}</div>
      </div>
    `
  }

  return `
    <div style="margin-bottom:16px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#ffffff;page-break-inside:avoid;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="margin-bottom:8px;display:flex;flex-wrap:wrap;align-items:center;gap:3px;">${meta}</div>
      ${statement}
      ${optionsHtml}
      ${numericalHtml}
      ${matchHtml}
      ${explanationHtml}
    </div>
  `
}

// ─── Build full self-contained HTML document ──────────────────────────────────

function buildDocumentHtml(questions: ExportQuestion[], katexCssUrl: string): string {
  const questionBlocks = questions.map((q, i) => buildQuestionHtml(q, i)).join('\n')
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="${katexCssUrl}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      padding: 32px 36px;
      font-size: 13px;
      line-height: 1.5;
      width: 794px;
    }
    .katex { font-size: 1em !important; }
    .katex-display { margin: 6px 0 !important; }
    img { max-width: 100% !important; height: auto !important; border-radius: 4px; display: inline-block; vertical-align: middle; }
    table { border-collapse: collapse; }
    p { margin-bottom: 4px; }
    ul, ol { padding-left: 18px; margin-bottom: 4px; }
    strong { font-weight: 700; }
    em { font-style: italic; }
  </style>
</head>
<body>
  <div style="margin-bottom:24px;padding-bottom:14px;border-bottom:2px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <h1 style="font-size:20px;font-weight:800;color:#111827;margin-bottom:3px;">Question Bank Export</h1>
      <p style="font-size:12px;color:#6b7280;">${questions.length} question${questions.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; Generated on ${now}</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#9ca3af;">Admin Export &middot; Confidential</div>
  </div>
  ${questionBlocks}
  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
    End of export &middot; ${questions.length} question${questions.length !== 1 ? 's' : ''}
  </div>
</body>
</html>`
}

// ─── Render HTML in a hidden iframe and return its document.body ──────────────
// This is the critical fix: an iframe is a real document context, so <link>
// stylesheets and <style> blocks load correctly. A plain div does not.

function renderInIframe(html: string): Promise<{ iframe: HTMLIFrameElement; body: HTMLElement }> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = `
      position: absolute;
      top: 0;
      left: -9999px;
      width: 794px;
      height: 1px;
      border: none;
      opacity: 0;
      pointer-events: none;
    `
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      reject(new Error('Could not access iframe document'))
      return
    }

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()

    // Wait for iframe load (stylesheets etc.)
    const onLoad = () => {
      const body = iframeDoc.body
      if (!body) {
        document.body.removeChild(iframe)
        reject(new Error('iframe body is null'))
        return
      }
      // Expand iframe to full content height so html2canvas captures everything
      iframe.style.height = body.scrollHeight + 'px'
      resolve({ iframe, body })
    }

    if (iframe.contentWindow?.document.readyState === 'complete') {
      // Small delay to ensure stylesheets have painted
      setTimeout(onLoad, 300)
    } else {
      iframe.onload = () => setTimeout(onLoad, 300)
    }

    // Safety timeout
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        onLoad()
      }
    }, 5000)
  })
}

// ─── Wait for all images in an element ───────────────────────────────────────

function waitForImages(el: HTMLElement): Promise<void> {
  const images = Array.from(el.querySelectorAll('img'))
  if (!images.length) return Promise.resolve()
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) { resolve(); return }
          img.onload  = () => resolve()
          img.onerror = () => resolve()
          setTimeout(resolve, 8000)
        })
    )
  ).then(() => undefined)
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportQuestionsToPdf(
  selectedIds: string[],
  onProgress?: (status: string) => void
): Promise<void> {
  // 1. Fetch question data
  onProgress?.('Fetching question data…')
  const res = await fetch('/api/admin/questions/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: selectedIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch questions for export')
  }
  const { questions }: { questions: ExportQuestion[] } = await res.json()
  if (!questions.length) throw new Error('No questions returned for export')

  // 2. Resolve KaTeX CSS URL
  const katexCssUrl = (() => {
    const sheets = Array.from(document.styleSheets)
    for (const sheet of sheets) {
      try { if (sheet.href?.includes('katex')) return sheet.href } catch { /* cross-origin */ }
    }
    return 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
  })()

  // 3. Build HTML
  onProgress?.('Rendering questions…')
  const htmlContent = buildDocumentHtml(questions, katexCssUrl)

  // 4. Render in iframe (real document context — stylesheets load correctly)
  onProgress?.('Loading PDF engine…')
  const { iframe, body: iframeBody } = await renderInIframe(htmlContent)

  try {
    // 5. Wait for images inside the iframe
    onProgress?.('Waiting for images…')
    await waitForImages(iframeBody)

    // 6. Dynamically import html2canvas and jsPDF (avoid SSR)
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const html2canvas = html2canvasModule.default
    const { jsPDF } = jsPDFModule

    onProgress?.('Generating PDF…')

    // 7. Capture the iframe body with html2canvas
    const canvas = await html2canvas(iframeBody, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      // Tell html2canvas the full scroll height
      windowWidth: 794,
      windowHeight: iframeBody.scrollHeight,
    })

    // 8. Convert canvas → multi-page PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    const pageWidth  = pdf.internal.pageSize.getWidth()   // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight()  // 297mm
    const margin     = 10 // mm

    const contentWidth  = pageWidth - margin * 2
    // Scale: canvas px → mm
    const pxToMm = contentWidth / canvas.width
    const totalHeightMm = canvas.height * pxToMm

    let yOffset = 0 // mm already printed
    let firstPage = true

    while (yOffset < totalHeightMm) {
      if (!firstPage) pdf.addPage()
      firstPage = false

      const sliceHeightMm = pageHeight - margin * 2
      const sliceHeightPx = sliceHeightMm / pxToMm

      // Crop a horizontal slice of the canvas
      const sliceCanvas  = document.createElement('canvas')
      sliceCanvas.width  = canvas.width
      sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - yOffset / pxToMm)
      const ctx = sliceCanvas.getContext('2d')!
      ctx.drawImage(
        canvas,
        0, yOffset / pxToMm,          // source x, y
        canvas.width, sliceCanvas.height, // source w, h
        0, 0,                          // dest x, y
        canvas.width, sliceCanvas.height  // dest w, h
      )

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95)
      const sliceHeightMmActual = sliceCanvas.height * pxToMm

      pdf.addImage(sliceData, 'JPEG', margin, margin, contentWidth, sliceHeightMmActual)
      yOffset += sliceHeightMm
    }

    const filename = `questions-export-${new Date().toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)

  } finally {
    // Always remove the iframe
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe)
    }
  }
}