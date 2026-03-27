# Resume Engine

AI-powered targeted resume and cover letter generator. Paste a job description, get a tailored resume reordered by relevance, a cover letter, ATS score analysis, and before/after bullet comparisons.

Built with Next.js, Tailwind CSS, and the Claude API.

---

## How It Works

1. You paste a job description
2. The app sends it to Claude (via a serverless API route) along with your base resume and the system prompt
3. Claude analyzes the JD, extracts keywords, reorders bullets by relevance, generates a targeted resume + cover letter, and runs an ATS analysis
4. The dashboard displays everything in tabs with copy/export buttons

Your API key stays on the server — it never touches the browser.

---

## Setup (5 minutes)

### 1. Get a Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Go to **Settings → API Keys**
4. Click **Create Key**, give it a name, copy it
5. Add a payment method (you'll pay ~$0.05–0.08 per resume generation)

### 2. Deploy to Railway (recommended)

**Deploy via GitHub integration:**

1. Push this project to a GitHub repo
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Click **New Project → Deploy from GitHub repo**, then select your repository
4. Click on your newly created service and go to the **Variables** tab
5. Click **New Variable** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-your-key-here`
6. Once the domain is generated (go to the **Settings** tab and click **Generate Domain** if needed), your app will be live.

### 3. Run Locally (for testing)

```bash
# Install dependencies
npm install

# Create .env.local with your API key
cp .env.example .env.local
# Edit .env.local and add your real API key

# Start dev server
npm run dev

# Open http://localhost:3000
```

---

## Project Structure

```
resume-engine/
├── app/
│   ├── layout.js          # Root layout
│   ├── page.js            # Main dashboard UI
│   ├── globals.css         # Tailwind + custom styles
│   └── api/
│       └── generate/
│           └── route.js    # API proxy (calls Claude)
├── lib/
│   └── system-prompt.js    # The full system prompt + base resume
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.mjs
├── jsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Customizing

**To update your base resume:** Edit `lib/system-prompt.js` — the resume content is embedded in the system prompt string.

**To change the AI model:** Edit `app/api/generate/route.js` — change the `model` field. Options:
- `claude-sonnet-4-20250514` (recommended — fast, cheap, good quality)
- `claude-opus-4-20250514` (better quality, 2x cost)

**To adjust generation rules:** Edit the prompt rules in `lib/system-prompt.js` — the Phase 1-4 instructions control how the resume is generated.

---

## Cost

Each generation costs approximately $0.05–0.08 USD. That's:
- ~$5 for 100 job applications
- ~$1 for 20 applications

The app uses Claude Sonnet 4 by default for the best cost/quality balance.

---

## Security

- Your API key is stored as a server-side environment variable
- It never reaches the browser
- The API route runs safely on your Railway backend
- No data is stored — each generation is stateless
