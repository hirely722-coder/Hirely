# Hirely Recruiter Frontend Developer Guide

Welcome! This guide outlines the build commands, code style, and critical architectural patterns of the Hirely recruiter frontend.

---

## 🛠️ Commands

* **Start Local Dev Server:** `bun run dev` (Runs Next.js dev server on port `7474`)
* **Production Cloudflare Build:** `bun run cf-build` (Runs `opennextjs-cloudflare build` to output bundle into `.open-next/`)
* **Deploy to Cloudflare:** `bun run cf-deploy` (Runs `opennextjs-cloudflare deploy`)
* **Lint Codebase:** `bun run lint`

---

## 🏗️ Technical Stack & Architecture

* **Framework:** Next.js (Pages Router) using React 19 and Tailwind CSS.
* **Global Context:** [AppContext.tsx](file:///src/context/AppContext.tsx) manages unified workspace configurations, active user profiles, real-time database subscription bindings, and global compose overlays.
* **Database Client:** [supabase.ts](file:///src/utils/supabase.ts) interfaces with the Supabase schema.

---

## 🌟 Critical Architectural Patterns

### 1. Branded Loading & Route Protection
* Protected page mounts are guarded in [Layout.tsx](file:///src/components/Layout.tsx).
* To prevent authentication redirect flickering during page refreshes:
  * `isLoading` stays `true` until the initial async session recovery completes (`authInitialized === true`).
  * An animated brand loader overlay (featuring a pulsing "H" logo) holds the viewport until verification finishes, transitioning directly into the dashboard.

### 2. Copilot ReAct Loop
* The [CopilotView.tsx](file:///src/components/CopilotView.tsx) panel communicates with the backend `/api/ai/copilot` endpoint.
* Due to serverless CPU execution constraints, the API runs **synchronously**. The frontend checks the response directly; if it returns `status: 'completed'` or `status: 'pending_approval'`, it renders the result immediately, bypassing any polling loops.
* **Stateless Approval Fallback:** When approving a database action, the frontend transmits both the `taskId` and the `action` JSON block (`command`, `data`, `id`) in the request body as a fallback in case the backend's memory map is cleared.

### 3. SWR & Optimistic UI Updates
* Core tabs and dashboard layouts utilize SWR-based caches stored in `localStorage` to load cached data instantly before performing background database syncs.
* Pipeline stages use Optimistic UI updates to render candidate lane shifts immediately while syncing database writes in the background.
