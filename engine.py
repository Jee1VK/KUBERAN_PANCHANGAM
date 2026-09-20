import swisseph as swe
import datetime
import math

# Constants
AYANAMSA_LAHIRI = swe.SIDM_LAHIRI

class VedicEngine:
    def __init__(self, year, month, day, hour, minute, lat, lon, altitude=0):
        self.lat = lat
        self.lon = lon
        self.altitude = altitude
        
        # Convert UTC/Local time to Julian Day
        utc_hours = hour + (minute / 60.0)
        self.julian_day = swe.julday(year, month, day, utc_hours)
        
        # Set Sidereal Mode to Lahiri (Standard for Ontikoppal/South Indian Panchangam)
        swe.set_sid_mode(AYANAMSA_LAHIRI)

    def get_ayanamsa(self):
        return swe.get_ayanamsa(self.julian_day)

    def get_sun_moon_longitude(self):
        # Sweph flags: Sidereal computation
        flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
        
        sun_res, _ = swe.calc_ut(self.julian_day, swe.SUN, flags)
        moon_res, _ = swe.calc_ut(self.julian_day, swe.MOON, flags)
        
        return sun_res[0], moon_res[0]  # Longitudes in degrees

    def calculate_tithi(self):
        sun_lon, moon_lon = self.get_sun_moon_longitude()
        diff = (moon_lon - sun_lon) % 360
        tithi_num = math.floor(diff / 12) + 1
        tithi_completion = ((diff % 12) / 12) * 100
        
        tithi_names = [
            "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", 
            "Shasthi", "Saptami", "Ashtami", "Navami", "Dashami", 
            "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"
        ]
        
        paksha = "Shukla Paksha" if diff < 180 else "Krishna Paksha"
        index = int((tithi_num - 1) % 15)
        name = tithi_names[index]
        if tithi_num == 30:
            name = "Amavasya"
        elif tithi_num == 15:
            name = "Purnima"

        return {
            "tithi_number": int(tithi_num),
            "paksha": paksha,
            "name": name,
            "completion_percentage": round(tithi_completion, 2)
        }

    def calculate_nakshatra(self, longitude=None):
        if longitude is None:
            _, longitude = self.get_sun_moon_longitude()
            
        nakshatra_degree = 360 / 27
        nakshatra_num = math.floor(longitude / nakshatra_degree) + 1
        pada = math.floor((longitude % nakshatra_degree) / (nakshatra_degree / 4)) + 1
        
        nakshatras = [
            "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
            "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
            "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
            "Moola", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
            "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
        ]
        
        return {
            "nakshatra_number": int(nakshatra_num),
            "name": nakshatras[int(nakshatra_num - 1)],
            "pada": int(pada)
        }

    def calculate_rashi(self, longitude=None):
        if longitude is None:
            _, longitude = self.get_sun_moon_longitude()
            
        rashi_num = math.floor(longitude / 30) + 1
        rashis = [
            "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", 
            "Karka (Cancer)", "Simha (Leo)", "Kanya (Virgo)", 
            "Tula (Libra)", "Vrischika (Scorpio)", "Dhanu (Sagittarius)", 
            "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"
        ]
        return {
            "rashi_number": int(rashi_num),
            "name": rashis[int(rashi_num - 1)]
        }

def calculate_tara_bala(birth_nakshatra_num, transit_nakshatra_num):
    count = (transit_nakshatra_num - birth_nakshatra_num + 27) % 27 + 1
    tara_category = count % 9
    if tara_category == 0:
        tara_category = 9
        
    tara_names = {
        1: ("Janma", "Neutral/Danger to body"),
        2: ("Sampat", "Very Favorable (Wealth/Prosperity)"),
        3: ("Vipat", "Unfavorable (Losses/Obstacles)"),
        4: ("Kshema", "Favorable (Well-being/Prosperity)"),
        5: ("Pratyak", "Unfavorable (Obstacles)"),
        6: ("Sadhana", "Very Favorable (Success/Goals)"),
        7: ("Naidhana", "Highly Unfavorable (Avoid)"),
        8: ("Mitra", "Favorable (Friendship/Support)"),
        9: ("Parama Mitra", "Extremely Favorable (Best Results)")
    }
    name, status = tara_names[tara_category]
    is_auspicious = tara_category in [2, 4, 6, 8, 9]
    return {"tara_number": tara_category, "name": name, "status": status, "is_auspicious": is_auspicious}

def evaluate_multi_person_compatibility(people_birth_data, target_date_nakshatra_num):
    results = []
    total_auspicious = 0
    
    for person in people_birth_data:
        tb = calculate_tara_bala(person['nakshatra_num'], target_date_nakshatra_num)
        if tb['is_auspicious']:
            total_auspicious += 1
        results.append({
            "person_name": person['name'],
            "tara_bala": tb
        })
        
    score_percentage = (total_auspicious / len(people_birth_data)) * 100 if people_birth_data else 0
    return {
        "overall_suitability_score": score_percentage,
        "is_recommended": score_percentage >= 70.0,
        "person_breakdown": results
    }
