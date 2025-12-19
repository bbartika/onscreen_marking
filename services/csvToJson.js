import csv from 'csv-parser';
import fs from 'fs';

const csvToJson = async (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const csvStream = fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

export default csvToJson;