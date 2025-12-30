import fs from "fs";
import path from "path";
import { spawn } from "child_process";

/**
 * Extract PDF pages as PNG images using Poppler (pdftoppm)
 * @param {string} pdfPath - Absolute path to PDF file
 * @param {string} outputDir - Directory to save images
 * @returns {Promise<string[]>} - Array of image filenames in correct order
 */
const extractImagesFromPdf = (pdfPath, outputDir) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(pdfPath)) {
      return reject(new Error("PDF file does not exist"));
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPrefix = path.join(outputDir, "page");

    // 🔑 Spawn Poppler process
    const poppler = spawn("pdftoppm", [
      "-png",
      "-r",
      "300",        // DPI (high quality)
      pdfPath,
      outputPrefix
    ]);

    let stderr = "";

    poppler.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    poppler.on("error", (err) => {
      reject(new Error("Failed to start Poppler process"));
    });

    // ⏱ Safety timeout (optional but recommended)
    const timeout = setTimeout(() => {
      poppler.kill("SIGKILL");
      reject(new Error("Poppler process timed out"));
    }, 60_000);

    poppler.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        return reject(
          new Error(`Poppler failed with code ${code}: ${stderr}`)
        );
      }

      // Read generated images
      const files = fs
        .readdirSync(outputDir)
        .filter(
          (file) =>
            file.startsWith("page") && file.toLowerCase().endsWith(".png")
        )
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)[0], 10);
          const numB = parseInt(b.match(/\d+/)[0], 10);
          return numA - numB;
        });

      // Rename sequentially → image_1.png, image_2.png, ...
      const finalImages = [];

      files.forEach((file, index) => {
        const oldPath = path.join(outputDir, file);
        const newName = `image_${index + 1}.png`;
        const newPath = path.join(outputDir, newName);

        fs.renameSync(oldPath, newPath);
        finalImages.push(newName);
      });

      resolve(finalImages);
    });
  });
};

export default extractImagesFromPdf;