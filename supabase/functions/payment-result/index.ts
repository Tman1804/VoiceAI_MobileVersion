// VoxWarp Payment Result Page
// Deploy: supabase functions deploy payment-result --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || 'success'
  
  const isSuccess = status === 'success'
  
  const html = `<!DOCTYPE html>
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
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { color: #94a3b8; margin-bottom: 16px; line-height: 1.6; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      margin-top: 24px;
      cursor: pointer;
      border: none;
    }
    .hint { font-size: 14px; color: #64748b; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon ${isSuccess ? 'success' : 'cancel'}">
      ${isSuccess ? '✓' : '✕'}
    </div>
    <h1>${isSuccess ? 'Payment Successful!' : 'Payment Cancelled'}</h1>
    <p>${isSuccess 
      ? 'Thank you for upgrading to VoxWarp Pro! You now have access to 50,000 tokens per month.' 
      : 'Your payment was cancelled. No charges were made.'}</p>
    <button class="btn" onclick="closeWindow()">Close & Return to App</button>
    <p class="hint">Or just close this browser tab manually.</p>
  </div>
  <script>
    function closeWindow() {
      window.close();
      // Fallback: if window.close() doesn't work (blocked by browser)
      setTimeout(function() {
        document.body.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">Please close this tab manually and return to VoxWarp.</div>';
      }, 500);
    }
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
    status: 200,
  })
})
