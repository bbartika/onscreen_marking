import { Parser } from "json2csv";
function convertJSONToCSV(jsonData) {
    try {
        const parser = new Parser();
        const csvData = parser.parse(jsonData);
        return csvData;
    } catch (error) {
        console.error("Error converting JSON to CSV:", error);
        return null;
    }
}

export default convertJSONToCSV;