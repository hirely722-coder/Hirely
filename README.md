<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:** [Bun](https://bun.sh/) installed on your machine.

### 1. Run Backend Server
1. Navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   bun install
   ```
3. Set your environment variables in `.env` (like `EDENAI_API_KEY` and Supabase keys).
4. Run the backend development server:
   ```bash
   bun run dev
   ```

### 2. Run Frontend App
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run the frontend development server:
   ```bash
   bun run dev
   ```
