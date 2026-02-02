const axios = require('axios');
const crypto = require('crypto');

exports.getRecommendations = async (req, res) => {
    try {
        const { userEmail, userSessionId } = req.body;

        console.log("--> 1. Received Recommendation Request");

        // --- SECURITY STEP: HASHING PII ---
        let hashedUserId = null;
        if (userEmail) {
            hashedUserId = crypto.createHash('sha256').update(userEmail).digest('hex');
            console.log(`--> 2. Securely Hashed Email: ${hashedUserId.substring(0, 10)}...`);
        }

        // --- PREPARE API PAYLOAD ---
        const payload = {
            placement_id: process.env.SEARCHSG_BANNER_ID,
            user_id: hashedUserId,
            session_id: userSessionId || "anon_session",
            num_results: 4
        };

        let results = [];
        const currentKey = process.env.SEARCHSG_API_KEY || "";

        // --- THE FIX: Better check for Mock Mode ---
        // If the key is empty OR contains the word "your_searchsg_key", use Mock Data
        if (!currentKey || currentKey.includes('your_searchsg_key')) {
            console.warn("⚠️ No Real API Key detected. Using Mock Data Rules.");

            // SIMULATING THE LOGIC:
            if (hashedUserId) {
                // Scenario: Returning User
                results = [
                    { title: "Your Badminton Bookings", type: "Personalized", url: "https://activesg.gov.sg/bookings" },
                    { title: "Recommended: Tennis for Beginners", type: "Personalized", url: "https://activesg.gov.sg/tennis" }
                ];
            } else {
                // Scenario: New User
                results = [
                    { title: "Welcome to ActiveSG - Sign Up", type: "Generic", url: "https://activesg.gov.sg/signup" },
                    { title: "Facility Rules & Regulations", type: "Generic", url: "https://activesg.gov.sg/rules" }
                ];
            }
        } else {
            // --- REAL API CALL (Only runs if you have a real key) ---
            console.log("--> Calling Real SearchSG API...");
            const response = await axios.post(process.env.SEARCHSG_ENDPOINT, payload, {
                headers: { 'Authorization': `Bearer ${currentKey}` }
            });
            results = response.data.results;
        }

        // --- RETURN CLEAN DATA ---
        res.json({
            status: "success",
            user_type: hashedUserId ? "returning" : "new",
            banner_used: process.env.SEARCHSG_BANNER_ID,
            data: results
        });

    } catch (error) {
        console.error("Recommendation Error:", error.message);
        // If the real API fails (e.g. 403), we catch it here and return a safe error
        res.status(500).json({ error: "Failed to fetch recommendations" });
    }
};