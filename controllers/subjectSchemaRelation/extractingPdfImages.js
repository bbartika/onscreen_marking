import fs from 'fs';
import path from 'path';
import poppler from 'pdf-poppler';


/* -------------------------------------------------------------------------- */
/*                             EXTRACT PDF IMAGES                             */
/* -------------------------------------------------------------------------- */
const extractImagesFromPdf = async (pdfPath, outputDir) => {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const options = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
        page: null
    };

    try {
        await poppler.convert(pdfPath, options);

        const images = fs.readdirSync(outputDir);

        images.forEach((image, index) => {
            const oldPath = path.join(outputDir, image);
            const newPath = path.join(outputDir, `image_${index + 1}.png`);
            fs.renameSync(oldPath, newPath);
        });

        return images.length;
    } catch (error) {
        console.error("Error extracting images from PDF:", error);
        throw new Error("Failed to extract images from PDF.");
    }
};



export default extractImagesFromPdf;
