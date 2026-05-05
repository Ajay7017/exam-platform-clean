import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
  }

  if (!url.includes('res.cloudinary.com')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 })
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Cloudinary returned ${response.status}` },
        { status: response.status }
      )
    }

    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('PDF proxy error:', err)
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 })
  }
}