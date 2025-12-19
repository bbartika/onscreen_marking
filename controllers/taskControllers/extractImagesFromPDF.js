import fs from 'fs';
import path from 'path';
import poppler from 'pdf-poppler';

const extractImagesFromPdf = async (pdfPath, outputDir) => {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const options = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
        page: null,
    };

    try {
        await poppler.convert(pdfPath, options);

        // Get all files in the output directory
        let files = fs.readdirSync(outputDir);

        // Log all files for debugging

        // Filter only PNG files and ensure they're valid
        let images = files
            .filter(file => file.endsWith('.png'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
                const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
                return numA - numB;
            });


        // Rename images sequentially
        const renamedImages = [];
        images.forEach((image, index) => {
            const oldPath = path.join(outputDir, image);
            const newPath = path.join(outputDir, `image_${index + 1}.png`);
            fs.renameSync(oldPath, newPath);
            renamedImages.push(`image_${index + 1}.png`);
        });

        return renamedImages;
    } catch (error) {
        console.error("Error extracting images from PDF:", error);
        throw new Error("Failed to extract images from PDF.");
    }
};

export default extractImagesFromPdf;
