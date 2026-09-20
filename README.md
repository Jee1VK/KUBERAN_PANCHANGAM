# Kuberan Panchangam

A downloadable, offline-capable application for precise South Indian Chandramana Panchangam calculations, powered by Swiss Ephemeris. Built with a Python FastAPI backend and a responsive HTML/JS frontend.

## Features
- **High Precision Astronomy:** Uses `pyswisseph` with Lahiri Ayanamsa.
- **Dynamic Geolocation:** Supports custom Lat/Lon or preset cities.
- **Multi-Person Compatibility:** Evaluate Tara Bala for up to 10 individuals to find the best dates for activities (Buying a car, Griha Pravesha, etc.).
- **Offline Capable:** Can be compiled into a standalone Windows executable.

## How to Run for Development
1. Install Python 3.9+
2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
3. Run the server:
   ```powershell
   python app.py
   ```
4. Open your browser and navigate to `http://localhost:8000`

## How to Build the Offline Downloadable App
To create a standalone application that users can download from GitHub and run completely offline (without needing Python installed), run the build script:

```powershell
.\build.ps1
```

This will use PyInstaller to compile the app into an executable located in the `dist/KuberanPanchangam/` folder. You can zip this folder and upload it to GitHub Releases. Users just extract it and double-click `KuberanPanchangam.exe`.
