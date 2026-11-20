# KenaX BD – Complete Website & Admin Panel Performance Optimization

Act as a Senior Full-Stack Performance Engineer. Perform a complete performance audit and optimization of the entire KenaX BD application.

## 1. Critical Objective
The entire website is currently experiencing slow loading:
- Initial website loading is slow.
- Admin Dashboard takes too long to open after login.
- Navigating between Admin sections is slow.
- Products, Orders, Customers and other pages take too long to load.

Your task is to identify and fix the actual root causes throughout the existing codebase.

Do not simply change loading animations or hide loading indicators. Improve the actual application performance.

## 2. Frontend Performance
- Implement route-based code splitting and React.lazy() where appropriate.
- Use Suspense with lightweight loading fallbacks.
- Prevent unnecessary component re-renders.
- Optimize React state management.
- Avoid loading the entire Admin Panel bundle at once.
- Load only the components required for the current page.
- Optimize JavaScript and CSS bundle sizes.
- Remove unused dependencies and unnecessary code where safe.
- Optimize images using appropriate formats, dimensions and lazy loading.
- Avoid blocking the initial page render.

## 3. Admin Panel Optimization
- Make the Admin Dashboard load quickly after authentication.
- Load dashboard summary statistics efficiently.
- Load each Admin section independently.
- Do not fetch all Orders, Products, Customers, Staff and other records simultaneously.
- Implement server-side or database-level pagination where appropriate.
- Use search, filtering and sorting efficiently.
- Avoid repeated database queries when navigating between sections.
- Cache suitable dashboard data and reuse it when safe.
- Refresh stale data intelligently without blocking the UI.
- Ensure each section displays useful content as soon as its required data is available.

## 4. Firebase & Firestore Optimization
Audit all Firestore operations throughout the application.

- Reduce unnecessary Firestore reads and writes.
- Eliminate duplicate queries.
- Avoid fetching complete collections unnecessarily.
- Implement pagination with limit() and startAfter() where appropriate.
- Use efficient query constraints.
- Review real-time listeners and unsubscribe when components unmount.
- Prevent duplicate onSnapshot subscriptions.
- Avoid unnecessary repeated data fetching.
- Use caching carefully without showing outdated or unauthorized information.
- Preserve existing Firestore security rules and user permissions.
- Do not introduce expensive database operations.

## 5. Backend & API Optimization
Audit the existing Node.js/Express backend and all API endpoints.

- Identify slow API responses.
- Optimize database access and request handling.
- Avoid unnecessary sequential API requests.
- Use parallel requests only when safe and beneficial.
- Add appropriate request timeouts and error handling.
- Reduce unnecessary payload sizes.
- Optimize Cloud Run cold-start behavior where possible.
- Do not create duplicate backend services or unnecessary API endpoints.

## 6. Loading & Navigation Experience
- Display lightweight skeleton loading states.
- Avoid full-screen loading indicators when only one section is loading.
- Keep navigation responsive while background data loads.
- Prevent unnecessary page reloads.
- Maintain smooth transitions between sections.
- Show meaningful error states when data fails to load.
- Avoid infinite loading states.
- Ensure loading indicators disappear correctly after success or failure.

## 7. Mobile & Low-End Device Optimization
- Prioritize Android mobile performance.
- Reduce unnecessary memory usage.
- Optimize large tables, lists and dashboard widgets.
- Avoid rendering thousands of records simultaneously.
- Use responsive layouts and efficient rendering.
- Ensure smooth scrolling and responsive interactions.

## 8. Build & Deployment Optimization
- Inspect Vite configuration and production build settings.
- Optimize production assets.
- Enable effective caching for static assets.
- Use hashed asset filenames where supported.
- Ensure Firebase Hosting serves optimized production files.
- Preserve the existing GitHub Actions deployment workflow.
- Do not break Firebase Hosting or the existing Cloud Run backend connection.

## 9. Strict Safety Requirements
- Do not redesign the existing website.
- Do not remove or disable existing features.
- Do not change existing business logic unnecessarily.
- Do not modify Admin roles, permissions or access control.
- Do not break authentication, checkout, orders, payments, Telegram alerts or WhatsApp integration.
- Do not delete existing data or collections.
- Do not weaken Firebase security rules.
- Do not expose API keys, tokens or service account credentials.
- Do not replace working integrations with mock data.

## 10. Mandatory Testing & Final Report
After optimization:

1. Run a production build.
2. Fix all build errors.
3. Check for broken imports and missing dependencies.
4. Test authentication and Admin access.
5. Test Dashboard and all Admin sections.
6. Test Products, Orders, Customers and other major features.
7. Check Firestore query behavior and duplicate requests.
8. Verify API and backend connectivity.
9. Check mobile responsiveness.
10. Report the actual bottlenecks discovered and the fixes implemented.

IMPORTANT:
Do not claim that performance has improved unless the changes have been implemented and verified.

The final goal is to make KenaX BD significantly faster, lightweight, stable and smooth across the entire website, especially the Admin Panel, without sacrificing any existing functionality.