# API Connection Troubleshooting Guide

## Common "Failed to fetch" Error Solutions

When you encounter a "Failed to fetch" error, it typically indicates a network connectivity issue. Here are the most common causes and solutions:

### 1. Server Not Running

**Problem**: The API server is not running or not accessible.
**Solution**:

- Ensure your API server is running on the specified port
- Check if the server is listening on the correct interface (0.0.0.0 vs 127.0.0.1)
- Verify the server logs for any startup errors

### 2. Incorrect Base URL

**Problem**: The base URL in settings doesn't match your server configuration.
**Solution**:

- Open API Settings (gear icon in header)
- Verify the Base URL matches your server (e.g., `http://localhost:8080`)
- Use "Test Connection" button to verify connectivity
- Common URLs:
  - `http://localhost:8080`
  - `http://127.0.0.1:8080`
  - `http://0.0.0.0:8080`

### 3. CORS (Cross-Origin Resource Sharing) Issues

**Problem**: Browser blocks requests due to CORS policy.
**Solution**:

- Configure your API server to allow CORS requests
- Add appropriate CORS headers:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  ```
- For development, you might need to disable CORS in your server configuration

### 4. Firewall/Network Blocking

**Problem**: Firewall or network configuration blocks the connection.
**Solution**:

- Check if your firewall allows connections to the server port
- Verify network connectivity between client and server
- Try accessing the server directly in browser (e.g., `http://localhost:8080/health`)

### 5. SSL/TLS Issues

**Problem**: Mixed content or certificate issues with HTTPS.
**Solution**:

- Use consistent protocol (HTTP or HTTPS) for both client and server
- For development, use HTTP for both
- For production, ensure valid SSL certificates

## Using the Built-in Diagnostics

### API Settings Modal

1. Click the gear icon in the top-right corner
2. Verify your Base URL is correct
3. Click "Test Connection" to check server availability
4. Status indicators:
   - 🟡 **Checking...**: Connection test in progress
   - 🟢 **Server is online**: Connection successful
   - 🔴 **Server is offline**: Connection failed

### Browser Developer Tools

1. Open Developer Tools (F12)
2. Check the Console tab for detailed error messages
3. Check the Network tab to see failed requests
4. Look for CORS errors or 404/500 status codes

### API Request Logging

The application logs detailed request information to the browser console:

- Request method and URL
- Headers being sent
- Request body (for POST/PUT requests)
- Response status and data

## Quick Fixes Checklist

- [ ] Server is running and accessible
- [ ] Base URL in settings is correct
- [ ] CORS is properly configured on server
- [ ] Firewall allows connections to server port
- [ ] Network connectivity is working
- [ ] Using consistent HTTP/HTTPS protocol
- [ ] Browser developer tools show no CORS errors
- [ ] "Test Connection" in API Settings shows green status

## Getting Help

If you're still experiencing issues:

1. Check the browser console for detailed error messages
2. Use the "Test Connection" feature in API Settings
3. Verify your server configuration and logs
4. Try accessing the API directly in your browser
5. Check if other HTTP clients (like Postman) can connect to your server
