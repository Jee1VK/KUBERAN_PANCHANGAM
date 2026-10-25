// ============================================================
//  js/cities.js — Offline City Database & Instant Autocomplete
//  Includes Karnataka district/temple towns, Indian metros,
//  and global diaspora hubs.
// ============================================================

const CITIES_DATABASE = [
    { name: "Bengaluru, Karnataka", nameKn: "ಬೆಂಗಳೂರು", state: "Karnataka", lat: 12.9716, lon: 77.5946, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Mysuru, Karnataka", nameKn: "ಮೈಸೂರು", state: "Karnataka", lat: 12.2958, lon: 76.6394, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Hubballi, Karnataka", nameKn: "ಹುಬ್ಬಳ್ಳಿ", state: "Karnataka", lat: 15.3647, lon: 75.1240, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Mangaluru, Karnataka", nameKn: "ಮಂಗಳೂರು", state: "Karnataka", lat: 12.9141, lon: 74.8560, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Udupi, Karnataka", nameKn: "ಉಡುಪಿ", state: "Karnataka", lat: 13.3409, lon: 74.7421, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Shivamogga, Karnataka", nameKn: "ಶಿವಮೊಗ್ಗ", state: "Karnataka", lat: 13.9299, lon: 75.5681, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Belagavi, Karnataka", nameKn: "ಬೆಳಗಾವಿ", state: "Karnataka", lat: 15.8497, lon: 74.4977, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Kalaburagi, Karnataka", nameKn: "ಕಲಬುರಗಿ", state: "Karnataka", lat: 17.3297, lon: 76.8343, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Davanagere, Karnataka", nameKn: "ದಾವಣಗೆರೆ", state: "Karnataka", lat: 14.4644, lon: 75.9218, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Ballari, Karnataka", nameKn: "ಬಳ್ಳಾರಿ", state: "Karnataka", lat: 15.1394, lon: 76.9214, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Tumakuru, Karnataka", nameKn: "ತುಮಕೂರು", state: "Karnataka", lat: 13.3379, lon: 77.1173, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Hassan, Karnataka", nameKn: "ಹಾಸನ", state: "Karnataka", lat: 13.0033, lon: 76.1004, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Chikkamagaluru, Karnataka", nameKn: "ಚಿಕ್ಕಮಗಳೂರು", state: "Karnataka", lat: 13.3161, lon: 75.7720, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Mandya, Karnataka", nameKn: "ಮಂಡ್ಯ", state: "Karnataka", lat: 12.5218, lon: 76.8951, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Dharwad, Karnataka", nameKn: "ಧಾರವಾಡ", state: "Karnataka", lat: 15.4589, lon: 75.0078, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Vijayapura, Karnataka", nameKn: "ವಿಜಯಪುರ", state: "Karnataka", lat: 16.8302, lon: 75.7100, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Raichur, Karnataka", nameKn: "ರಾಯಚೂರು", state: "Karnataka", lat: 16.2076, lon: 77.3463, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Chitradurga, Karnataka", nameKn: "ಚಿತ್ರದುರ್ಗ", state: "Karnataka", lat: 14.2251, lon: 76.3980, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Kolar, Karnataka", nameKn: "ಕೋಲಾರ", state: "Karnataka", lat: 13.1362, lon: 78.1291, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Sringeri, Karnataka", nameKn: "ಶೃಂಗೇರಿ", state: "Karnataka", lat: 13.4198, lon: 75.2567, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Dharmasthala, Karnataka", nameKn: "ಧರ್ಮಸ್ಥಳ", state: "Karnataka", lat: 12.9538, lon: 75.3809, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Kukke Subrahmanya, Karnataka", nameKn: "ಕುಕ್ಕೆ ಸುಬ್ರಹ್ಮಣ್ಯ", state: "Karnataka", lat: 12.6639, lon: 75.6156, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Gokarna, Karnataka", nameKn: "ಗೋಕರ್ಣ", state: "Karnataka", lat: 14.5479, lon: 74.3188, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Melukote, Karnataka", nameKn: "ಮೇಲುಕೋಟೆ", state: "Karnataka", lat: 12.6611, lon: 76.6475, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Mantralayam, Andhra Pradesh", nameKn: "ಮಂತ್ರಾಲಯ", state: "Andhra Pradesh", lat: 15.9392, lon: 77.4264, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Tirupati, Andhra Pradesh", nameKn: "ತಿರುಪತಿ", state: "Andhra Pradesh", lat: 13.6288, lon: 79.4192, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Chennai, Tamil Nadu", nameKn: "ಚೆನ್ನೈ", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Salem, Tamil Nadu", nameKn: "ಸೇಲಂ", state: "Tamil Nadu", lat: 11.6643, lon: 78.1460, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Coimbatore, Tamil Nadu", nameKn: "ಕೊಯಮತ್ತೂರು", state: "Tamil Nadu", lat: 11.0168, lon: 76.9558, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Hyderabad, Telangana", nameKn: "ಹೈದರಾಬಾದ್", state: "Telangana", lat: 17.3850, lon: 78.4867, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Kochi, Kerala", nameKn: "ಕೊಚ್ಚಿ", state: "Kerala", lat: 9.9312, lon: 76.2673, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Mumbai, Maharashtra", nameKn: "ಮುಂಬೈ", state: "Maharashtra", lat: 19.0760, lon: 72.8777, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Pune, Maharashtra", nameKn: "ಪುಣೆ", state: "Maharashtra", lat: 18.5204, lon: 73.8567, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "New Delhi, Delhi", nameKn: "ನವದೆಹಲಿ", state: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Kolkata, West Bengal", nameKn: "ಕೋಲ್ಕತ್ತಾ", state: "West Bengal", lat: 22.5726, lon: 88.3639, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Ahmedabad, Gujarat", nameKn: "ಅಹಮದಾಬಾದ್", state: "Gujarat", lat: 23.0225, lon: 72.5714, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "Varanasi, Uttar Pradesh", nameKn: "ವಾರಣಾಸಿ (ಕಾಶಿ)", state: "Uttar Pradesh", lat: 25.3176, lon: 82.9739, tz: 5.5, tzName: "Asia/Kolkata" },
    { name: "New Jersey, USA", nameKn: "ನ್ಯೂ ಜೆರ್ಸಿ", state: "USA", lat: 40.0583, lon: -74.4057, tz: -5.0, tzName: "America/New_York" },
    { name: "San Jose / Bay Area, USA", nameKn: "ಸ್ಯಾನ್ ಜೋಸ್", state: "USA", lat: 37.3382, lon: -121.8863, tz: -8.0, tzName: "America/Los_Angeles" },
    { name: "Dallas, USA", nameKn: "ಡಲ್ಲಾಸ್", state: "USA", lat: 32.7767, lon: -96.7970, tz: -6.0, tzName: "America/Chicago" },
    { name: "London, UK", nameKn: "ಲಂಡನ್", state: "UK", lat: 51.5074, lon: -0.1278, tz: 0.0, tzName: "Europe/London" },
    { name: "Dubai, UAE", nameKn: "ದುಬೈ", state: "UAE", lat: 25.2048, lon: 55.2708, tz: 4.0, tzName: "Asia/Dubai" },
    { name: "Singapore", nameKn: "ಸಿಂಗಾಪುರ", state: "Singapore", lat: 1.3521, lon: 103.8198, tz: 8.0, tzName: "Asia/Singapore" },
    { name: "Sydney, Australia", nameKn: "ಸಿಡ್ನಿ", state: "Australia", lat: -33.8688, lon: 151.2093, tz: 10.0, tzName: "Australia/Sydney" },
    { name: "Toronto, Canada", nameKn: "ಟೊರೊಂಟೊ", state: "Canada", lat: 43.6532, lon: -79.3832, tz: -5.0, tzName: "America/Toronto" }
];

function searchCities(query) {
    if (!query || query.trim() === "") return CITIES_DATABASE.slice(0, 5);
    const q = query.trim().toLowerCase();
    return CITIES_DATABASE.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.nameKn && c.nameKn.includes(q))
    );
}

if (typeof window !== 'undefined') {
    window.CITIES_DATABASE = CITIES_DATABASE;
    window.searchCities = searchCities;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CITIES_DATABASE,
        searchCities
    };
}
