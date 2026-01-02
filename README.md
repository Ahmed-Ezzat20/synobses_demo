# OmniASR Frontend

Modern single-page application for the **OmniASR** Automatic Speech Recognition service.

![OmniASR screenshot](docs/screenshot.png)

---

## Features

- React + Vite + Tailwind CSS (dark-mode-first)
- Axios API client with connect flow
- Searchable language selector (Arabic fallback list)
- Drag-and-drop audio upload
- Standard / Large-file mode toggle
- Results card with transcription + metrics
- Detailed error handling & loading states

---

## Prerequisites

- Node.js ≥ 18
- OmniASR backend deployed on Modal.com (FastAPI endpoints `/health`, `/languages`, `/transcribe`, `/transcribe_large`)

> Ensure CORS is enabled on the backend, e.g.
> ```python
> app.add_middleware(
>     CORSMiddleware,
>     allow_origins=["http://localhost:5173"],
>     allow_credentials=True,
>     allow_methods=["*"],
>     allow_headers=["*"],
> )
> ```

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (http://localhost:5173)
npm run dev
```

### Build for production

```bash
npm run build      # generates dist/
npm run preview    # local preview of production build
```

---

## Usage

1. **Connect**
   - Enter your backend base URL (no trailing slash) e.g. `https://omniasr.modal.run`
   - Click **Connect**. App hits `/health`, fetches languages.
2. **Prepare request**
   - Choose language (required).
   - Pick **Standard Mode** (<40 s) or **Large File Mode** (>40 s).
   - Drag-drop or browse for an audio file.
3. **Transcribe**
   - Click **Transcribe**. Progress indicator shows while waiting.
   - View transcript & metrics. Copy text with one click.

---

## Tech stack

| Purpose | Library |
|---------|---------|
| UI      | React 18, Tailwind CSS 3 |
| Icons   | Lucide-React |
| HTTP    | Axios |
| Tooling | Vite, ESBuild |

---

## Project structure

```
├─ src/
│  ├─ components/     # Reusable UI pieces
│  ├─ context/        # ApiProvider & hooks
│  ├─ App.jsx         # Main layout
│  ├─ main.jsx        # Vite entry
│  └─ index.css       # Tailwind base
├─ vite.config.js
├─ tailwind.config.js
└─ package.json
```

---

## Contributing

Pull requests welcome! Please open an issue first to discuss major changes.

---

## License

MIT © 2026 OmniASR
