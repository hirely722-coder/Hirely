# Guide: Separating Repositories & Setting Up Cloudflare Git Deployments

This guide details how to split the mono-directory structure into three independent GitHub repositories, create `.gitignore` configurations, and link them to Cloudflare for automated Git-push-based deployments.

---

## Part 1: Initialize Git & `.gitignore` for Each Repository

Since the parent folder `Hirely/` is currently a single Git repository, we must initialize separate repositories inside each subdirectory.

### 1. Hirely Recruiter Frontend (`frontend/`)

#### `.gitignore` Configuration
Create [frontend/.gitignore](file:///d:/VSCODE/Hirely/frontend/.gitignore):
```gitignore
# Next.js build and outputs
.next/
.open-next/
out/
build/

# Node dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml
bun.lockb

# Local environment variables
.env*.local
.env

# Cloudflare Pages config / cache
.wrangler/
.cf/

# OS files
.DS_Store
Thumbs.db
```

#### Initialization & Push Commands
Run these commands inside the `frontend/` folder:
```bash
git init
git add .
git commit -m "initial commit: Hirely Recruiter Frontend"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/hirely-frontend.git
git push -u origin main
```

---

### 2. Hirely Backend Worker (`backend/`)

#### `.gitignore` Configuration
Create [backend/.gitignore](file:///d:/VSCODE/Hirely/backend/.gitignore):
```gitignore
# Dependencies
node_modules/
bun.lockb
package-lock.json

# Build outputs
dist/
.wrangler/

# Local variables
.env
.dev.vars

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

#### Initialization & Push Commands
Run these commands inside the `backend/` folder:
```bash
git init
git add .
git commit -m "initial commit: Hirely Backend Worker"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/hirely-backend.git
git push -u origin main
```

---

### 3. Hirely Admin Frontend (`admin-frontend/`)

#### `.gitignore` Configuration
Create [admin-frontend/.gitignore](file:///d:/VSCODE/Hirely/admin-frontend/.gitignore):
```gitignore
# Next.js build and outputs
.next/
.open-next/
out/

# Dependencies
node_modules/
bun.lockb
package-lock.json

# Local environment variables
.env*.local
.env

# Wrangler
.wrangler/

# OS files
.DS_Store
```

#### Initialization & Push Commands
Run these commands inside the `admin-frontend/` folder:
```bash
git init
git add .
git commit -m "initial commit: Hirely Admin Frontend"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/hirely-admin-frontend.git
git push -u origin main
```

---

## Part 2: Connect to Cloudflare for Git-Push Deployments

Once your repositories are on GitHub, you can configure Cloudflare to build and deploy your projects automatically every time you run `git push`.

### 1. Frontends: Recruiter & Admin (Cloudflare Pages)

Both frontends are Next.js applications and should be deployed via **Cloudflare Pages** using GitHub integration:

1. Log into your **Cloudflare Dashboard**.
2. Navigate to **Workers & Pages** > **Create** > **Pages** > **Connect to Git**.
3. Select your GitHub account and authorize access to `hirely-frontend` (or `hirely-admin-frontend`).
4. Set the following **Build Settings**:
   * **Framework Preset:** `Next.js`
   * **Build Command:** `bun run cf-build`
   * **Build Output Directory:** `.open-next`
5. Click **Save and Deploy**. Cloudflare will automatically build and deploy every time you push to the `main` branch.

---

### 2. Backend: Hono Worker (GitHub Actions for Cloudflare Workers)

Because Cloudflare Workers does not have a direct "Connect to Git" UI like Pages, the industry standard is to use **GitHub Actions** to deploy on every push using the official Wrangler Action.

#### Bypassing the `workflow` Scope Push Error:
If Git rejects your push with a warning about `workflow` scopes (due to the GitHub CLI OAuth token limits), you can use either of these manual methods to add it:

* **Method A: Create the file directly on GitHub.com (easiest)**
  1. Go to your `hirely-backend` repository page on GitHub.
  2. Click on **Add file** > **Create new file**.
  3. Type the name: `.github/workflows/deploy.yml` (the slashes will make the directories).
  4. Paste the workflow YAML code below.
  5. Click **Commit changes...**.
  6. Run `git pull` in your local `backend/` terminal to sync.

* **Method B: Push using a Personal Access Token**
  1. Create a Classic PAT on GitHub with `workflow` and `repo` scopes.
  2. Push using the token in the URL:
     `git push https://<YOUR_TOKEN>@github.com/hirely722-coder/hirely-backend.git main`

#### Workflow Code (`backend/.github/workflows/deploy.yml`):
```yaml
name: Deploy Backend Worker
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy
```
* Remember to add your Cloudflare Workers API token as a repository secret named `CLOUDFLARE_API_TOKEN` under your GitHub settings at `Settings` > `Secrets and variables` > `Actions`!
