
import fs from "fs";
import path from "path";
import poppler from "pdf-poppler";

const retryRename = (oldPath, newPath, attempts = 5, delay = 200) => {
    return new Promise((resolve, reject) => {
        const tryRename = (retries) => {
            try {
                fs.renameSync(oldPath, newPath);
                resolve();
            } catch (error) {
                if (error.code === "EBUSY" && retries > 0) {
                    setTimeout(() => tryRename(retries - 1), delay);
                } else {
                    reject(error);
                }
            }
        };
        tryRename(attempts);
    });
};

const extractImagesFromPdf = async (pdfPath, outputDir) => {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const options = {
        format: "png",
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
        page: null,
    };

    try {
        await poppler.convert(pdfPath, options);

        const images = fs.readdirSync(outputDir).filter((file) => file.endsWith(".png"));


        images.sort((a, b) => {
            const numA = parseInt(a.replace(/[^\d]/g, ""));
            const numB = parseInt(b.replace(/[^\d]/g, ""));
            return numA - numB;
        });

        for (const [index, image] of images.entries()) {
            const oldPath = path.join(outputDir, image);
            const newPath = path.join(outputDir, `image_${index + 1}.png`);
            await retryRename(oldPath, newPath);
        }

        return images.length;
    } catch (error) {
        console.error("Error extracting images from PDF:", error.message);
        throw new Error("Failed to extract images from PDF.");
    }
};

export default extractImagesFromPdf;
