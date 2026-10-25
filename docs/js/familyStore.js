// ============================================================
//  js/familyStore.js — Family Profile & localStorage Store
//  Saves family members' birth details locally on device for
//  1-tap Muhurtha Tarabala/Chandrabala, Rashifal & Jathaka.
// ============================================================

const STORAGE_KEY = 'kuberan_panchangam_family_profiles_v1';

function getFamilyProfiles() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Error reading family profiles from localStorage", e);
        return [];
    }
}

function saveFamilyProfile(profile) {
    const profiles = getFamilyProfiles();
    const newProfile = {
        id: profile.id || ('fam_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        name: (profile.name || 'Family Member').trim(),
        relation: profile.relation || 'Family Member',
        birthDate: profile.birthDate || '',
        birthTime: profile.birthTime || '',
        dobStrRaw: profile.dobStrRaw || (profile.birthDate && profile.birthTime ? `${profile.birthDate}T${profile.birthTime}` : (profile.birthDate || '')),
        rashi: typeof profile.rashi === 'number' ? profile.rashi : parseInt(profile.rashi || 0, 10),         // 0: Mesha to 11: Meena
        nakshatra: typeof profile.nakshatra === 'number' ? profile.nakshatra : parseInt(profile.nakshatra || 1, 10), // 1 to 27
        pada: profile.pada || 1,
        lat: profile.lat || 12.9716,
        lon: profile.lon || 77.5946,
        tz: profile.tz || 'Asia/Kolkata',
        placeName: profile.placeName || 'Bengaluru, Karnataka'
    };
    // Avoid exact duplicate name+relation overwrite: update if same name exists
    const existingIdx = profiles.findIndex(p => p.name.toLowerCase() === newProfile.name.toLowerCase());
    if (existingIdx >= 0) {
        newProfile.id = profiles[existingIdx].id;
        profiles[existingIdx] = newProfile;
    } else {
        profiles.push(newProfile);
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
        console.error("Error saving family profile to localStorage", e);
    }
    return profiles;
}

function deleteFamilyProfile(id) {
    let profiles = getFamilyProfiles();
    profiles = profiles.filter(p => p.id !== id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
        console.error("Error deleting family profile from localStorage", e);
    }
    return profiles;
}

if (typeof window !== 'undefined') {
    window.FAMILY_STORAGE_KEY = STORAGE_KEY;
    window.getFamilyProfiles = getFamilyProfiles;
    window.saveFamilyProfile = saveFamilyProfile;
    window.deleteFamilyProfile = deleteFamilyProfile;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORAGE_KEY,
        getFamilyProfiles,
        saveFamilyProfile,
        deleteFamilyProfile
    };
}
