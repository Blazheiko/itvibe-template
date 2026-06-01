# API Documentation Navigation Structure

## Overview

The application uses a three-column layout inspired by Prisma docs:

```
┌─────────────────────────────────────────────────────────┐
│                     Header (ApiHeader)                   │
├──────────┬────────────────────────────┬──────────────────┤
│          │                            │                  │
│   Left   │      Main Content          │   Right Panel    │
│  Sidebar │                            │  (On This Page)  │
│          │                            │                  │
│ (Groups  │   API Groups & Routes      │  - Table of      │
│  & Routes│   Details                  │    Contents      │
│  Tree)   │                            │  - Active        │
│          │                            │    Section       │
│          │                            │    Highlight     │
│          │                            │                  │
└──────────┴────────────────────────────┴──────────────────┘
```

## Components

### 1. **SiteNavigation.vue** (Left panel)

**Placement:** Left, fixed width 256px (w-64)

**Functionality:**

- Tree of API route groups
- HTTP / WebSocket toggle
- Expand/Collapse groups
- List of routes within each group
- Auto-scroll navigation to the selected route
- Theme toggle

**Responsiveness:**

- Hidden on screens < XL (1280px)
- Visible on XL+ (1280px+)

**Highlights:**

- Compact tree with arrow icons
- Color coding for HTTP methods (GET, POST, PUT, DELETE, etc.)
- Active item highlight
- Route counter per group

### 2. **OnThisPage.vue** (Right panel)

**Placement:** Right, fixed width 256px (w-64)

**Functionality:**

- Auto-generated table of contents
- List of all visible groups and routes
- Highlight current active section while scrolling
- Auto-scroll navigation to the selected item
- Stats (number of groups and routes)

**Responsiveness:**

- Hidden on screens < 2XL (1536px)
- Visible on 2XL+ (1536px+)

**Highlights:**

- Uses IntersectionObserver to track active section
- Two-level structure (groups → routes)
- HTTP method color coding

### 3. **MobileNavigation.vue** (Mobile menu)

**Placement:** Slide-out panel from the left

**Functionality:**

- Hamburger button in the top-left corner
- Slide-out menu with the full navigation tree
- HTTP / WebSocket toggle
- Groups and routes tree (same as SiteNavigation)
- Theme toggle
- Auto-close when a route is selected

**Responsiveness:**

- Only visible on screens < XL (1280px)
- Full replacement for the left panel on mobile

### 4. **ApiGroup.vue** (Main content)

**Updates:**

- Added IDs for groups: `id="group-{groupIndex}"`
- Added `scroll-mt-24` class for proper scrolling with fixed header

### 5. **ApiRoute.vue** (Main content)

**Updates:**

- ID is set by the parent via `id="route-{groupIndex}-{routeIndex}"`
- Added `scroll-mt-24` class for proper scrolling

## Responsive Breakpoints

| Screen size    | Left panel | Right panel | Mobile menu |
| -------------- | ---------- | ----------- | ----------- |
| < XL (1280px)  | ❌ Hidden  | ❌ Hidden   | ✅ Shown    |
| XL+ (1280px+)  | ✅ Shown   | ❌ Hidden   | ❌ Hidden   |
| 2XL+ (1536px+) | ✅ Shown   | ✅ Shown    | ❌ Hidden   |

## Navigation Functionality

### Scroll to elements

All navigation components use a unified scrolling system:

```typescript
const scrollToRoute = (groupIndex: number, routeIndex: number) => {
  const element = document.getElementById(`route-${groupIndex}-${routeIndex}`)
  if (element) {
    const mainContent = document.querySelector('main')
    if (mainContent) {
      const elementTop = element.offsetTop
      mainContent.scrollTo({
        top: elementTop - 100, // Offset for the fixed header
        behavior: 'smooth',
      })
    }
  }
}
```

### Track active section

The **OnThisPage** component uses IntersectionObserver:

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        activeId.value = entry.target.id
      }
    })
  },
  {
    root: mainContent,
    rootMargin: '-20% 0px -70% 0px',
    threshold: [0, 0.5, 1],
  },
)
```

## Styles and Appearance

### HTTP method color scheme

```typescript
const getMethodColor = (method: string) => {
  const colors = {
    GET: 'text-green-600 dark:text-green-400',
    POST: 'text-blue-600 dark:text-blue-400',
    PUT: 'text-yellow-600 dark:text-yellow-400',
    PATCH: 'text-orange-600 dark:text-orange-400',
    DELETE: 'text-red-600 dark:text-red-400',
  }
  return colors[method] || 'text-gray-600 dark:text-gray-400'
}
```

### Smooth scrolling

```css
html {
  scroll-behavior: smooth;
}

.scroll-mt-24 {
  scroll-margin-top: 6rem; /* Offset for the fixed header */
}
```

### Custom scrollbars

- Thin scrollbars (10px)
- Dark/Light theme
- Smooth transitions

## UX Improvements

1. **Smooth navigation:** Auto-scroll to the selected item with animation
2. **Visual feedback:** Highlight the active item across panels
3. **Compactness:** Efficient use of screen space
4. **Accessibility:** Semantic markup, keyboard navigation support
5. **Performance:** Optimized rendering using IntersectionObserver

## Technologies

- **Vue 3** Composition API
- **TypeScript**
- **Tailwind CSS** for styling
- **Pinia** for state management
- **IntersectionObserver API** for tracking element visibility
