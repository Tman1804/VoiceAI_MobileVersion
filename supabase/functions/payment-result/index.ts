// VoxWarp Payment Result Page
// Deploy: supabase functions deploy payment-result --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)
  const status = url.searchParams.get('status') || 'success'
  
  const isSuccess = status === 'success'
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VoxWarp - Payment ${isSuccess ? 'Successful' : 'Cancelled'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    .success { background: linear-gradient(135deg, #10b981, #06b6d4); }
    .cancel { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    h1 {
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #94a3b8;
      margin-bottom: 32px;
      line-height: 1.6;
    }
    .hint {
      font-size: 14px;
      color: #64748b;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon ${isSuccess ? 'success' : 'cancel'}">
      ${isSuccess ? '✓' : '✕'}
    </div>
    <h1>${isSuccess ? 'Payment Successful!' : 'Payment Cancelled'}</h1>
    <p>
      ${isSuccess 
        ? 'Thank you for upgrading to VoxWarp Pro! Your account has been upgraded and you now have access to 50,000 tokens per month.' 
        : 'Your payment was cancelled. No charges were made to your account.'}
    </p>
    <p class="hint">You can close this tab and return to the VoxWarp app.</p>
  </div>
</body>
</html>
`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: 200,
  })
})
