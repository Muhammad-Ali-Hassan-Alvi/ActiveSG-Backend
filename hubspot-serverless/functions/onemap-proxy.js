const axios = require('axios');

exports.main = async (context, sendResponse) => {
    try {
        const query = (context.params && context.params.q) ? context.params.q[0] : null;

        if (!query) {
            sendResponse({
                statusCode: 400,
                body: { error: "Missing query parameter" }
            });
            return;
        }

        const config = {
            method: 'get',
            url: `https://www.onemap.gov.sg/api/common/elastic/search`,
            params: {
                searchVal: query,
                returnGeom: 'Y',
                getAddrDetails: 'Y',
                pageNum: 1
            },
            headers: {
                // Should use Secret for token if it's private, or process.env if public enough
                'Authorization': process.env.ONEMAP_TOKEN || ''
            }
        };

        const response = await axios(config);

        sendResponse({
            statusCode: 200,
            body: response.data
        });

    } catch (error) {
        console.error("OneMap Error:", error.message);
        sendResponse({
            statusCode: 500,
            body: { error: "OneMap Search Failed" }
        });
    }
};
