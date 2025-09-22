import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const indexNowUrl = 'https://www.bing.com/indexnow'
    const baseUrl = 'https://earningstable.com'
    
    // Submit main page for instant indexing
    const payload = {
      host: 'earningstable.com',
      key: process.env.INDEXNOW_KEY || 'your-indexnow-key',
      keyLocation: `${baseUrl}/indexnow-key.txt`,
      urlList: [
        baseUrl,
        `${baseUrl}/api/earnings`,
        `${baseUrl}/api/earnings/stats`,
      ]
    }

    const response = await fetch(indexNowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      return NextResponse.json({ success: true, message: 'URLs submitted to IndexNow' })
    } else {
      return NextResponse.json({ success: false, error: 'IndexNow submission failed' })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'IndexNow error' })
  }
}
