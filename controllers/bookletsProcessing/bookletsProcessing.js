import fs from "fs";
import path from "path";
import Subject from "../../models/classModel/subjectModel.js";
import { io } from "../../server.js";
import CourseSchemaRelation from "../../models/subjectSchemaRelationModel/subjectSchemaRelationModel.js";
import Schema from "../../models/schemeModel/schema.js";
import { PDFDocument } from "pdf-lib";
import { __dirname } from "../../server.js";
import SubjectFolderModel from "../../models/StudentModels/subjectFolderModel.js";
import AnswerPdf from "../../models/EvaluationModels/studentAnswerPdf.js";
import Task from "../../models/taskModels/taskModel.js";
import User from "../../models/authModels/User.js";
import mongoose from "mongoose";
// import AnswerPdfImage from "../../models/EvaluationModels/answerPdfImageModel.js";

// const processingBookletsBySocket = async (req, res) => {
//   const { subjectCode } = req.body;

//   if (!subjectCode) {
//     return res.status(400).json({ message: "Subject code is required." });
//   }

//   try {
//     const socketNamespace = io.of(`/processing-${subjectCode}`);
//     socketNamespace.on("connection", async (socket) => {
//       socket.emit("status", "Starting verification...");

//       let schema;
//       try {
//         const subject = await Subject.findOne({ code: subjectCode });
//         if (!subject) {
//           socket.emit("status", "Subject not found. Terminating process.");
//           socket.disconnect();
//           return;
//         }

//         const courseSchemaDetails = await CourseSchemaRelation.findOne({
//           subjectId: subject._id,
//         });

//         if (!courseSchemaDetails) {
//           socket.emit(
//             "status",
//             "Schema not found for the subject. Terminating process."
//           );
//           socket.disconnect();
//           return;
//         }

//         schema = await Schema.findOne({ _id: courseSchemaDetails.schemaId });
//         if (!schema) {
//           socket.emit(
//             "status",
//             "Schema details not found. Terminating process."
//           );
//           socket.disconnect();
//           return;
//         }

//         socket.emit("status", "Verification completed. Processing PDFs...");
//         await new Promise((resolve) => setTimeout(resolve, 3000));
//       } catch (error) {
//         console.error("Verification error:", error.message);
//         socket.emit("error", "Verification failed. Terminating process.");
//         socket.disconnect();
//         return;
//       }

//       // Step 2: Process PDFs
//       const scannedDataPath = path.join(
//         __dirname,
//         "scannedFolder",
//         subjectCode
//       );
//       const processedFolderPath = path.join(
//         __dirname,
//         "processedFolder",
//         subjectCode
//       );
//       const rejectedFolderPath = path.join(
//         __dirname,
//         "rejectedBookletsFolder",
//         subjectCode
//       );

//       if (!fs.existsSync(scannedDataPath)) {
//         socket.emit("status", "Scanned folder not found. Terminating process.");
//         socket.disconnect();
//         return;
//       }

//       // Ensure folders exist
//       fs.mkdirSync(processedFolderPath, { recursive: true });
//       fs.mkdirSync(rejectedFolderPath, { recursive: true });

//       const initialPdfFiles = fs
//         .readdirSync(scannedDataPath)
//         .filter((file) => file.endsWith(".pdf"));
//       if (initialPdfFiles.length === 0) {
//         socket.emit(
//           "status",
//           "No PDFs found in the scanned folder. Terminating process."
//         );
//         socket.disconnect();
//         return;
//       }

//       // const initialPdfSet = new Set(initialPdfFiles); // Track initial PDFs
//       let reportContent = `Processing Report for Subject: ${subjectCode}\n\nFile Name\t\tStatus\t\tTotal Pages\n`;
//       let processedCount = 0; // Track how many booklets were processed

//       for (const pdfFile of initialPdfFiles) {
//         const pdfPath = path.join(scannedDataPath, pdfFile);

//         // ✅ Only proceed if file still exists (not already moved)
//         if (!fs.existsSync(pdfPath)) {
//           console.warn(`Skipping already moved or missing file: ${pdfFile}`);
//           continue;
//         }

//         try {
//           const pdfBytes = fs.readFileSync(pdfPath);
//           const pdfDoc = await PDFDocument.load(pdfBytes);
//           const totalPages = pdfDoc.getPageCount();

//           let targetFolderPath;
//           let status;

//           if (totalPages === schema.numberOfPage) {
//             targetFolderPath = processedFolderPath;
//             status = "Processed";
//             console.log("processed");
//             processedCount++;
//           } else {
//             targetFolderPath = rejectedFolderPath;
//             status = "Rejected";
//           }

//           fs.mkdirSync(targetFolderPath, { recursive: true });
//           const targetFilePath = path.join(targetFolderPath, pdfFile);

//           // ✅ MOVE file (also deletes original)
//           try {
//             fs.renameSync(pdfPath, targetFilePath);
//           } catch (err) {
//             console.error(`Failed to move file ${pdfFile}:`, err.message);
//             socket.emit("error", `Failed to move ${pdfFile}: ${err.message}`);
//             continue;
//           }

//           // Report
//           reportContent += `${pdfFile}\t\t${status}\t\t${totalPages}\n`;
//           socket.emit("status", { pdfFile, status, totalPages });
//         } catch (error) {
//           console.error(`Error processing ${pdfFile}:`, error.message);
//           socket.emit("error", `Failed to process ${pdfFile}`);
//         }
//       }

//       // for (const pdfFile of initialPdfFiles) {
//       //     const pdfPath = path.join(scannedDataPath, pdfFile);

//       //     // Ensure this file is part of the initial set
//       //     if (!initialPdfSet.has(pdfFile)) continue;

//       //     try {
//       //         const pdfBytes = fs.readFileSync(pdfPath);
//       //         const pdfDoc = await PDFDocument.load(pdfBytes);
//       //         const totalPages = pdfDoc.getPageCount();

//       //         let targetFolderPath;
//       //         let status;

//       //         if (totalPages === schema.numberOfPage) {
//       //             targetFolderPath = processedFolderPath;
//       //             status = "Processed";
//       //             console.log("processed");
//       //             processedCount++;
//       //         } else {
//       //             targetFolderPath = rejectedFolderPath;
//       //             status = "Rejected";
//       //         }

//       //         // Move the PDF to the target folder
//       //         fs.mkdirSync(targetFolderPath, { recursive: true });
//       //         const targetFilePath = path.join(targetFolderPath, pdfFile);
//       //         // fs.copyFileSync(pdfPath, targetFilePath);
//       //         fs.renameSync(pdfPath, targetFilePath);

//       //         // Append report content
//       //         reportContent += `${pdfFile}\t\t${status}\t\t${totalPages}\n`;
//       //         socket.emit("status", { pdfFile, status, totalPages });
//       //     } catch (error) {
//       //         console.error(`Error processing ${pdfFile}:`, error.message);
//       //         socket.emit("error", `Failed to process ${pdfFile}`);
//       //     }
//       // }

//       // After processing, remove all PDFs from the scanned folder
//       // for (const pdfFile of initialPdfFiles) {
//       //     const pdfPath = path.join(scannedDataPath, pdfFile);
//       //     if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
//       // }

//       // Calculate the remaining files in the scanned folder
//       const totalPdfsRemaining = fs
//         .readdirSync(scannedDataPath)
//         .filter((file) => file.endsWith(".pdf")).length;

//       // Update the scanned folder count and unAllocated in the database
//       const folderDetails = await SubjectFolderModel.findOne({
//         folderName: subjectCode,
//       });

//       if (!folderDetails) {
//         socket.emit(
//           "error",
//           "Folder details not found in the database. Terminating process."
//         );
//         socket.disconnect();
//         return;
//       }

//       await SubjectFolderModel.updateOne(
//         { folderName: subjectCode },
//         {
//           $set: { scannedFolder: totalPdfsRemaining },
//           $inc: { unAllocated: processedCount },
//         }
//       );

//       // Save the report as a text file
//       const reportDir = path.join(__dirname, "processedReport", subjectCode);
//       fs.mkdirSync(reportDir, { recursive: true });

//       const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "");
//       const reportFileName = `${subjectCode}_${timestamp}.txt`;
//       const reportFilePath = path.join(reportDir, reportFileName);

//       fs.writeFileSync(reportFilePath, reportContent, "utf8");

//       socket.emit("status", `Report saved as ${reportFileName}`);
//       socket.emit("status", "Processing completed!");
//       socket.disconnect();
//     });

//     res.status(200).json({
//       message: `Socket connection established for subjectCode: ${subjectCode}. Processing started.`,
//     });
//   } catch (error) {
//     console.error("Error processing booklets:", error.message);
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };
// Prevents multiple processing for t he same subjectCode
const activeNamespaces = new Set();
const initializedNamespaces = new Set(); // Track bound namespaces

// const autoAssigning = async (subjectCode) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     const subject = await Subject.findOne({ code: subjectCode });

//     if (!subject) {
//       console.error(`Subject ${subjectCode} not found.`);
//       await session.abortTransaction();
//       return;
//     }

//     const users = await User.find({ subjectCode: subject._id });
//     console.log("users", users); // Adjust this based on your schema
//     if (users.length === 0) {
//       console.warn(`No users found for subject ${subjectCode}.`);
//       await session.abortTransaction();
//       return;
//     }

//     const processedFolderPath = path.join(
//       __dirname,
//       "processedFolder",
//       subjectCode
//     );

//     if (!fs.existsSync(processedFolderPath)) {
//       console.error(`Folder for subject ${subjectCode} not found.`);
//       await session.abortTransaction();
//       return;
//     }

//     const allPdfs = fs
//       .readdirSync(processedFolderPath)
//       .filter((file) => file.endsWith(".pdf"));

//     if (allPdfs.length === 0) {
//       console.log(`No PDFs found for subject ${subjectCode}.`);
//       await session.abortTransaction();
//       return;
//     }

//     // Fetch already assigned PDFs
//     const assignedPdfs = await AnswerPdf.find({
//       taskId: { $in: await Task.find({ subjectCode }).select("_id") },
//     }).session(session);

//     const assignedPdfNames = assignedPdfs.map((pdf) => pdf.answerPdfName);

//     // Filter out already assigned PDFs
//     const unassignedPdfs = allPdfs.filter(
//       (pdf) => !assignedPdfNames.includes(pdf)
//     );

//     if (unassignedPdfs.length === 0) {
//       console.log("All booklets already assigned.");
//       await session.abortTransaction();
//       return;
//     }

//     const numUsers = users.length;
//     let assignmentIndex = 0;

//     // For tracking updates to SubjectFolderModel
//     let totalAssigned = 0;

//     for (const pdfFile of unassignedPdfs) {
//       const user = users[assignmentIndex % numUsers];

//       const maxBooklets = user.maxBooklets || 0;

      


//       let task = await Task.findOne({
//         userId: user._id,
//         subjectCode: subjectCode,
//       }).session(session);

//       console.log("task", task);

//       if (!task) {
//         console.log("🆕 CREATING NEW TASK...");
//         console.log("📝 Creation data:", {
//           subjectCode,
//           userId: user._id,
//           totalBooklets: 0,
//           status: "inactive",
//           currentFileIndex: 1,
//         });

//         try {
//           task = new Task({
//             subjectCode: subjectCode,
//             userId: user._id,
//             totalBooklets: 0,
//             status: "inactive",
//             currentFileIndex: 1,
//             startTime: null,
//             remainingTimeInSec: null,
//             lastResumedAt: null,
//           });

//           console.log("💾 SAVING TASK TO DATABASE WITH SESSION...");
//           await task.save({ session }); // ✅ ADD SESSION HERE
//           console.log("✅ TASK CREATED SUCCESSFULLY!");
//           console.log("🎯 New Task ID:", task._id);
//           console.log("📄 Task Details:", {
//             id: task._id,
//             subjectCode: task.subjectCode,
//             userId: task.userId,
//             totalBooklets: task.totalBooklets,
//             status: task.status,
//             currentFileIndex: task.currentFileIndex,
//           });
//         } catch (error) {
//           console.error("❌ TASK CREATION FAILED!");
//           console.error("📛 Error:", error.message);
//           console.error("🔍 Full error:", error);

//           if (error.name === "ValidationError") {
//             console.error("🚫 Validation Errors:");
//             for (let field in error.errors) {
//               console.error(`   - ${field}: ${error.errors[field].message}`);
//             }
//           }
//           throw error; // Re-throw to trigger transaction abort
//         }
//       } else {
//         console.log("📋 USING EXISTING TASK:", task._id);
//       }

//       // Create AnswerPdf linked to task
//       const answerPdf = new AnswerPdf({
//         taskId: task._id,
//         answerPdfName: pdfFile,
//         status: false,
//       });

//       await answerPdf.save({ session });

//       // Increment total booklets for this task
//       task.totalBooklets += 1;
//       await task.save({ session });

//       assignmentIndex++;
//       totalAssigned++;
//     }

//     // Update SubjectFolderModel
//     const totalPdfs = allPdfs.length;

//     const allTaskIds = await Task.find({ subjectCode })
//       .distinct("_id")
//       .session(session);

//     const evaluationPending = await AnswerPdf.countDocuments({
//       status: false,
//       taskId: { $in: allTaskIds },
//     }).session(session);

//     const evaluated = await AnswerPdf.countDocuments({
//       status: true,
//       taskId: { $in: allTaskIds },
//     }).session(session);

//     const unAllocated = totalPdfs - (assignedPdfs.length + totalAssigned);

//     await SubjectFolderModel.findOneAndUpdate(
//       { folderName: subjectCode },
//       {
//         $set: {
//           allocated: assignedPdfs.length + totalAssigned,
//           evaluation_pending: evaluationPending,
//           evaluated: evaluated,
//           unAllocated: unAllocated,
//         },
//         updatedAt: new Date(),
//       },
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     console.log(
//       `Auto-assigned ${totalAssigned} booklets for subject ${subjectCode}.`
//     );
//   } catch (error) {
//     console.error("Error during auto-assignment:", error);
//     await session.abortTransaction();
//     session.endSession();
//   }
// };




const processingBookletsBySocket = async (req, res) => {
  const { subjectCode } = req.body;

  if (!subjectCode) {
    return res.status(400).json({ message: "Subject code is required." });
  }

  if (activeNamespaces.has(subjectCode)) {
    return res.status(409).json({
      message: `Processing already in progress for ${subjectCode}`,
    });
  }

  activeNamespaces.add(subjectCode);

  try {
    const socketNamespace = io.of(`/processing-${subjectCode}`);

    // Bind only once
    if (!initializedNamespaces.has(subjectCode)) {
      initializedNamespaces.add(subjectCode);

      socketNamespace.on("connection", async (socket) => {
        socket.emit("status", "Starting verification...");

        let schema;

        try {
          const subject = await Subject.findOne({ code: subjectCode });
          if (!subject) {
            socket.emit("status", "Subject not found. Terminating process.");
            socket.disconnect();
            return;
          }

          const courseSchemaDetails = await CourseSchemaRelation.findOne({
            subjectId: subject._id,
          });

          if (!courseSchemaDetails) {
            socket.emit("status", "Schema not found. Terminating process.");
            socket.disconnect();
            return;
          }

          schema = await Schema.findOne({ _id: courseSchemaDetails.schemaId });
          if (!schema) {
            socket.emit(
              "status",
              "Schema details not found. Terminating process."
            );
            socket.disconnect();
            return;
          }

          socket.emit("status", "Verification completed. Processing PDFs...");
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (error) {
          console.error("Verification error:", error.message);
          socket.emit("error", "Verification failed. Terminating process.");
          socket.disconnect();
          return;
        }

        const scannedDataPath = path.join(
          __dirname,
          "scannedFolder",
          subjectCode
        );
        const processedFolderPath = path.join(
          __dirname,
          "processedFolder",
          subjectCode
        );
        const rejectedFolderPath = path.join(
          __dirname,
          "rejectedBookletsFolder",
          subjectCode
        );

        if (!fs.existsSync(scannedDataPath)) {
          socket.emit(
            "status",
            "Scanned folder not found. Terminating process."
          );
          activeNamespaces.delete(subjectCode);
          socket.disconnect();
          return;
        }

        fs.mkdirSync(processedFolderPath, { recursive: true }); 
        fs.mkdirSync(rejectedFolderPath, { recursive: true });

        let pdfFiles = fs
          .readdirSync(scannedDataPath)
          .filter((file) => file.toLowerCase().endsWith(".pdf"));

        if (pdfFiles.length === 0) {
          socket.emit(
            "status",
            "No PDFs found in the scanned folder. Terminating process."
          );
          activeNamespaces.delete(subjectCode);
          socket.disconnect();
          return;
        }

        let reportContent = `Processing Report for Subject: ${subjectCode}\n\nFile Name\t\tStatus\t\tTotal Pages\n`;
        let processedCount = 0;

        for (const pdfFile of pdfFiles) {
          const pdfPath = path.join(scannedDataPath, pdfFile);

          if (!fs.existsSync(pdfPath)) {
            console.warn(`Skipping missing file: ${pdfFile}`);
            continue;
          }

          try {
            const pdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const totalPages = pdfDoc.getPageCount();

            let targetFolderPath;
            let status;

            if (totalPages === schema.numberOfPage) {
              targetFolderPath = processedFolderPath;
              status = "Processed";
              processedCount++;
            } else {
              targetFolderPath = rejectedFolderPath;
              status = "Rejected";
            }

            fs.mkdirSync(targetFolderPath, { recursive: true });
            const targetFilePath = path.join(targetFolderPath, pdfFile);

            try {
              fs.renameSync(pdfPath, targetFilePath);
            } catch (err) {
              if (err.code === "ENOENT") {
                console.warn(`File already moved or missing: ${pdfFile}`);
                continue;
              }
              console.error(`Failed to move file ${pdfFile}:`, err.message);
              socket.emit("error", `Failed to move ${pdfFile}: ${err.message}`);
              continue;
            }

            reportContent += `${pdfFile}\t\t${status}\t\t${totalPages}\n`;
            socket.emit("status", { pdfFile, status, totalPages });
          } catch (error) {
            console.error(`Error processing ${pdfFile}:`, error.message);
            socket.emit("error", `Failed to process ${pdfFile}`);
          }
        }

        const remainingPdfs = fs
          .readdirSync(scannedDataPath)
          .filter((file) => file.toLowerCase().endsWith(".pdf"));
        const totalPdfsRemaining = remainingPdfs.length;

        const folderDetails = await SubjectFolderModel.findOne({
          folderName: subjectCode,
        });

        if (!folderDetails) {
          socket.emit(
            "error",
            "Folder details not found in database. Terminating process."
          );
          activeNamespaces.delete(subjectCode);
          socket.disconnect();
          return;
        }

        await SubjectFolderModel.updateOne(
          { folderName: subjectCode },
          {
            $set: { scannedFolder: totalPdfsRemaining },
            $inc: { unAllocated: processedCount },
          }
        );

        const reportDir = path.join(__dirname, "processedReport", subjectCode);
        fs.mkdirSync(reportDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "");
        const reportFileName = `${subjectCode}_${timestamp}.txt`;
        const reportFilePath = path.join(reportDir, reportFileName);

        fs.writeFileSync(reportFilePath, reportContent, "utf8");
        socket.emit("status", `Report saved as ${reportFileName}`);

        if (totalPdfsRemaining === 0) {
          socket.emit("status", "All PDFs processed. Folder is now empty.");
        } else {
          socket.emit(
            "status",
            `${totalPdfsRemaining} PDF(s) remain in the scanned folder.`
          );
        }

        socket.emit("status", "Processing completed!");
        // activeNamespaces.delete(subjectCode); // ✅ Unlock here
        // socket.disconnect();

        try {
          await autoAssigning(subjectCode);
          socketNamespace.emit("status", "Auto-assignment completed.");
          console.log("Auto-assignment completed.");
          activeNamespaces.delete(subjectCode); // ✅ Unlock here
          socketNamespace.disconnectSockets();
        } catch (err) {
          socket.emit("error", "Auto Assignment Failed.");
        }

        activeNamespaces.delete(subjectCode);
        socket.disconnect(true);
      });

      res.status(200).json({
        message: `Socket connection established for subjectCode: ${subjectCode}. Processing started.`,
      });
    }
  } catch (error) {
    console.error("Error processing booklets:", error.message);
    activeNamespaces.delete(subjectCode); // Safety
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const servingBooklets = async (req, res) => {
  const { subjectCode, bookletName } = req.query;

  if (!subjectCode || !bookletName) {
    return res
      .status(400)
      .json({ message: "Subject code and PDF name are required." });
  }

  // Construct the file path
  const pdfPath = path.join(
    __dirname,
    "scannedFolder",
    subjectCode,
    bookletName
  );

  // Check if the file exists
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ message: `PDF not found: ${bookletName}` });
  }

  // Set the response headers for PDF content
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${bookletName}"`);

  // Create a read stream and pipe it to the response to send the PDF file
  const fileStream = fs.createReadStream(pdfPath);
  fileStream.pipe(res);

  fileStream.on("error", (error) => {
    console.error("Error sending PDF file:", error);
    res.status(500).json({ message: "Failed to send PDF" });
  });
};

const removeRejectedBooklets = async (req, res) => {
  const { subjectCode } = req.query;

  if (!subjectCode) {
    return res.status(400).json({ message: "Subject code is required." });
  }

  try {
    // Define paths for the folders
    const scannedDataPath = path.join(__dirname, "scannedFolder", subjectCode);
    const rejectedFolderPath = path.join(
      __dirname,
      "rejectedBookletsFolder",
      subjectCode
    );

    // Check if the rejected folder exists for the given subject code
    if (!fs.existsSync(rejectedFolderPath)) {
      return res.status(404).json({ message: "Rejected folder not found." });
    }

    // Get the list of rejected booklets (PDFs)
    const rejectedFiles = fs
      .readdirSync(rejectedFolderPath)
      .filter((file) => file.endsWith(".pdf"));

    if (rejectedFiles.length === 0) {
      return res.status(404).json({ message: "No rejected booklets found." });
    }

    // Ensure the scanned folder exists
    if (!fs.existsSync(scannedDataPath)) {
      return res.status(404).json({ message: "Scanned folder not found." });
    }

    // Loop through each rejected file and remove it from both folders
    rejectedFiles.forEach((file) => {
      const rejectedFilePath = path.join(rejectedFolderPath, file);
      const scannedFilePath = path.join(scannedDataPath, file);

      // Remove the rejected file from the rejected folder
      if (fs.existsSync(rejectedFilePath)) {
        fs.unlinkSync(rejectedFilePath); // Remove rejected file
      }

      // Remove the rejected file from the scanned folder (if it exists there)
      if (fs.existsSync(scannedFilePath)) {
        fs.unlinkSync(scannedFilePath); // Remove scanned file
      }
    });

    

    // Send success response
    res.status(200).json({
      message:
        "Rejected booklets have been successfully removed from both folders.",
    });
  } catch (error) {
    console.error("Error removing rejected booklets:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const getAllBookletsName = async (req, res) => {
  const { subjectCode } = req.query;

  try {
    if (!subjectCode) {
      return res.status(400).json({ message: "Subject code is required." });
    }

    const subject = await Subject.findOne({ code: subjectCode });

    if (!subject) {
      return res
        .status(404)
        .json({ message: "Subject not found (create subject)." });
    }

    const courseSchemaDetails = await CourseSchemaRelation.findOne({
      subjectId: subject._id,
    });

    if (!courseSchemaDetails) {
      return res.status(404).json({
        message:
          "Schema not found for the subject (upload master answer and master question).",
      });
      // Check if subject exists
    }

    let schema = await Schema.findOne({ _id: courseSchemaDetails.schemaId });

    // Fetch course schema details for the subject
    if (!schema) {
      return res.status(404).json({ message: "Schema not found." });
    }

    // Check if course schema details exist
    const scannedDataPath = path.join(__dirname, "scannedFolder", subjectCode);

    if (!fs.existsSync(scannedDataPath)) {
      return res.status(404).json({ message: "Scanned folder not found." });
      // Fetch the schema using the course schema details
    }

    // Check if schema exists
    const files = fs
      .readdirSync(scannedDataPath)
      .filter((file) => file.endsWith(".pdf"));

    if (files.length === 0) {
      return res.status(404).json({ message: "No booklets found." });
    }
    // Define path for the scanned data folder

    res.status(200).json({ message: "Booklets found", booklets: files });
    // Check if scanned data folder exists
  } catch (error) {
    console.error("Error fetching booklets:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
  // Read PDF files from the scanned data folder
};

// Check if any booklets (PDFs) are found
const processingBookletsManually = async (req, res) => {
  const { subjectCode, bookletName } = req.body;

  // Step 1: Validate the input
  // Respond with the list of booklet names
  if (!subjectCode || !bookletName) {
    return res
      .status(400)
      .json({ message: "Subject code and booklet name are required." });
    // Handle errors
  }

  try {
    const subject = await Subject.findOne({ code: subjectCode });
    if (!subject) {
      return res
        .status(404)
        .json({ message: "Subject not found (create subject)." });
    }

    const courseSchemaDetails = await CourseSchemaRelation.findOne({
      subjectId: subject._id,
    });

    if (!courseSchemaDetails) {
      return res.status(404).json({
        message:
          "Schema not found for the subject (upload master answer and master question).",
      });
    }

    let schema = await Schema.findOne({ _id: courseSchemaDetails.schemaId });

    if (!schema) {
      return res.status(404).json({ message: "Schema not found." });
    }

    // Step 2: Set folder paths based on subjectCode
    const scannedDataPath = path.join(__dirname, "scannedFolder", subjectCode);
    const processedFolderPath = path.join(
      __dirname,
      "processedFolder",
      subjectCode
    );
    const rejectedFolderPath = path.join(
      __dirname,
      "rejectedBookletsFolder",
      subjectCode
    );

    // Step 3: Verify that the scanned folder exists
    if (!fs.existsSync(scannedDataPath)) {
      return res.status(404).json({
        message: "Scanned folder not found for the given subject code.",
      });
    }

    // Step 4: Check if the specific booklet exists in the scanned folder
    const pdfPath = path.join(scannedDataPath, bookletName);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        message: `Booklet ${bookletName} not found in the scanned folder.`,
      });
    }

    // Step 5: Load and process the PDF
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    // Step 6: Define the expected number of pages (for example, we expect 10 pages)
    const expectedPages = 10; // You can replace this with the actual expected number of pages based on schema

    let status = "";

    // Step 7: Check if the PDF's page count matches the expected number of pages
    if (totalPages === expectedPages) {
      // If PDF is processed, move it to the processed folder
      const processedPdfPath = path.join(processedFolderPath, bookletName);
      fs.mkdirSync(path.dirname(processedPdfPath), { recursive: true });
      fs.copyFileSync(pdfPath, processedPdfPath);
      status = "Processed";
    } else {
      // If PDF is rejected, move it to the rejected folder
      const rejectedPdfPath = path.join(rejectedFolderPath, bookletName);
      fs.mkdirSync(path.dirname(rejectedPdfPath), { recursive: true });
      fs.copyFileSync(pdfPath, rejectedPdfPath);
      status = "Rejected";
    }

    // Step 8: Return the result to the client
    return res.status(200).json({
      message: `Processing completed for ${bookletName}.`,
      status,
      totalPages,
      pdfName: bookletName,
    });
  } catch (error) {
    console.error("Error processing booklet:", error.message);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export {
  processingBookletsBySocket,
  servingBooklets,
  removeRejectedBooklets,
  getAllBookletsName,
  processingBookletsManually,
};
