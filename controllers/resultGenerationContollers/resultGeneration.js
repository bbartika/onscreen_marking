import fs from "fs";
import path from "path";
// import PDFDocument from "pdfkit";
import archiver from "archiver";
import csvToJson from "../../services/csvToJson.js";
import convertJSONToCSV from "../../services/jsonToCsv.js";
import Marks from "../../models/EvaluationModels/marksModel.js";
import Task from "../../models/taskModels/taskModel.js";
import AnswerPdf from "../../models/EvaluationModels/studentAnswerPdf.js";
import QuestionDefinition from "../../models/schemeModel/questionDefinitionSchema.js";
import { __dirname } from "../../server.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createCanvas, loadImage } from "canvas";


const generateResult = async (req, res) => {
  const { subjectcode } = req.body;
  const uploadedCsv = req.file;

  try {
    if (!subjectcode) {
      return res.status(400).json({ message: "Subject code is required." });
    }

    if (!uploadedCsv) {
      return res.status(400).json({ message: "No CSV file uploaded." });
    }

    // Create necessary folders
    const resultFolder = path.join(__dirname, "resultFolder", subjectcode);
    const tempFolder = path.join(__dirname, "temp");
    if (!fs.existsSync(tempFolder))
      fs.mkdirSync(tempFolder, { recursive: true });
    if (!fs.existsSync(resultFolder))
      fs.mkdirSync(resultFolder, { recursive: true });

    // Save uploaded CSV temporarily
    const tempCsvPath = path.join(tempFolder, uploadedCsv.originalname);
    fs.writeFileSync(tempCsvPath, fs.readFileSync(uploadedCsv.path));

    // Convert uploaded CSV to JSON
    const csvData = await csvToJson(tempCsvPath);

    // Fetch tasks and generate results
    const tasks = await Task.find({ subjectCode: subjectcode }).populate(
      "userId",
      "email"
    );
    console.log("tasks", tasks);

    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found." });
    }

    // Map taskId to user email
    const userMap = tasks.reduce((map, task) => {
      if (task.userId && task.userId.email) {
        map[task._id] = task.userId.email;
      }
      return map;
    }, {});

    const taskIds = tasks.map((task) => task._id);
    const completedBooklets = await AnswerPdf.find({
      taskId: { $in: taskIds },
      status: true,
    });
    console.log("Completed Booklets:", completedBooklets.length);

    if (completedBooklets.length === 0) {
      return res.status(404).json({ message: "No completed booklets found." });
    }

    const generatingResults = await Promise.all(
      completedBooklets.map(async (booklet) => {
        const barcode = booklet.answerPdfName?.split("_")[0];
        if (!barcode) {
          return {
            status: "false",
            message: "Barcode name not found",
            bookletName: booklet.answerPdfName,
            barcode: "",
          };
        }

        const marks = await Marks.find({ answerPdfId: booklet._id });
        console.log(`Marks for booklet ${booklet.answerPdfName}:`, marks);

        const totalMarks = marks.reduce(
          (sum, mark) => sum + mark.allottedMarks,
          0
        );
        console.log(
          `Total marks for booklet ${booklet.answerPdfName}:`,
          totalMarks
        );

        // Get evaluator's email from the userMap
        const evaluatedBy = userMap[booklet.taskId] || "Unknown";

        console.log("totalMarks", totalMarks, "evaluatedBy", evaluatedBy);

        return {
          status: "true",
          barcode: barcode,
          totalMarks: totalMarks,
          evaluatedBy: evaluatedBy,
        };
      })
    );

    // Match barcodes from the CSV with generatingResults
    const finalResults = csvData.map((row) => {
      console.log("🔍 Checking row:", row.BARCODE);

      const matchingResult = generatingResults.find((result) => {
        console.log("  comparing ->", result.barcode, "with", row.BARCODE);
        return result.barcode == row.BARCODE;
      });
      // console.log("barcode:", barcode, "rowBarcode:", BARCODE);

      if (matchingResult) {
        console.log(
          "matchingResult:",
          matchingResult,
          "marks:",
          matchingResult.totalMarks
        );
        return {
          ...row,
          MARKS: matchingResult.totalMarks,
          EVALUATEDBY: matchingResult.evaluatedBy,
        };
      }
      return {
        ...row,
        MARKS: "N/A",
        EVALUATEDBY: "N/A",
      };
    });

    // Convert final results to CSV
    const newCsvData = convertJSONToCSV(finalResults);
    if (!newCsvData) {
      return res.status(500).json({ message: "Failed to generate CSV." });
    }

    const resultCsvPath = path.join(resultFolder, "result.csv");
    fs.writeFileSync(resultCsvPath, newCsvData);

    // Clean up temp folder
    fs.rmSync(tempFolder, { recursive: true, force: true });

    // Send JSON response to the frontend
    return res.status(200).json({
      message: "Results generated successfully.",
      data: finalResults,
      csvSavedPath: resultCsvPath,
    });
  } catch (error) {
    console.error("Error generating results:", error);
    return res
      .status(500)
      .json({ message: "Failed to generate result", error: error.message });
  }
};

const getPreviousResult = async (req, res) => {
  const { subjectcode } = req.query;

  try {
    if (!subjectcode) {
      return res.status(400).json({ message: "Subject code is required." });
    }

    const resultFolderPath = path.join(__dirname, "resultFolder", subjectcode);

    if (!fs.existsSync(resultFolderPath)) {
      return res
        .status(404)
        .json({ message: "No results found for this subject code." });
    }

    const files = fs.readdirSync(resultFolderPath);
    if (files.length === 0) {
      return res
        .status(404)
        .json({ message: "No results found for this subject code." });
    }

    const results = files.map((filename) => {
      const filePath = path.join(resultFolderPath, filename);
      const stats = fs.statSync(filePath);

      return {
        filename: filename,
        time: stats.mtime.toISOString(),
      };
    });

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Error retrieving previous results:", error);
    return res
      .status(500)
      .json({ message: "Failed to retrieve results", error: error.message });
  }
};

const downloadResultByName = async (req, res) => {
  const { subjectcode, filename } = req.query;

  try {
    if (!subjectcode || !filename) {
      return res
        .status(400)
        .json({ message: "Subject code and filename are required." });
    }

    const resultFolderPath = path.join(__dirname, "resultFolder", subjectcode);

    if (!fs.existsSync(resultFolderPath)) {
      return res
        .status(404)
        .json({ message: "No results found for this subject code." });
    }

    const filePath = path.join(resultFolderPath, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Result file not found." });
    }

    const result = await csvToJson(filePath);

    return res.status(200).json({ result });
  } catch (error) {
    console.error("Error downloading result:", error);
    return res
      .status(500)
      .json({ message: "Failed to download result", error: error.message });
  }
};

async function createAnswerPdf(subjectCode,userId, answerPdfName) {
  try {
    const extractedBookletPath = path.join(
      "processedFolder",
      subjectCode,
      answerPdfName
    );

    console.log("🔍 Checking PDF path:", extractedBookletPath);

    if (!fs.existsSync(extractedBookletPath)) {
      console.error("❌ PDF not found at path:", extractedBookletPath);
      return false;
    }

    const pdfBytes = fs.readFileSync(extractedBookletPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const totalPages = pdfDoc.getPageCount();
    console.log(`📄 Total pages in original PDF: ${totalPages}`);

    if (totalPages <= 2) {
      console.log("❌ Cannot remove pages. PDF has 2 or fewer pages.");
      return false;
    }

    const newPdf = await PDFDocument.create();

    const copiedPages = await newPdf.copyPages(
      pdfDoc,
      [...Array(totalPages - 2).keys()].map((i) => i + 2)
    );

    copiedPages.forEach((p) => newPdf.addPage(p));

    const finalBytes = await newPdf.save();
    const filePath = path.join("designedFolder", subjectCode, userId);

    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    // Create subjectCode folder if missing

    const folderPath = path.join(filePath, answerPdfName);

    // Save the PDF bytes
    fs.writeFileSync(folderPath, finalBytes);

    console.log("✅ answerPdf.pdf created (first 2 pages removed)");
    return true;
  } catch (err) {
    console.error("❌ Error:", err);
    return false;
  }
}

const getCompletedBooklets = async (req, res) => {
  const { id, userId } = req.params;
  console.log("userId", userId);

  try {
    const task = await Task.findById(id)
      .where({ status: "success" })
      .select("subjectCode");

    const subjectCode = task?.subjectCode;

    const booklets = await AnswerPdf.find({ taskId: id, status: true });

    

    if (booklets.length === 0) {
      return res.status(404).json({ message: "No completed booklets found" });
    }

    const zipFiles = [];

    for (const booklet of booklets) {
      const success = await createAnswerPdf(subjectCode, userId, booklet.answerPdfName);
      if (!success) {
        return res
          .status(500)
          .json({ message: "Failed to create answerPdf.pdf" });
      }

      const filePath = path.join(
        "designedFolder",
        subjectCode,
        booklet.answerPdfName
      );

      // Read the file
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Read the file

      // Embed fonts once
      const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      console.log("📄 Loaded answerPdf.pdf for annotations");

      const checkImg = await loadImage("check.png");
      const closeImg = await loadImage("close.png");

      async function embedImage(img) {
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return pdfDoc.embedPng(canvas.toBuffer());
      }

      const checkIcon = await embedImage(checkImg);
      const closeIcon = await embedImage(closeImg);

      // --------------------------------------------------------
      // 4️⃣ DRAW ANNOTATIONS ON EVERY PAGE
      // --------------------------------------------------------
      const pageCount = pdfDoc.getPageCount();

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const page = pdfDoc.getPage(pageIndex);

        const { width, height } = page.getSize();
        // console.log("answerPdfId", String(booklet._id));

        const jsonPath = path.join(
          "Annotations",
          userId,
          String(booklet._id),
          `page_${pageIndex + 3}.json`
        );

        if (!fs.existsSync(jsonPath)) {
          console.log(`⚠ No JSON for page ${pageIndex + 3}`);
          continue;
        }

        const { annotations } = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const a of annotations) {
          // --- SAFE POSITIONING ---
          let x = a.x;
          let y = a.y;

          if (x + 200 > width) x = width - 200;
          if (x < 20) x = 20;

          if (y < 60) y = 60;
          if (y > height - 60) y = height - 60;

          const icon = a.iconUrl.includes("check") ? checkIcon : closeIcon;
          const borderColor = a.iconUrl.includes("check")
            ? rgb(0, 0.6, 0)
            : rgb(1, 0, 0);

          const iconWidth = 30;
          const iconHeight = 30;

          // ⬤ ICON
          page.drawImage(icon, { x, y, width: iconWidth, height: iconHeight });

          // ⬤ Question text
          const qTextY = y - 18;
          const baseText = `Q${a.question} -> `;

          page.drawText(baseText, {
            x,
            y: qTextY,
            size: 12,
            color: rgb(0, 0, 0),
          });

          const textWidth = font.widthOfTextAtSize(baseText, 12);

          // ⬤ Circle for marks
          const circleX = x + textWidth + 10;
          const circleY = qTextY + 6;

          page.drawCircle({
            x: circleX,
            y: circleY,
            size: 10,
            borderWidth: 2,
            borderColor,
          });

          // ⭐ PERFECT CENTERED MARK NUMBER ⭐
          const markText = String(a.mark);
          const markWidth = font.widthOfTextAtSize(markText, 10);
          const markHeight = 10;

          page.drawText(markText, {
            x: circleX - markWidth / 2,
            y: circleY - markHeight / 2,
            size: 10,
            color: borderColor,
          });

          // ⬤ Date + Time
          const [datePart, timePart] = a.timeStamps.split(",");

          page.drawText(datePart.trim(), {
            x,
            y: y - 35,
            size: 10,
            color: rgb(0.3, 0.3, 0.3),
          });

          page.drawText(timePart.trim(), {
            x,
            y: y - 47,
            size: 10,
            color: rgb(0.3, 0.3, 0.3),
          });
        }
      }

      // --------------------------------------------------------
      // ⭐⭐⭐ ADD SUMMARY PAGE *BEFORE* SAVING RESULTED PDF ⭐⭐⭐
      // --------------------------------------------------------

      // 1️⃣ COLLECT SUMMARY + TOTAL MARKS
      let summaryData = [];
      let totalMarks = 0;

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const jsonPath = path.join(
          "Annotations",
          String(booklet._id),
          `page_${pageIndex + 3}.json` // keep your offset if correct
        );

        if (!fs.existsSync(jsonPath)) continue;

        const { annotations } = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

        const tasks = await Task.find({ subjectCode }).populate(
          "userId",
          "email"
        );

        const taskUserMap = tasks.reduce((map, t) => {
          if (t.userId && t.userId.email) {
            map[t._id.toString()] = t.userId.email;
          }
          return map;
        }, {});

        for (const a of annotations) {
          summaryData.push({
            question: `Q${a.question}`,
            marks: a.mark,
            page: pageIndex + 3,
            time: a.timeStamps || "N/A",
            evaluator: taskUserMap?.[booklet.taskId] || "N/A",
          });

          totalMarks += Number(a.mark);
        }
      }

      // 2️⃣ ADD SUMMARY PAGE AS FIRST PAGE
      const summaryPage = pdfDoc.addPage();
      const { width: sw, height: sh } = summaryPage.getSize();

      summaryPage.drawText(`Booklet Name: ${booklet.answerPdfName}`, {
        x: 50,
        y: sh - 40,
        size: 18,
        font: fontBold,
      });

      // 3️⃣ TABLE HEADERS
      const startX = 50;
      let startY = sh - 80;
      const rowHeight = 25;

      const colWidths = [100, 80, 80, 180, 150];
      const headers = ["Question", "Marks","Page No", "Time", "Evaluator"];

      headers.forEach((header, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        summaryPage.drawText(header, {
          x,
          y: startY,
          size: 12,
          font: fontBold,
        });
      });

      startY -= 20;

      // 4️⃣ TABLE ROWS
      summaryData.forEach((row) => {
        const values = [
          row.question,
          String(row.marks),
          String(row.page),
          row.time,
          row.evaluator,
        ];

        values.forEach((text, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          summaryPage.drawText(text, {
            x,
            y: startY,
            size: 11,
            font: fontNormal,
          });
        });

        startY -= rowHeight;
      });

      // 5️⃣ TOTAL MARKS
      summaryPage.drawText(`Total Marks: ${totalMarks}`, {
        x: sw - 200,
        y: startY - 10,
        size: 14,
        font: fontBold,
      });

      // SAVE FINAL OUTPUT
      const finalBytes = await pdfDoc.save();
      const dirPath = path.join("resultedFolder", userId, subjectCode);

      // Create folder if not exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Build file path: resultedFolder/<subjectCode>/<answerPdfName>
      const resultedFilePath = path.join(
        "resultedFolder",
        subjectCode,
        booklet.answerPdfName
      );
      fs.writeFileSync(resultedFilePath, finalBytes);

      console.log("🎉 output.pdf created with PERFECT annotations!");

      zipFiles.push({
        name: booklet.answerPdfName,
        buffer: Buffer.from(finalBytes),
      });
    }

    res.setHeader("content-type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${subjectCode}_completedBooklets.zip`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of zipFiles) {
      archive.append(file.buffer, { name: file.name });
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error fetching completed booklets:", error);
    res.status(500).json({
      message: "Failed to fetch and process completed booklets.",
      error: error.message,
    });
  }
};

// const getCompletedBooklets = async (req, res) => {
//   const { id } = req.params;

//   try {
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid task ID." });
//     }

//     const task = await Task.findById(id).populate("userId", "email");

//     if (!task) {
//       return res.status(404).json({ message: "Task not found" });
//     }

//     const booklets = await AnswerPdf.find({ taskId: task._id, status: true });

//     if (booklets.length === 0) {
//       return res.status(404).json({ message: "No completed booklets found" });
//     }

//     // Fetch all tasks for the subject and map user emails to taskIds
//     const tasks = await Task.find({ subjectCode: task.subjectCode }).populate(
//       "userId",
//       "email"
//     );
//     const taskUserMap = tasks.reduce((map, t) => {
//       if (t.userId && t.userId.email) {
//         map[t._id] = t.userId.email;
//       }
//       return map;
//     }, {});

//     // Construct results with evaluator details
//     const results = booklets.map((booklet) => ({
//       answerPdfId: booklet._id,
//       evaluatedBy: taskUserMap[booklet.taskId] || "Unknown",
//     }));

//     // Set up the response headers for streaming the ZIP file
//     res.setHeader("Content-Type", "application/zip");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=${task.subjectCode}_completedBooklets.zip`
//     );

//     // Create the ZIP archive and pipe it to the response
//     const archive = archiver("zip", { zlib: { level: 9 } });
//     archive.pipe(res);

//     // Process each booklet and add to the ZIP
//     for (const booklet of booklets) {
//       const bookletFolder = path.join(
//         __dirname,
//         `completedFolder/${task.subjectCode}/${booklet.answerPdfName}`
//       );

//       if (!fs.existsSync(bookletFolder)) {
//         return res.status(404).json({
//           message: `Folder not found for booklet: ${booklet.answerPdfName}`,
//         });
//       }

//       const images = fs
//         .readdirSync(bookletFolder)
//         .filter((file) => file.endsWith(".png"))
//         .sort((a, b) => {
//           const numA = parseInt(a.split("_")[1].split(".")[0], 10);
//           const numB = parseInt(b.split("_")[1].split(".")[0], 10);
//           return numA - numB;
//         });

//       if (images.length === 0) {
//         return res.status(404).json({
//           message: `No images found in folder for booklet: ${booklet.answerPdfName}`,
//         });
//       }

//       // Fetch marks data for this booklet for every question Id
//       const marksData = await Marks.find({ answerPdfId: booklet._id });
//       const questionDefinitions = await QuestionDefinition.find({
//         _id: { $in: marksData.map((m) => m.questionDefinitionId) },
//       });

//       // Generate the PDF for this booklet
//       const pdfBuffer = await generatePdfBuffer(
//         images,
//         bookletFolder,
//         booklet.answerPdfName,
//         results,
//         marksData,
//         questionDefinitions
//       );

//       // Add the PDF buffer to the ZIP archive
//       archive.append(pdfBuffer, { name: `${booklet.answerPdfName}.pdf` });
//     }

//     // Finalize the ZIP archive
//     await archive.finalize();
//   } catch (error) {
//     console.error("Error fetching completed booklets:", error);
//     res.status(500).json({
//       message: "Failed to fetch and process completed booklets.",
//       error: error.message,
//     });
//   }
// };

// Helper function to generate a PDF from images
// const generatePdfBuffer = async (
//   images,
//   bookletFolder,
//   bookletName,
//   results,
//   marksData,
//   questionDefinitions
// ) => {
//   return new Promise((resolve, reject) => {
//     const pdfBuffers = [];
//     const doc = new PDFDocument();

//     doc.on("data", (chunk) => pdfBuffers.push(chunk));
//     doc.on("end", () => resolve(Buffer.concat(pdfBuffers)));
//     doc.on("error", (err) => reject(err));

//     for (const image of images) {
//       const imagePath = path.join(bookletFolder, image);
//       doc.image(imagePath, 0, 0, {
//         fit: [doc.page.width, doc.page.height],
//       });
//       doc.addPage();
//     }

//     // Add the summary page
//     doc.addPage();

//     // Add booklet name at the top
//     doc.fontSize(18).text(`Booklet Name: ${bookletName || "N/A"}`, {
//       align: "center",
//       underline: true,
//     });

//     doc.moveDown(2);

//     const startX = 50;
//     const startY = doc.y;
//     const rowHeight = 25;
//     const columnWidths = [80, 80, 80, 150, 150];

//     const columns = [
//       { title: "Question", x: startX, width: columnWidths[0] },
//       { title: "Marks", x: startX + columnWidths[0], width: columnWidths[1] },
//       {
//         title: "Page No.",
//         x: startX + columnWidths[0] + columnWidths[1],
//         width: columnWidths[2],
//       },
//       {
//         title: "Time",
//         x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
//         width: columnWidths[3],
//       },
//       {
//         title: "Evaluator",
//         x:
//           startX +
//           columnWidths[0] +
//           columnWidths[1] +
//           columnWidths[2] +
//           columnWidths[3],
//         width: columnWidths[4],
//       },
//     ];

//     // Add table headers
//     doc.fontSize(12).font("Helvetica-Bold");
//     for (const column of columns) {
//       doc.text(column.title, column.x, startY, {
//         width: column.width,
//         align: "left",
//       });
//     }
//     // Add rows from marks data
//     doc.fontSize(10).font("Helvetica");
//     marksData.forEach((mark, index) => {
//       const question = questionDefinitions.find(
//         (q) => q._id.toString() === mark.questionDefinitionId.toString()
//       );
//       const rowY = startY + (index + 1) * rowHeight;

//       doc.text(`Q${question?.questionsName}` || "N/A", columns[0].x, rowY, {
//         width: columns[0].width,
//         align: "left",
//       });
//       doc.text(mark.allottedMarks, columns[1].x, rowY, {
//         width: columns[1].width,
//         align: "left",
//       });
//       doc.text(index + 2, columns[2].x, rowY, {
//         width: columns[2].width,
//         align: "left",
//       });
//       doc.text(mark.timerStamps || "N/A", columns[3].x, rowY, {
//         width: columns[3].width,
//         align: "left",
//       });
//       doc.text(results[0]?.evaluatedBy || "N/A", columns[4].x, rowY, {
//         width: columns[4].width,
//         align: "left",
//       });
//     });

//     // Calculate Total Marks
//     const totalMarks = marksData.reduce(
//       (sum, mark) => sum + (Number(mark.allottedMarks) || 0),
//       0
//     );

//     // Print Total Marks at the bottom-right corner
//     const totalMarksText = `Total Marks: ${totalMarks}`;
//     const totalMarksX =
//       startX + columnWidths.reduce((sum, width) => sum + width, 0) - 200;
//     const totalMarksY = startY + (marksData.length + 1) * rowHeight + 20;

//     doc
//       .fontSize(12)
//       .font("Helvetica-Bold")
//       .text(totalMarksText, totalMarksX, totalMarksY, {
//         width: 150,
//         align: "right",
//       });

//     doc.end();
//   });
// };

// const generatePdfBuffer = async (images, bookletFolder, bookletName, results, marksData, questionDefinitions) => {
//     return new Promise((resolve, reject) => {
//         const pdfBuffers = [];
//         const doc = new PDFDocument();

//         doc.on("data", (chunk) => pdfBuffers.push(chunk));
//         doc.on("end", () => resolve(Buffer.concat(pdfBuffers)));
//         doc.on("error", (err) => reject(err));

//         // Add all images to the PDF
//         for (const image of images) {
//             const imagePath = path.join(bookletFolder, image);
//             doc.image(imagePath, 0, 0, {
//                 fit: [doc.page.width, doc.page.height],
//             });
//             doc.addPage();
//         }

//         // Add the summary page
//         doc.addPage();

//         // Add booklet name at the top
//         doc.fontSize(18).text(`Booklet Name: ${bookletName || "N/A"}`, {
//             align: "center",
//             underline: true,
//         });

//         doc.moveDown(2);

//         const startX = 50;
//         const startY = doc.y;
//         const rowHeight = 25;
//         const columnWidths = [80, 80, 150, 150]; // Removed the column for Page No.
//         // The column widths are adjusted accordingly

//         const columns = [
//             { title: "Question", x: startX, width: columnWidths[0] },
//             { title: "Marks", x: startX + columnWidths[0], width: columnWidths[1] },
//             // { title: "Page No.", x: startX + columnWidths[0] + columnWidths[1], width: columnWidths[2] }, // Removed Page No.
//             { title: "Time", x: startX + columnWidths[0] + columnWidths[1], width: columnWidths[2] },
//             { title: "Evaluator", x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2], width: columnWidths[3] },
//         ];

//         // Add table headers
//         doc.fontSize(12).font("Helvetica-Bold");
//         for (const column of columns) {
//             doc.text(column.title, column.x, startY, { width: column.width, align: "left" });
//         }

//         // Add rows from marks data
//         doc.fontSize(10).font("Helvetica");
//         marksData.forEach((mark, index) => {
//             const question = questionDefinitions.find(q => q._id === mark.questionDefinitionId);
//             const rowY = startY + (index + 1) * rowHeight;

//             doc.text(question?.questionsName || `Q${index + 1}`, columns[0].x, rowY, { width: columns[0].width, align: "left" });
//             doc.text(mark.allottedMarks, columns[1].x, rowY, { width: columns[1].width, align: "left" });
//             // doc.text(index + 1, columns[2].x, rowY, { width: columns[2].width, align: "left" }); // Commented out Page No.
//             doc.text(mark.timerStamps || "N/A", columns[2].x, rowY, { width: columns[2].width, align: "left" });
//             doc.text(results[0]?.evaluatedBy || "N/A", columns[3].x, rowY, { width: columns[3].width, align: "left" });
//         });

//         // Calculate Total Marks
//         const totalMarks = marksData.reduce((sum, mark) => sum + (Number(mark.allottedMarks) || 0), 0);

//         // Print Total Marks at the bottom-right corner
//         const totalMarksText = `Total Marks: ${totalMarks}`;
//         const totalMarksX = startX + columnWidths.reduce((sum, width) => sum + width, 0) - 200;
//         const totalMarksY = startY + (marksData.length + 1) * rowHeight + 20;

//         doc.fontSize(12).font("Helvetica-Bold").text(totalMarksText, totalMarksX, totalMarksY, {
//             width: 150,
//             align: "right",
//         });

//         doc.end();
//     });
// };

export {
  generateResult,
  getPreviousResult,
  downloadResultByName,
  getCompletedBooklets,
};
