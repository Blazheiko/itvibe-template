# CORS Issue Resolution Guide

## Problem Description

After adding global headers functionality, CORS (Cross-Origin Resource Sharing) errors started appearing when making API requests. This happens because additional headers can trigger CORS preflight requests.

## Root Cause

When you add custom headers to HTTP requests, browsers may send a preflight OPTIONS request to check if the server allows these headers. If the server doesn't handle preflight requests properly, CORS errors occur.

## Quick Solution

### 1. Disable Global Headers Temporarily

If you need to make requests work immediately:

1. Open API Settings (gear icon in header)
2. Toggle the "Global Headers" switch to **Disabled**
3. Save settings
4. Try your API requests again

This will remove all custom headers and likely resolve the CORS issue.

### 2. Enable Global Headers Selectively

If you need specific headers:

1. Keep Global Headers **Enabled**
2. Add only essential headers (like `Authorization`)
3. Avoid adding headers that might trigger preflight requests unnecessarily

## Server-Side Solutions

### For Development Servers

Add CORS middleware to handle preflight requests:

```javascript
// Express.js example
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  )

  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})
```

### For Production Servers

Configure your server to properly handle CORS:

1. **Nginx**: Add CORS headers in server configuration
2. **Apache**: Use `.htaccess` or server configuration
3. **API Gateway**: Configure CORS policies

## Headers That Commonly Trigger Preflight

These headers will trigger a preflight request:

- `Authorization` (except for basic auth)
- `Content-Type` (except for simple values)
- Custom headers like `X-API-Key`, `X-Custom-Header`, etc.

## Simple Headers (No Preflight)

These headers typically don't trigger preflight:

- `Accept`
- `Accept-Language`
- `Content-Language`
- `Content-Type` with values: `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`

## Testing CORS Issues

### Using Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Look for OPTIONS requests (preflight)
4. Check if they return 200 status
5. Verify CORS headers in response

### Using the Built-in Test

1. Open API Settings
2. Click "Test Connection"
3. If it shows "Server is offline" but server is running, it might be a CORS issue

## Best Practices

1. **Start Simple**: Begin with no global headers, add them gradually
2. **Server First**: Ensure your server handles CORS before adding headers
3. **Use Toggle**: Use the Global Headers toggle to quickly diagnose issues
4. **Monitor Network**: Watch browser DevTools for preflight requests
5. **Test Incrementally**: Add one header at a time to identify problematic ones

## Application Features for CORS Management

### Global Headers Toggle

- **Location**: API Settings modal
- **Purpose**: Quickly enable/disable all global headers
- **Visual Feedback**: Shows enabled/disabled status with color coding

### Header Management

- **Add/Remove**: Dynamic header management
- **Validation**: Real-time feedback on header configuration
- **Preview**: See current active headers in settings

### Connection Testing

- **Test Button**: Verify server connectivity
- **Status Indicators**: Visual feedback on connection status
- **Error Details**: Detailed error messages in console

## When to Contact Backend Team

Contact your backend developers if:

1. Disabling global headers fixes the issue
2. Server doesn't respond to OPTIONS requests
3. CORS headers are missing in server responses
4. Preflight requests return non-200 status codes

The issue is likely on the server side if the same requests work with tools like Postman or curl.
