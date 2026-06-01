# API Documentation - Vue 3 Application

This is a Vue 3 application for displaying and testing API routes. It automatically loads route information from the server and provides an interactive interface for browsing and testing.

## Project Structure

```
src/
├── assets/
│   ├── api-doc.css       # Styles for API documentation
│   ├── base.css          # Base styles
│   └── main.css          # Main stylesheet
├── components/
│   └── api/
│       ├── ApiHeader.vue     # Header with search and theme toggle
│       ├── ApiFilters.vue    # Filters for HTTP/WS routes
│       ├── ApiGroup.vue      # Route group
│       ├── ApiRoute.vue      # Single route with details
│       └── TestForm.vue      # Form for API testing
├── composables/
│   └── useTheme.ts       # Composable for theme handling
├── stores/
│   └── api.ts            # Pinia store for API data management
├── utils/
│   └── apiHelpers.ts     # Helper functions
├── views/
│   ├── ApiHomeView.vue       # Main page with all routes
│   └── RouteDetailView.vue   # Detailed route page
├── router/
│   └── index.ts          # Vue Router configuration
├── App.vue               # Root component
└── main.ts               # Application entry point
```

## Key Features

### 1. Route Grouping

- Group routes by prefix
- Show number of endpoints per group
- Display group middlewares and rate limits

### 2. Route Details

- HTTP method and URL
- Route description
- URL parameters
- Validation schema for incoming data
- Request body schema
- Response format with examples
- Rate limits
- Middlewares

### 3. API Testing

- Interactive request form
- URL parameter support
- Headers configuration
- Request body sending for POST/PUT/PATCH
- Real-time JSON validation
- Multiple requests for load testing
- Detailed result output with response time
- Aggregated stats for multiple requests

### 4. Extra Features

- Route search
- HTTP and WebSocket route filters
- Dark/Light theme
- Expand/Collapse all routes
- Mobile-friendly responsive design
- Routing: each route has its own URL

## Usage

### Data Loading

The app automatically loads route data at startup from:

```
GET /api/doc/routes
```

**Important:** Ensure your API server is running at `http://127.0.0.1:5174`.
The Vite dev server automatically proxies `/api/*` requests to `http://127.0.0.1:5174`.

Expected response format:

```json
{
  "httpRoutes": [
    {
      "prefix": "users",
      "description": "User Management",
      "middlewares": ["auth"],
      "rateLimit": {
        "windowMs": 60000,
        "maxRequests": 100
      },
      "group": [
        {
          "url": "/users/:id",
          "method": "get",
          "description": "Get user by ID",
          "handler": "getUserById",
          "validator": "userIdSchema",
          "rateLimit": {
            "windowMs": 60000,
            "maxRequests": 50
          }
        }
      ]
    }
  ],
  "wsRoutes": [],
  "validationSchemas": {
    "userIdSchema": {
      "id": {
        "type": "number",
        "required": true,
        "description": "User ID"
      }
    }
  },
  "responseTypes": {
    "UserResponse": {
      "fields": {
        "id": {
          "type": "number",
          "required": true,
          "example": 1
        },
        "name": {
          "type": "string",
          "required": true,
          "example": "John Doe"
        }
      }
    }
  },
  "handlerTypeMapping": {
    "getUserById": "UserResponse"
  }
}
```

### Navigation

- **Home** (`/`) - list of all route groups
- **Route details** (`/route/:groupIndex/:routeIndex`) - detailed info for a specific route

### Working with Components

#### ApiStore (Pinia)

Global store for managing data:

```typescript
import { useApiStore } from '@/stores/api'

const apiStore = useApiStore()

// Load data
await apiStore.fetchRoutes()

// Filtering
apiStore.setRouteType('http') // or 'ws'
apiStore.setSearchTerm('users')

// Access data
apiStore.filteredGroups
apiStore.currentRouteGroups
```

#### useTheme Composable

App theme management:

```typescript
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
```

## Tech Stack

- **Vue 3** - Composition API with `<script setup>`
- **TypeScript** - Type safety
- **Pinia** - State management
- **Vue Router** - Routing
- **Tailwind CSS** - Styling
- **Vite** - Bundler and dev server

## Run the Project

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Configure API endpoint

If your API is hosted elsewhere, update the URL in `src/stores/api.ts`:

```typescript
async function fetchRoutes() {
  const response = await fetch('YOUR_API_URL/api/doc/routes')
  // ...
}
```

## Implementation Notes

### Component Architecture

The app is split into reusable components:

- `ApiHeader` - standalone header
- `ApiFilters` - filters with events
- `ApiGroup` - container for a group of routes
- `ApiRoute` - self-contained route component
- `TestForm` - testing form with validation

### Global State

All route information is stored in a Pinia store, which allows:

- Centralized data management
- Avoiding prop drilling
- Easy app scaling

### Routing

Each API route has its own URL in the app:

- Share links to specific routes
- Convenient navigation via browser history

### Responsiveness

The application is fully responsive:

- Mobile-first approach
- Touch-friendly interface
- Optimized for various screen sizes

## Support

For questions and suggestions, please open issues in the project repository.
