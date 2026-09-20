Write-Host "Installing requirements..."
pip install -r requirements.txt
pip install pyinstaller

Write-Host "Building offline executable..."
# Clean previous builds
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }

# Build using PyInstaller
# --add-data "static;static" ensures the frontend files are included
pyinstaller --name "KuberanPanchangam" --add-data "static;static" --windowed app.py

Write-Host "Build complete! Check the 'dist/KuberanPanchangam' folder."
