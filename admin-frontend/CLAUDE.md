# Hirely Superadmin Frontend Developer Guide

Welcome! This guide outlines the build commands, code style, and critical architectural patterns of the Hirely superadmin dashboard.

---

## 🛠️ Commands

* **Start Local Dev Server:** `bun run dev` (Runs Next.js dev server on port `7475`)
* **Statically Export / Build:** `bun run build`
* **Deploy to Cloudflare Pages:** Managed automatically via Cloudflare Git Pages integration on pushing to the `main` branch.

---

## 🏗️ Technical Stack & Architecture

* **Framework:** Next.js (Pages Router) using React and Tailwind CSS.
* **Global Context:** [AdminAppContext.tsx](file:///src/context/AdminAppContext.tsx) manages global platform switches, locked features, SMTP configurations, and subscription versions.
* **Database Client:** [supabase.ts](file:///src/utils/supabase.ts) interfaces with the Supabase schema.

---

## 🌟 Critical Architectural Patterns

### 1. Platform-Wide Feature Switches
* Controls the features locked or enabled globally across recruiter workspace tiers (e.g., locking the Copilot, disabling SMTP, or capping pipeline candidate counts).
* Updates the `superadmin_feature_switches` database tables, which recruiter applications verify on startup.

### 2. Audit & Access Controls
* Integrates dashboards for payment logs, agency activity audits, and support ticket resolutions.
* Access is strictly restricted. Recruiter profiles are redirected away from these routes.
