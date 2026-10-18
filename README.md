# EventVision Lab — Event-Based Cameras Inspired by the Human Eye

A university engineering project exploring neuromorphic vision sensors through interactive 3D simulations, real-time event-stream visualisation, and scientific content.

## ✨ Features

| Route | Description |
|---|---|
| `/` | Hero landing page with key metrics |
| `/theory` | Scientific concepts, math model, history timeline |
| `/laboratory` | Real-time interactive event-camera simulator |
| `/comparison` | Frame-based vs. event-based side-by-side analysis |
| `/applications` | Filterable application domain cards |
| `/team` | Team member profiles |
| `/presentation` | Embedded Canva slides |

## 🛠 Tech Stack

- **React 19** + **TypeScript**
- **Vite** — blazing-fast bundler
- **React Router DOM v7** — client-side routing
- **Three.js / React Three Fiber / Drei** — 3D simulations (next phase)
- **Lucide React** — icons
- **Recharts** — data charts (next phase)

## 🚀 Local Development

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/event-camera-lab.git
cd event-camera-lab

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# Open http://localhost:5173
```

## 📦 Production Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## 🌐 Deployment (Vercel)

The project includes `vercel.json` which rewrites all paths to `index.html` for SPA routing.

1. Push to GitHub
2. Import the repo into [Vercel](https://vercel.com)
3. Vercel auto-detects Vite — no extra configuration needed

## 📽 Adding the Canva Presentation

1. Open your presentation in Canva
2. **Share → Embed** → copy the `src` URL from the `<iframe>` snippet
3. Open `src/pages/Presentation.tsx`
4. Paste the URL into the `CANVA_URL` constant

## 📁 Project Structure

```
src/
├── components/
│   └── layout/        # Navbar, Footer, Layout shell
├── pages/             # One file per route
│   ├── Home.tsx
│   ├── Theory.tsx
│   ├── Laboratory.tsx
│   ├── Comparison.tsx
│   ├── Applications.tsx
│   ├── Team.tsx
│   ├── Presentation.tsx
│   └── NotFound.tsx
├── styles/
│   ├── globals.css    # Design tokens + utility classes
│   └── nav.css        # Navigation-specific styles
├── App.tsx            # Route declarations
└── main.tsx           # React entry point
```

## 🎨 Design System

The interface uses a dark photonics-laboratory palette defined as CSS custom properties in `src/styles/globals.css`:

| Token | Value | Usage |
|---|---|---|
| `--color-bg-deep` | `#050d1a` | Page background |
| `--color-cyan` | `#06b6d4` | Primary accent |
| `--color-teal` | `#14b8a6` | Secondary accent |
| `--color-text-primary` | `#e2eeff` | Body text |

## 📜 License

University project — all rights reserved. Not for redistribution.
