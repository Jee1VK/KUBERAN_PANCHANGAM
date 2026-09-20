# KUBERAN PANCHANGAM - App Specification

## 1. Domain Knowledge: What is a Panchangam?
A Panchangam is a traditional Hindu astrological and astronomical almanac. It tracks the daily movements of celestial bodies (primarily the Sun and the Moon) to determine exact timings of festivals, rituals, agricultural cycles, and auspicious moments (Muhurtham). A traditional Vedic day begins at Sunrise and ends at the next Sunrise.

### The Five Limbs (Pancha-Anga)
1. **Tithi (Lunar Day):** The longitudinal angle between the Sun and the Moon. A new Tithi begins every time the Moon gains exactly 12 degrees on the Sun.
2. **Vara (Weekday):** The 7 days of the week, named after celestial bodies (e.g., Ravi-vara for Sunday).
3. **Nakshatra (Lunar Mansion/Constellation):** The position of the Moon against the backdrop of 27 fixed constellations. Each Nakshatra covers 13 degrees and 20 minutes.
4. **Yoga (Luni-Solar Day):** A calculation based on the sum of the longitudes of the Sun and the Moon. There are 27 Yogas.
5. **Karana (Half-Tithi):** Exactly half of a Tithi (6 degrees of separation).

## 2. Daily Astrological Timings
- **Rahu Kalam:** A roughly 90-minute daily window considered highly inauspicious for starting anything new.
- **Yamagandam:** Another inauspicious 90-minute window, second in severity to Rahu Kalam.
- **Gulika Kalam:** An auspicious 90-minute window. Good for wealth-building, bad for things like funerals.
- **Abhijit Muhurtham:** The most powerful auspicious 45-minute window peaking at exactly local astronomical noon.

## 3. Ontikoppal Panchanga: Specific Domain Context
The app must align with the regional parameters of the Ontikoppal Panchanga, a highly trusted, 125+ year-old Kannada almanac rooted in the old Mysuru region.
- **Calendar System:** Chandramana (Lunar) system combined with Amavasyant logic.
- **60-Year Samvatsara Cycle:** Tracks the Jovian years (Jupiter's movement) using 60 repeating names (e.g., Shobhakrut, Krodhi).
- **Key Features:** Muhurthams (Upanayanam, Griha Pravesha, Namakarana), Vratas & Utsavams (Sankashti Chaturthi, Ekadashi), Rashi Phala.

## 4. System Logic & Development Rules
- **Timezone Dependency:** Always anchor Tithi/Nakshatra calculations to the user's specific local Sunrise time.
- **Kshaya & Vriddhi Rule:** Account for skipped (Kshaya) and repeated (Vriddhi) Tithis relative to the sunrise.
- **Ontikoppal Compliance:** Default language output terms to Kannada variations (e.g., Amavasya, Rahu Kala) and prioritize Karnataka regional festival dates (e.g., Ugadi).

## 5. Engine Specs
The app will compute values astronomically (using Drik Ganita, e.g., Swiss Ephemeris) rather than simply scraping festival dates. It must store every time value as an absolute instant (UTC) and render it in the location's timezone.
