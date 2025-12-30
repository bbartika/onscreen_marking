import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const extractImagesFromPdf = (pdfPath, outputDir) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(pdfPath)) {
      return reject(new Error("PDF file not found"));
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPrefix = path.join(outputDir, "page");

    const poppler = spawn("pdftoppm", [
      "-png",
      "-r",
      "300",      // high quality DPI
      pdfPath,
      outputPrefix,
    ]);

    let stderr = "";

    poppler.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    poppler.on("error", () => {
      reject(new Error("Failed to start Poppler process"));
    });

    poppler.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`Poppler failed with code ${code}: ${stderr}`)
        );
      }

      const images = fs
        .readdirSync(outputDir)
        .filter(
          (file) =>
            file.startsWith("page") && file.toLowerCase().endsWith(".png")
        )
        .sort((a, b) => {
          const nA = parseInt(a.match(/\d+/)[0], 10);
          const nB = parseInt(b.match(/\d+/)[0], 10);
          return nA - nB;
        });

      const finalImages = [];

      images.forEach((file, index) => {
        const oldPath = path.join(outputDir, file);
        const newName = `image_${index + 1}.png`;
        const newPath = path.join(outputDir, newName);

        fs.renameSync(oldPath, newPath);
        finalImages.push(newName);
      });

      resolve(finalImages); // ← array in correct order
    });
  });
};

export default extractImagesFromPdf;