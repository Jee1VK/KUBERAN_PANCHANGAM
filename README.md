# Kuberan Panchangam

A comprehensive, offline-first Progressive Web App (PWA) for accurate Vedic astrology and Panchangam calculations. Built entirely in JavaScript with a pure astronomical engine (Meeus/VSOP87 derivatives), it requires no external API calls for calculations.

## 🌟 Key Features

*   **Daily Panchangam:** Tithi, Nakshatra, Yoga, Karana, Vara with exact end times.
*   **Planetary Engine:** Real-time positions for Navagraha (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu) using Lahiri (Chitrapaksha) Ayanamsa.
*   **Muhurtham Tools:**
    *   **Auspicious Date Scanner:** Scan up to 90 days to find the best dates for marriage, business, travel, etc., with scoring 0-100.
    *   **Tarabalam & Chandrabalam:** Personalized daily transit scores based on your birth chart.
    *   **Daily Time Windows:** Rahu Kala, Yamaganda, Gulika, Abhijit, Brahma Muhurta.
    *   **Choghadiya & Hora:** Daily/nightly planetary hours and Choghadiya slots.
    *   **Gowri Panchangam:** 8-slot Karnataka tradition daily timing.
*   **Jathaka (Kundli) Generator:**
    *   Instant birth chart calculation.
    *   Full **Vimshottari Dasha** 120-year timeline with balance at birth.
    *   Local history storage (auto-deletes after 48h).
*   **Festivals & Vratas:**
    *   22 major Karnataka festivals & 7 recurring vratas (Ekadashi, Pradosha, Sankashti, etc.).
    *   Monthly calendar view with ICS export.
    *   Sankranti (solar ingress) detection.
*   **Bilingual UI:** English and Kannada toggle.
*   **Fully Offline:** PWA support, installable to home screen.

## 🛠️ Architecture

*   index.html: The core application (UI + JS Astronomical Engine).
*   sw.js: Service worker for offline caching.
*   manifest.json: Web app manifest.
*   **No dependencies:** Zero external JS libraries. Everything runs locally in the browser.

## 🚀 Deployment

The app is hosted on GitHub Pages:
[https://jee1vk.github.io/KUBERAN_PANCHANGAM/](https://jee1vk.github.io/KUBERAN_PANCHANGAM/)

To update, simply modify index.html, bump the version in sw.js, and push to the master branch.
