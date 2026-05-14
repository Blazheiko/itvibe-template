# Testing ID-based Navigation

## What was fixed

1. **Redesigned highlighting logic** - now uses unique `route.id` instead of URL matching
2. **Fixed ID assignment** - now all routes in tree structure have unique IDs
3. **Improved automatic group expansion** - group search is now based on route IDs
4. **Added debug logs** - for highlighting diagnostics

## How to test

1. Open the application in browser: http://localhost:5173
2. Open developer console (F12)
3. Click on any route in the right "On This Page" panel
4. Check console messages:
   - `Auto-expanding groups (ID-based)` - shows found groups for expansion
   - `Groups expanded, new expandedGroups` - shows expanded groups
   - `Route is active (ID-based)` - shows active route
   - `Group is active (ID-based)` - shows active group

## Expected behavior

✅ When clicking on a route in the right panel:

- Corresponding route in left navigation is highlighted in blue
- Group containing the route automatically expands
- Debug messages with correct IDs appear in console

✅ When navigating to specific route via URL (e.g., `/route/123`):

- Route with ID 123 is highlighted in left navigation
- Its group automatically expands

## Key code changes

### TreeGroup.vue

- `isRouteActive()` now uses `route.id` directly
- `isGroupActive()` recursively searches for route by ID in group
- `scrollToRoute()` passes `route.id` directly

### SiteNavigation.vue

- Automatic group expansion based on ID search
- Added recursive function to find groups containing route

### api-doc.ts (store)

- Added `assignIdsToTreeRoutes()` function to set IDs in tree structure
- Updated `groupRouteHandler()` to preserve existing IDs

## Debugging

If highlighting doesn't work, check in console:

1. Are there any error messages?
2. Is `selectedRouteId` set correctly?
3. Are groups with the route found?
4. Are route IDs compared correctly?
