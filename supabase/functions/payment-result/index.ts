// VoxWarp Payment Result Page
// Deploy: supabase functions deploy payment-result --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || 'success'
  const isSuccess = status === 'success'
  
  const title = isSuccess ? 'Payment Successful!' : 'Payment Cancelled'
  const message = isSuccess 
    ? 'Thank you for upgrading to VoxWarp Pro! You now have access to 50,000 tokens per month.' 
    : 'Your payment was cancelled. No charges were made.'
  const iconClass = isSuccess ? 'success' : 'cancel'
  const icon = isSuccess ? '&#10003;' : '&#10007;'

  const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>VoxWarp</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,#0f172a,#1e293b);min-height:100vh;display:flex;align-items:center;justify-content:center;color:white}.container{text-align:center;padding:40px;max-width:400px}.icon{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:40px}.success{background:linear-gradient(135deg,#10b981,#06b6d4)}.cancel{background:linear-gradient(135deg,#f59e0b,#ef4444)}h1{font-size:24px;margin-bottom:12px}p{color:#94a3b8;margin-bottom:16px;line-height:1.6}.btn{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:16px 32px;border-radius:12px;font-weight:600;font-size:16px;margin-top:24px;cursor:pointer;border:none}.hint{font-size:14px;color:#64748b;margin-top:16px}</style></head><body><div class="container"><div class="icon ' + iconClass + '">' + icon + '</div><h1>' + title + '</h1><p>' + message + '</p><button class="btn" onclick="window.close()">Close</button><p class="hint">Close this tab to return to VoxWarp</p></div></body></html>'

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  })
})
