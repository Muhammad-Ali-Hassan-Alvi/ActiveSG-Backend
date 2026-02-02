const axios = require('axios');

exports.searchLocation = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: "Missing query parameter" });

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
                'Authorization': process.env.ONEMAP_TOKEN
            }
        };

        const response = await axios(config);
        res.json(response.data);

    } catch (error) {
        console.error("OneMap Error:", error.message);
        res.status(500).json({ error: "OneMap Search Failed" });
    }
};