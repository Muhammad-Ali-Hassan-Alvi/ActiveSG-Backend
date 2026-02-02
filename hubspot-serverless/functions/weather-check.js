const axios = require('axios');

// Client's specific list of bad weather conditions
const RAIN_CONDITIONS = [
    "Light Rain", "Moderate Rain", "Heavy Rain", "Passing Showers",
    "Light Showers", "Showers", "Heavy Showers", "Thundery Showers",
    "Heavy Thundery Showers", "Heavy Thundery Showers with Gusty Winds"
];

exports.main = async (context, sendResponse) => {
    try {
        // 1. Fetch Data from NEA
        // Ensure NEA_API_URL is set in secrets or hardcode if public
        // Defaulting to a known public one if env is missing, or expect it in Env
        const neaUrl = process.env.NEA_API_URL || "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast";
        const response = await axios.get(neaUrl);
        const items = response.data.items[0]; // Get latest forecast
        const forecasts = items.forecasts;

        // 2. Determine User Location
        // In Serverless, query parameters are in context.params
        const userArea = (context.params && context.params.area) ? context.params.area[0] : "City";

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

        sendResponse({
            statusCode: 200,
            body: {
                area: userArea,
                forecast: weatherStatus,
                showAlert: showBanner,
                message: showBanner ? `Weather Alert: ${weatherStatus} expected in ${userArea}.` : "Weather is okay."
            }
        });

    } catch (error) {
        console.error("Weather API Error:", error.message);
        sendResponse({
            statusCode: 500,
            body: { error: "Failed to fetch weather" }
        });
    }
};
