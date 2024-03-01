// interface GDALTResult {
//     url;
//     url_mobile;
//     title;
//     seendate;
//     socialimage;
//     domain;
//     language;
//     sourcecountry;
// }

async function gdelt_project_query(
    term: any,
    start_date: any, // YYYYMMDDHHMMSS
    end_date: any, // YYYYMMDDHHMMSS
    max_records = 25,
    format = 'json'
) {
    const axios = require('axios');
    function dateStr(str: any) {
        str = str.replaceAll('-', '');
        str = str.replaceAll(':', '');
        str = str.replaceAll(' ', '');
        return str
    }
    if (!start_date) { // set to 24 hours ago YYYYMMDDHHMMSS
        const date = new Date();
        date.setDate(date.getDate() - 1);
        start_date = dateStr(date.toISOString().slice(0, 19).replace('T', ' '));
    }
    if (!end_date) { // set to now YYYYMMDDHHMMSS
        const date = new Date();
        end_date = dateStr(date.toISOString().slice(0, 19).replace('T', ' '));
    }
    // Build the URL.
    let url = 'https://api.gdeltproject.org/api/v2/doc/doc';
    url += '?query=' + term;
    url += '&mode=artlist';
    url += '&maxrecords=' + max_records.toString();
    url += '&startdatetime=' + start_date;
    url += '&enddatetime=' + end_date;
    url += '&format=' + format;
    try {
        // Query the API.
        const response = await axios.get(url);
        return response.data.articles
    } catch (error) {
        console.error('Error querying GDELT Project:', error);
        throw error;
    }
}

async function search_gdelt(term: any, options: any) {
    function cleanDate(d: any) {
        d = d.replaceAll('-', '');
        d = d.replaceAll(':', '');
        d = d.replaceAll(' ', '');
        d = d.replaceAll('T', '');
        return d
    }
    if (!options) {
        const now = new Date();
        let yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        options = {
            start_date: cleanDate(yesterday.toISOString().slice(0, 19)),
            end_date: cleanDate(now.toISOString().slice(0, 19)),
            max_records: 250,
            format: 'json'
        }
    }
    // get data from gdelt
    return gdelt_project_query(term, options.start_date, options.end_date, options.max_records, options.format);
}

module.exports = {
    enabled: false,
    tools: {
        search_GDELT: { 
            schema: {
                type: "function",
                function: {
                    name: "search_GDELT",
                    description: "search the GDALT website using the given query",
                    parameters: {
                        type: "object",
                        properties: {
                            term: {
                                type: "string",
                                description: "The query to search for"
                            },
                            start_date: {
                                type: "string",
                                description: "The start date to search for"
                            },
                            end_date: {
                                type: "string",
                                description: "The end date to search for"
                            },
                            max_records: {
                                type: "number",
                                description: "The max number of records to return"
                            },
                            format: {
                                type: "string",
                                description: "The format of the results e.g. json, csv, etc."
                            }
                        },
                        required: ["term"]
                    }
                }
            },
            action: async ({ term, start_date, end_date, max_records, format }: any) => {
            try {
                const results = await search_gdelt(term, { start_date, end_date, max_records, format });
                const res = JSON.stringify(results);
                return res;
            } catch (error: any) {
                return error.message;
            }
        }}
    }
}
export default module.exports;