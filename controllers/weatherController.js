const axios = require('axios');

// Client's specific list of bad weather conditions
const RAIN_CONDITIONS = [
    "Light Rain", "Moderate Rain", "Heavy Rain", "Passing Showers",
    "Light Showers", "Showers", "Heavy Showers", "Thundery Showers",
    "Heavy Thundery Showers", "Heavy Thundery Showers with Gusty Winds"
];

exports.checkRain = async (req, res) => {
    try {
        // 1. Fetch Data from NEA
        const response = await axios.get(process.env.NEA_API_URL);
        const items = response.data.items[0]; // Get latest forecast
        const forecasts = items.forecasts;

        // 2. Determine User Location (Default to 'City' if not provided)
        // You can make this smarter later by passing lat/long from OneMap
        const userArea = req.query.area || "City";

        // 3. Find forecast for that area
        const locationData = forecasts.find(f => f.area.toLowerCase().includes(userArea.toLowerCase()));

        let showBanner = false;
        let weatherStatus = "Cloudy";

        if (locationData) {
            weatherStatus = locationData.forecast;
            // Check if the forecast matches any of the bad weather keywords
            if (RAIN_CONDITIONS.includes(weatherStatus)) {
                showBanner = true;
            }
        }

        res.json({
            area: userArea,
            forecast: weatherStatus,
            showAlert: showBanner,
            message: showBanner ? `Weather Alert: ${weatherStatus} expected in ${userArea}.` : "Weather is okay."
        });

    } catch (error) {
        console.error("Weather API Error:", error.message);
        res.status(500).json({ error: "Failed to fetch weather" });
    }
};