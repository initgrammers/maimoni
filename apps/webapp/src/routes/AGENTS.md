# WEBAPP ROUTES KNOWLEDGE BASE

## OVERVIEW
File-based routing for the Maimoni web application using TanStack Start. The routing system handles page layouts, data loading, and server-side functions.

## STRUCTURE
```
apps/webapp/src/routes/
├── __root.tsx      # Main application shell and layout
├── index.tsx       # Dashboard view (currently using mock data)
└── add.tsx         # Transaction entry page
```

## WHERE TO LOOK
- **Main Shell**: `__root.tsx` defines the HTML structure, global styles, and persistent UI elements.
- **Dashboard**: `index.tsx` contains the financial summary and movement list.
- **Data Loading**: Routes use TanStack Router loaders for fetching data before rendering.
- **Mocks**: Mock data is defined locally in `index.tsx` until the API integration is complete.

## CONVENTIONS
- **Route Definition**: Use `createFileRoute('/path')` from `@tanstack/react-router`.
- **Typing**: Use `as never` for the root route path if type generation is pending.
- **Components**: Define the main component within the route file and export it via the `component` property in the route configuration.
- **Navigation**: Use the `Link` component from `@tanstack/react-router` for internal navigation to benefit from prefetching.

## ANTI-PATTERNS
- **Manual <a> Tags**: Don't use standard anchor tags for internal links.
- **Prop Drilling**: Avoid passing data through multiple component layers; use route context or loaders.
- **Persistent State in Components**: Don't store critical application state in local component state if it should persist across navigation.
- **Hardcoded Strings**: Avoid using hardcoded paths for navigation; use the typed paths provided by the router.
- **Mock Data in Production**: Remove `MOCK_MOVEMENTS` once the Hono API endpoints are ready.
