# WebSocket Functionality

## Overview

WebSocket connection functionality has been added to the application. You can now connect to WebSocket servers directly from the application interface.

## New Components

### 1. WebSocket Button in Header

- Added a button with WiFi icon to the application header (ApiHeader.vue)
- Located between the settings button and theme toggle
- Opens WebSocket connection management modal when clicked
- **Dynamic color indication based on connection status:**
  - 🟢 **Green** - Connected
  - 🟡 **Yellow** - Connecting...
  - 🔴 **Red** - Error
  - ⚪ **Gray** - Disconnected

### 2. WebSocketModal.vue

Modal window for managing WebSocket connections with features:

- WebSocket server URL input
- Connect/disconnect from server
- Connection status display with color indication
- Send ping messages
- View last received messages
- Save URL in localStorage

### 3. useWebSocket.ts

Composable for managing WebSocket connections:

- Connect and disconnect from WebSocket servers
- Send messages through API methods
- Handle broadcast messages
- Automatic reconnection
- Connection state management

## Usage

### Connecting to WebSocket Server

1. Click the WebSocket button (WiFi icon) in the application header
2. Enter WebSocket server URL (e.g., `ws://localhost:8080`)
3. Click "Connect" button
4. Connection status will be displayed with color indication:
   - 🟢 Green - connected
   - 🟡 Yellow - connecting...
   - 🔴 Red - error
   - ⚪ Gray - disconnected

### Connection Management

- **Ping**: Send ping message to server to check connection
- **Disconnect**: Close WebSocket connection
- **Last Message**: View last received broadcast message

### Test Server

A test server file `test-websocket-server.js` was created for testing:

```bash
# Install dependencies (if needed)
npm install ws

# Run test server
node test-websocket-server.js
```

Test server features:

- Listens on port 8080
- Responds to ping messages
- Sends welcome message on connection
- Periodically sends broadcast messages
- Handles API requests

## Technical Improvements

### Enhanced Callback System

The WebSocket implementation now includes comprehensive callback handling:

- **onOpen**: Called when connection is established - automatically updates button to green
- **onClose**: Called when connection closes - updates button color based on close reason
- **onError**: Called on connection errors - immediately shows red button
- **onBroadcast**: Handles incoming broadcast messages
- **onReauthorize**: Handles authorization requirements

### Real-time State Management

Connection state is now managed in real-time through callbacks rather than polling:

- Immediate visual feedback on connection changes
- Accurate error reporting
- Proper cleanup on disconnection

## Technical Details

### WebSocket Message Structure

All messages have the following structure:

```typescript
interface WebsocketMessage {
  event: string // Event type (api:*, service:*, broadcast:*)
  status: number // HTTP-like status code
  payload: object // Message data
}
```

### Events

- `service:ping` / `service:pong` - connection check
- `service:connection_established` - connection confirmation
- `api:*` - API requests and responses
- `broadcast:*` - broadcast messages

### Automatic Reconnection

WebSocket connection automatically reconnects on disconnect with exponential backoff up to 15 seconds.

## Integration with Existing Code

WebSocket functionality is fully integrated with existing architecture:

- Uses Vue 3 Composition API
- Follows project patterns
- Compatible with dark/light theme
- Saves settings in localStorage

## Security

- Only WebSocket protocols supported (ws:// and wss://)
- Automatic resource cleanup on connection close
- Connection error and timeout handling
