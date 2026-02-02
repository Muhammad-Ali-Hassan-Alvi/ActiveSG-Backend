// controllers/formSGController.js
// FIX 1: Import 'FormSG' directly (not { FormSGSdk })
const FormSG = require('@opengovsg/formsg-sdk');
const hubspot = require('@hubspot/api-client');

// FIX 2: Initialize using 'FormSG'
const formsg = new FormSG({ mode: 'test' });
const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

exports.handleSubmission = async (req, res) => {
    try {
        let submissionData = {};

        // --- DEV MODE: BYPASS DECRYPTION IF NO KEY ---
        if (process.env.FORMSG_SECRET_KEY === 'base64_secret_key_from_formsg_admin') {
            console.warn("⚠️ Using Mock Data (No Secret Key found)");
            submissionData = {
                'Title of Announcement': "Test Announcement (Mock)",
                'Content Body': "This is a test submission because we don't have the key yet."
            };
        } else {
            // --- PRODUCTION MODE ---
            formsg.webhooks.authenticate(req.header('X-FormSG-Signature'), process.env.FORMSG_WEBHOOK_URI);
            const decrypted = await formsg.crypto.decrypt(process.env.FORMSG_SECRET_KEY, req.body.data);

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
        res.status(200).json({ message: "Saved to HubSpot", id: result.id });

    } catch (error) {
        console.error("FormSG Handler Error:", error.message);
        res.status(200).json({ message: "Error handled" });
    }
};