// import fs from "fs";
// import path from "path";
// import { spawn } from "child_process";

// const POPPLER_PATH = "C:\\poppler\\poppler-24.02.0\\Library\\bin\\pdftoppm.exe";

// /**
//  * Extract PDF pages as PNG images using Poppler (pdftoppm)
//  * @param {string} pdfPath - Absolute path to PDF file
//  * @param {string} outputDir - Directory to save images
//  * @returns {Promise<string[]>} - Array of image filenames in correct order
//  */
// const extractImagesFromPdf = (pdfPath, outputDir) => {
//   return new Promise((resolve, reject) => {
//     if (!fs.existsSync(pdfPath)) {
//       return reject(new Error("PDF file does not exist"));
//     }

//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }

//     const outputPrefix = path.join(outputDir, "page");

//     console.log("Using Poppler:", POPPLER_PATH);
//     console.log("PDF exists:", fs.existsSync(pdfPath));

//     // 🔑 Spawn Poppler process
//     const poppler = spawn(
//       POPPLER_PATH,
//       [
//         "-png",
//         "-scale-to-x",
//         "600",
//         "-scale-to-y",
//         "-1",
//         pdfPath,
//         outputPrefix,
//       ],
//       {
//         windowsHide: true,
//       }
//     );

//     let stderr = "";

//     poppler.stderr.on("data", (data) => {
//       stderr += data.toString();
//     });

//     poppler.on("error", (err) => {
//       reject(err); // DO NOT hide the real error
//     });

//     // ⏱ Safety timeout (optional but recommended)
//     const timeout = setTimeout(() => {
//       poppler.kill("SIGKILL");
//       reject(new Error("Poppler process timed out"));
//     }, 60_000);

//     poppler.on("close", (code) => {
//       clearTimeout(timeout);

//       if (code !== 0) {
//         return reject(new Error(`Poppler failed with code ${code}: ${stderr}`));
//       }

//       // Read generated images
//       const files = fs
//         .readdirSync(outputDir)
//         .filter(
//           (file) =>
//             file.startsWith("page") && file.toLowerCase().endsWith(".png")
//         )
//         .sort((a, b) => {
//           const numA = parseInt(a.match(/\d+/)[0], 10);
//           const numB = parseInt(b.match(/\d+/)[0], 10);
//           return numA - numB;
//         });

//       // Rename sequentially → image_1.png, image_2.png, ...
//       const finalImages = [];

//       files.forEach((file, index) => {
//         const oldPath = path.join(outputDir, file);
//         const newName = `image_${index + 1}.png`;
//         const newPath = path.join(outputDir, newName);

//         fs.renameSync(oldPath, newPath);
//         finalImages.push(newName);
//       });

//       resolve(finalImages);
//     });
//   });
// };

// export default extractImagesFromPdf;

// import fs from "fs";
// import path from "path";
// import os from "os";
// import { spawn } from "child_process";

// // ✅ Windows Poppler path
// const WINDOWS_POPPLER_PATH =
//   "C:\\poppler\\poppler-24.02.0\\Library\\bin\\pdftoppm.exe";

// /**
//  * Extract PDF pages as PNG images using Poppler (pdftoppm)
//  * Works on Windows & Linux automatically
//  *
//  * @param {string} pdfPath - Absolute path to PDF
//  * @param {string} outputDir - Directory to store images
//  * @returns {Promise<string[]>}
//  */
// const extractImagesFromPdf = (pdfPath, outputDir) => {
//   return new Promise((resolve, reject) => {
//     if (!fs.existsSync(pdfPath)) {
//       return reject(new Error("PDF file does not exist"));
//     }

//     fs.mkdirSync(outputDir, { recursive: true });

//     const outputPrefix = path.join(outputDir, "page");

//     // 🔥 OS DETECTION
//     const platform = os.platform(); // 'win32', 'linux', 'darwin'

//     let command;
//     let args;

//     if (platform === "win32") {
//       // 🪟 WINDOWS
//       command = WINDOWS_POPPLER_PATH;
//       args = [
//         "-png",
//         "-scale-to-x",
//         "600",
//         "-scale-to-y",
//         "-1",
//         pdfPath,
//         outputPrefix,
//       ];
//     } else if (platform === "linux") {
//       // 🐧 LINUX (AWS / Ubuntu)
//       command = "pdftoppm";
//       args = [
//         "-png",
//         "-r",
//         "150", // DPI
//         pdfPath,
//         outputPrefix,
//       ];
//     } else {
//       return reject(
//         new Error(`Unsupported OS platform: ${platform}`)
//       );
//     }

//     console.log("📄 Extracting PDF using:", command);
//     console.log("🖥 Platform:", platform);

//     const poppler = spawn(command, args, {
//       windowsHide: true,
//     });

//     let stderr = "";

//     poppler.stderr.on("data", (data) => {
//       stderr += data.toString();
//     });

//     poppler.on("error", (err) => {
//       reject(err);
//     });

//     // ⏱ Safety timeout
//     const timeout = setTimeout(() => {
//       poppler.kill("SIGKILL");
//       reject(new Error("Poppler process timed out"));
//     }, 60_000);

//     poppler.on("close", (code) => {
//       clearTimeout(timeout);

//       if (code !== 0) {
//         return reject(
//           new Error(`Poppler failed (${code}): ${stderr}`)
//         );
//       }

//       // 🔢 Read & sort generated images
//       const files = fs
//         .readdirSync(outputDir)
//         .filter(
//           (file) =>
//             file.startsWith("page") &&
//             file.toLowerCase().endsWith(".png")
//         )
//         .sort((a, b) => {
//           const numA = parseInt(a.match(/\d+/)[0], 10);
//           const numB = parseInt(b.match(/\d+/)[0], 10);
//           return numA - numB;
//         });

//       // 🔁 Rename sequentially
//       const finalImages = [];

//       files.forEach((file, index) => {
//         const oldPath = path.join(outputDir, file);
//         const newName = `image_${index + 1}.png`;
//         const newPath = path.join(outputDir, newName);

//         fs.renameSync(oldPath, newPath);
//         finalImages.push(newName);
//       });

//       resolve(finalImages);
//     });
//   });
// };

// export default extractImagesFromPdf;

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
      "150",      // high quality DPI
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