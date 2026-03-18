<div align="center">
  <img src="public/logo.png" alt="WhisperHook Logo" width="120" />

  # 🎙️ WhisperHook

  **System-wide, privacy-focused voice typing powered by local AI.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  ![Windows](https://img.shields.io/badge/Windows-0078D6?style=flat&logo=windows&logoColor=white)
  ![Linux](https://img.shields.io/badge/Linux-FCC624?style=flat&logo=linux&logoColor=black)
  ![macOS](https://img.shields.io/badge/macOS-000000?style=flat&logo=apple&logoColor=white)
  
  *Dictate anywhere. Instant transcription. Total privacy.*

</div>

![WhisperHook Banner](public/banner.png)

***

Welcome to **WhisperHook**! Say goodbye to tedious typing and privacy concerns. WhisperHook is a blazing-fast, cross-platform dictation tool that uses local machine learning models directly on your device. Just press a hotkey from **any** application on your computer, speak, and watch your words magically appear on screen. 🚀

If you love WhisperHook, please consider giving it a ⭐ on GitHub!

## ✨ Why WhisperHook?
- **🔐 100% Local & Private:** Your voice never leaves your computer. Powered by the incredibly fast `faster-whisper`, everything processes offline. 
- **⚡ System-Wide Integration:** Works out of the box with your browser, Word, IDEs, or anything else.
- **🎤 Zero-Friction Dictation:** 
  - **Push-to-Talk:** Hold `Ctrl+Shift+M` to accurately transcribe paragraphs in one go.
  - **Real-Time:** Toggle once and seamlessly speak naturally, powered by state-of-the-art Voice Activity Detection (VAD).
- **🎨 Unobtrusive Design:** The app lives quietly in your system tray with a neat, floating indicator showing transcription status.
- **⚙️ Highly Customizable:** Choose your optimal Whisper model (tiny to medium), hardware execution (CPU/CUDA), and language!

***

## 🚀 Installation & Getting Started

### 📥 1. Download Release
The easiest way to start is by heading over to our [Releases page](https://github.com/arieldeibe/local-whisper/releases) and downloading the latest installer.

### ⚡ 2. One-Line Install (Windows)
Enjoy a seamless installation with PowerShell (Run as Administrator):
```powershell
irm https://raw.githubusercontent.com/arieldeibe/local-whisper/main/scripts/install.ps1 | iex
```

### 🎮 3. How to Use
1. **Launch:** Open WhisperHook. A small microphone icon will appear in your system tray.
2. **Configure:** Right-click the tray icon to access **Settings** and select your preferred AI model, device, and language.
3. **Focus:** Click on any text field anywhere in your system.
4. **Speak:** Press `Ctrl+Shift+M` and start talking!

***

## 🛠️ Tech Stack & Architecture

Built with modern, blazing fast technologies:
- **UI / Frontend**: React 19, TypeScript, Vite, Tailwind CSS (v4)
- **Desktop System Engine**: Tauri v2 🦀 (Rust), `enigo` (for macro-less keyboard simulation), `tauri-plugin-global-shortcut`
- **Transcription Brain**: Python 🐍, `faster-whisper`, `silero-vad`, `sounddevice`

***

## 👨‍💻 Local Development Setup

Want to modify WhisperHook or run it from source? Follow these simple steps:

### Prerequisites
1. **Node.js** (v18+)
2. **Rust** and Cargo installed (`rustup`)
3. **Python** (3.10+)

### 1. Python Environment Setup
The application spins up a local Python process (sidecar pattern). You need to prepare the Python virtual environment that holds the transcription dependencies:

```bash
cd python-core
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
# Return to the project root
npm install
```

### 3. Run Development Mode
```bash
npm run tauri dev
```
This will compile the Rust backend, bundle the React frontend, and boot up the application. The App will automatically invoke the local Python script for audio transcription when the shortcut is used! 🎉

***

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 
Feel free to check [issues page](https://github.com/arieldeibe/local-whisper/issues).

## 📄 License
This project is licensed under the [MIT License](LICENSE).
