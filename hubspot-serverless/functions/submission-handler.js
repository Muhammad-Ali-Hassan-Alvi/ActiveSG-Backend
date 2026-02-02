const FormSG = require('@opengovsg/formsg-sdk');
const hubspot = require('@hubspot/api-client');

// Initialize outside main execution if possible, or inside if cold starts are an issue.
// For Serverless, caching client might be useful but safe to init inside for simplicity.
const formsg = new FormSG({ mode: 'test' });

exports.main = async (context, sendResponse) => {
    const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

    try {
        let submissionData = {};

        // In HubSpot Serverless, headers are available in context.headers
        const signature = context.headers['X-FormSG-Signature'] || context.headers['x-formsg-signature'];

        // --- DEV MODE: BYPASS DECRYPTION IF NO KEY ---
        if (process.env.FORMSG_SECRET_KEY === 'base64_secret_key_from_formsg_admin') {
            console.warn("⚠️ Using Mock Data (No Secret Key found)");
            submissionData = {
                'Title of Announcement': "Test Announcement (Mock)",
                'Content Body': "This is a test submission because we don't have the key yet."
            };
        } else {
            // --- PRODUCTION MODE ---
            // context.body is typically an object if parsed, but FormSG needs the raw signature verification sometimes.
            // However, the SDK usually handles objects too if we pass them correctly.
            // Important: formsg-sdk verifies signature against the URI. 
            // In Serverless, we might need to rely on the body being correct.

            formsg.webhooks.authenticate(signature, process.env.FORMSG_WEBHOOK_URI);

            // Depending on how HubSpot passes the body, it might be an object or string.
            // context.body is usually the parsed JSON body.
            const decrypted = await formsg.crypto.decrypt(process.env.FORMSG_SECRET_KEY, context.body.data);

            // Map answers to keys
            decrypted.responses.forEach(r => {
                submissionData[r.question] = r.answer;
            });
        }

        // --- PUSH TO HUBSPOT ---
        const result = await hubspotClient.crm.objects.basicApi.create('2-224676800', {
            properties: {
                // Internal names must match what you create in HubSpot
                title: submissionData['Title of Announcement'] || "Untitled",
                details: submissionData['Content Body'] || "",
                status: 'Draft'
            }
        });

        console.log("✅ Announcement Created in HubSpot:", result.id);

        sendResponse({
            statusCode: 200,
            body: { message: "Saved to HubSpot", id: result.id }
        });

    } catch (error) {
        console.error("FormSG Handler Error:", error.message);
        sendResponse({
            statusCode: 200, // Return 200 even on error to prevent webhook retries if not needed
            body: { message: "Error handled", error: error.message }
        });
    }
};
