const { google } = require('googleapis');
const hubspot = require('@hubspot/api-client');
const path = require('path'); // Required to find the file

exports.syncFacilities = async (req, res) => {
    try {
        console.log("--> Starting Google Sync...");

        // 1. Authenticate using the FILE (Fixes the DECODER error)
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, '../google-credentials.json'), // Reads the file you added
            scopes: ['https://www.googleapis.com/auth/business.manage'],
        });

        const mybusiness = google.mybusinessbusinessinformation({ version: 'v1', auth });
        const accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth });

        // 2. Get Account ID
        const accountsRes = await accountManagement.accounts.list();
        if (!accountsRes.data.accounts) throw new Error("No Google Business Account found.");
        const accountId = accountsRes.data.accounts[0].name;

        // 3. Get Locations with SPECIFIC FIELDS
        const locationsRes = await mybusiness.accounts.locations.list({
            parent: accountId,
            readMask: "name,title,storeCode,regularHours,specialHours,attributes"
        });

        const locations = locationsRes.data.locations || [];
        const syncLog = [];

        // 4. Loop through every Gym/Pool
        for (const loc of locations) {

            // --- A. FORMAT OPENING HOURS ---
            let hoursText = "Info Unavailable";
            if (loc.regularHours && loc.regularHours.periods) {
                hoursText = loc.regularHours.periods.map(p => {
                    const day = p.openDay;
                    const open = `${p.openTime.hours}:${(p.openTime.minutes || 0).toString().padStart(2, '0')}`;
                    const close = `${p.closeTime.hours}:${(p.closeTime.minutes || 0).toString().padStart(2, '0')}`;
                    return `${day}: ${open} - ${close}`;
                }).join('\n');
            }

            // --- B. FORMAT ADHOC CLOSURES ---
            let specialHoursText = "No Upcoming Closures";
            if (loc.specialHours && loc.specialHours.specialHourPeriods) {
                specialHoursText = loc.specialHours.specialHourPeriods.map(p => {
                    const date = `${p.startDate.day}/${p.startDate.month}/${p.startDate.year}`;
                    if (p.isClosed) return `${date}: CLOSED`;
                    return `${date}: OPEN`;
                }).join('\n');
            }

            // --- C. FORMAT AMENITIES ---
            let amenitiesList = "None Listed";
            if (loc.attributes) {
                amenitiesList = loc.attributes
                    .filter(attr => attr.values && attr.values.includes(true) || attr.valueType === 'BOOL')
                    .map(attr => formatAttributeName(attr.attributeId))
                    .join(', ');
            }

            syncLog.push({
                gym: loc.title,
                hours: hoursText,
                closures: specialHoursText,
                amenities: amenitiesList
            });
        }

        res.json({ status: "Synced", results: syncLog });

    } catch (error) {
        console.error("Sync Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// Helper function
function formatAttributeName(id) {
    if (!id) return "";
    return id
        .replace('has_', '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}