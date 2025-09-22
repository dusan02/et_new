import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = 'https://earningstable.com'
  
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Earnings Table - Live Stock Earnings Feed</title>
    <description>Real-time earnings data and corporate financial updates</description>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <ttl>60</ttl>
    
    <item>
      <title>Today's Earnings Reports - ${new Date().toLocaleDateString()}</title>
      <description>Live earnings table with real-time EPS and revenue data for today's reporting companies</description>
      <link>${baseUrl}</link>
      <guid>${baseUrl}/${new Date().toISOString().split('T')[0]}</guid>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <category>Finance</category>
      <category>Earnings</category>
      <category>Stock Market</category>
    </item>
  </channel>
</rss>`

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
