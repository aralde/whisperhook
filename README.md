<div align="center">
  <img src="public/logo.png" alt="WhisperHook Logo" width="120" />

  # 🎙️ WhisperHook

  **System-wide, privacy-focused voice typing powered by local AI.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
  ![Windows](https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
  ![Local AI](https://img.shields.io/badge/100%25%20Local-Offline-green?style=flat-square&logo=gitpod&logoColor=white)
  ![Tauri](https://img.shields.io/badge/Built%20with-Tauri-FFC131?style=flat-square&logo=tauri&logoColor=white)
  
  *Dictate anywhere. Instant transcription. Total privacy.*

</div>

![WhisperHook Banner](public/banner.png)

## 🚀 Quickstart (Local Development)

Wanna start right away? If you are on Windows, just run:

```bash
.\setup.bat
```

Or use npm:

```bash
npm run setup
```

Then, launch the app:

```bash
npm run tauri dev
```

---

## 🎬 Demo

![WhisperHook Demo](public/Antigravity_qSfP1yKdXp.gif)
*WhisperHook in action: instant transcription across multiple applications.*

## 📸 Screenshots

<p align="center">
  <img src="public/whisper-hook_hH6i8NPw81.png" alt="WhisperHook Interface" width="45%" style="margin: 2%;" />
  <img src="public/whisper-hook_E3ZthU9OuP.png" alt="WhisperHook Settings" width="45%" style="margin: 2%;" />
</p>

*Left: The sleek, dark-themed floating indicator. Right: Transcription results in real-time.*

---

## ✨ Why WhisperHook?

- **🔐 100% Local & Private:** Your voice never leaves your computer. Powered by `faster-whisper`, everything processes offline. 
- **⚡ System-Wide Integration:** Works with your browser, Word, IDEs, or any other application.
- **🎤 Zero-Friction Dictation:** 
  - **Push-to-Talk:** Hold `Ctrl+Shift+M` to transcribe.
  - **Real-Time:** Seamless natural speaking, powered by Voice Activity Detection (VAD).
- **🎨 Unobtrusive Design:** Lives quietly in your system tray with a floating indicator.
- **⚙️ Customizable:** Choose your Whisper model (tiny to medium), hardware (CPU/CUDA), and language.

---

## 🧠 The AI Engine

WhisperHook relies on two state-of-the-art AI models:
1. **`faster-whisper`**: A deeply optimized reimplementation of OpenAI's Whisper, running up to 4x faster with less memory.
2. **`silero-vad`**: Enterprise-grade Voice Activity Detection to precisely detect human speech and ignore background noise.

---

## 🔒 Privacy & Offline Execution

- **Zero cloud dependency**: All transcription happens locally.
- **No data collection**: No audio or transcription data is ever transmitted.
- **No internet required**: Works completely offline after installation.

---

## 🛠️ Local Development Setup

While we recommend using `.\setup.bat` for a one-click experience, here are the manual steps if you prefer:

### Prerequisites

1. **Node.js** (v18+)
2. **Rust & Cargo** (`rustup`)
3. **Python** (3.10+)

### 1. Python Environment Setup

The application uses a Python sidecar for transcription. Prepare the virtual environment:

```bash
cd python-core
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
# In the project root
npm install
```

### 3. Run Development Mode

```bash
npm run tauri dev
```

---

## 📦 Generating the Installer

To build a production-ready installer, you must bundle both the frontend and the Python sidecar.

### 1. Build the Frontend

```bash
npm run build
```

### 2. Freeze the Python Sidecar

WhisperHook expects the Python engine as a standalone executable. Use PyInstaller to build it:

```bash
cd python-core
# Ensure your venv is active and requirements are installed
pyinstaller whisper-engine.spec
```
This generates the executable in `python-core/dist/whisper-engine`.

### 3. Build the Tauri Application

Finally, build the installer (NSIS on Windows):

```bash
npm run tauri build
```
The final installer will be located in `src-tauri/target/release/bundle/`.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
