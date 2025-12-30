import fs from "fs";
import path from "path";
import Task from "../../models/taskModels/taskModel.js";
import { io } from "../../server.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";
import User from "../../models/authModels/User.js";
import SubjectSchemaRelation from "../../models/subjectSchemaRelationModel/subjectSchemaRelationModel.js";
import AnswerPdf from "../../models/EvaluationModels/studentAnswerPdf.js";
import Schema from "../../models/schemeModel/schema.js";

import QuestionDefinition from "../../models/schemeModel/questionDefinitionSchema.js";
import mongoose from "mongoose";
import extractImagesFromPdf from "./extractImagesFromPDF.js";
import AnswerPdfImage from "../../models/EvaluationModels/answerPdfImageModel.js";
import Marks from "../../models/EvaluationModels/marksModel.js";
import { __dirname } from "../../server.js";
import Subject from "../../models/classModel/subjectModel.js";
import SubjectFolderModel from "../../models/StudentModels/subjectFolderModel.js";
import Icon from "../../models/EvaluationModels/iconModel.js";
import { subjectsWithTasks } from "../classControllers/subjectControllers.js";

const assigningTask = async (req, res) => {
  const { userId, subjectCode, bookletsToAssign } = req.body;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!userId || !subjectCode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const subjectCodes = user.subjectCode;

    if (!subjectCodes || subjectCodes.length === 0) {
      return res
        .status(404)
        .json({ message: "No subjects found for the user." });
    }

    const subjectDetails = await Subject.find({ _id: { $in: subjectCodes } });
    // console.log("subjectDetails", subjectDetails);

    // If no subjects found
    if (subjectDetails.length === 0) {
      return res
        .status(404)
        .json({ message: "No subjects found for the given IDs." });
    }

    // Check if the subject code exists
    const subject = subjectDetails.find(
      (subject) => subject.code === subjectCode
    );

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found (upload master and question booklet).",
      });
    }

    // Check if the folder for the subject code exists
    const rootFolder = path.join(__dirname, "processedFolder");
    const subjectFolder = path.join(rootFolder, subjectCode);

    if (!fs.existsSync(subjectFolder)) {
      return res.status(404).json({ message: "Subject folder not found." });
    }

    // Get all PDFs in the folder
    const allPdfs = fs
      .readdirSync(subjectFolder)
      .filter((file) => file.endsWith(".pdf"));

    // Get already assigned PDFs for this subjectCode
    // const assignedPdfs = await AnswerPdf.find({
    //   taskId: { $in: await Task.find({ subjectCode }).select("_id") },
    // });

    // const assignedPdfNames = assignedPdfs.map((pdf) => pdf.answerPdfName);

    // // Find unassigned PDFs
    // const unassignedPdfs = allPdfs.filter(
    //   (pdf) => !assignedPdfNames.includes(pdf)
    // );

    // if (unassignedPdfs.length === 0) {
    //   return res
    //     .status(400)
    //     .json({ message: "All booklets are already assigned." });
    // }
    // SAME PDF CAN BE ASSIGNED TO MULTIPLE EVALUATORS

    const taskIds = await Task.find({ userId }).distinct("_id");

    console.log("taskIds", taskIds);

    const result = await AnswerPdf.aggregate([
      { $match: { status: false, taskId: { $in: taskIds } } },
      { $group: { _id: "$taskId" } },
      { $count: "uniqueCount" },
    ]);

    const previouslyAssigned = result[0]?.uniqueCount || 0;

    console.log(previouslyAssigned); // 9

    console.log("previouslyAssigned", previouslyAssigned);

    console.log(
      "current status",
      Number(bookletsToAssign) + previouslyAssigned
    );

    // validate total assignment limit
    if (previouslyAssigned + Number(bookletsToAssign) > user.maxBooklets) {
      return res.status(400).json({
        message: `User can be assigned maximum ${user.maxBooklets} booklets. Already assigned ${previouslyAssigned}, requested ${bookletsToAssign}.`,
      });
    }

    const pdfsToBeAssigned = allPdfs.slice(0, bookletsToAssign);

    if (pdfsToBeAssigned.length === 0) {
      return res.status(400).json({ message: "No PDFs found to assign." });
    }

    // Determine the number of PDFs to assign in this request

    // Create a new task for this assignment
    let task = await Task.findOne({
      userId: user._id,
      subjectCode,
    }).session(session);

    // If NO existing task → create one
    if (!task) {
      task = new Task({
        subjectCode,
        userId: user._id,
        totalBooklets: 0,
        status: "inactive",
        currentFileIndex: 1,
      });

      await task.save({ session });
    }

    // Increase task booklet count
    task.totalBooklets += pdfsToBeAssigned.length;
    await task.save({ session });

    // Save the assigned PDFs in the AnswerPdf model
    const answerPdfDocs = pdfsToBeAssigned.map((pdf) => ({
      taskId: task._id,
      answerPdfName: pdf,
      status: false,
    }));

    await AnswerPdf.insertMany(answerPdfDocs, { session });

    // =========================
    //   GLOBAL COUNTS LOGIC
    // =========================

    // 1️⃣ All tasks created for this subject (GLOBAL)
    const subjectTaskIds = await Task.find({ subjectCode })
      .session(session)
      .distinct("_id");

    const allocated = await AnswerPdf.countDocuments({
      taskId: { $in: subjectTaskIds },
    }).session(session);
    console.log("GLOBAL allocated:", allocated);

    // 3️⃣ evaluation_pending = ALL PDFs where status:false (GLOBAL)
    const evaluation_pending = await AnswerPdf.countDocuments({
      taskId: { $in: subjectTaskIds },
      status: false,
    }).session(session);

    // 4️⃣ evaluated = ALL PDFs where status:true (GLOBAL)
    const evaluated = await AnswerPdf.countDocuments({
      taskId: { $in: subjectTaskIds },
      status: true,
    }).session(session);

    // 5️⃣ unAllocated = total PDFs - allocated
    let unAllocated = allPdfs.length - allocated;
    if (unAllocated < 0) unAllocated = 0;

    console.log("GLOBAL allocated:", allocated);
    console.log("GLOBAL evaluation_pending:", evaluation_pending);
    console.log("GLOBAL evaluated:", evaluated);
    console.log("GLOBAL unAllocated:", unAllocated);

    // 6️⃣ Update subject folder document
    await SubjectFolderModel.findOneAndUpdate(
      { folderName: subjectCode },
      {
        $set: {
          allocated,
          evaluation_pending,
          evaluated,
          unAllocated,
          updatedAt: new Date(),
        },
      },
      { session }
    );

    await session.commitTransaction();

    return res.status(201).json({
      message: `${pdfsToBeAssigned.length} Booklets assigned successfully.`,
      assignedPdfs: pdfsToBeAssigned,
    });
  } catch (error) {
    session.endSession();
    console.error("Error assigning task:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while assigning the task." });
  }
};
const autoAssigning = async (req, res) => {
  const { subjectCode } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const subject = await Subject.findOne({ code: subjectCode });

    if (!subject) {
      console.error(`Subject ${subjectCode} not found.`);
      await session.abortTransaction();
      return;
    }

    const users = await User.find({ subjectCode: subject._id });

    if (users.length === 0) {
      console.warn(`No users found for subject ${subjectCode}.`);
      await session.abortTransaction();
      return;
    }

    const processedFolderPath = path.join(
      __dirname,
      "processedFolder",
      subjectCode
    );

    if (!fs.existsSync(processedFolderPath)) {
      console.error(`Folder for subject ${subjectCode} not found.`);
      await session.abortTransaction();
      return;
    }

    // ALL PDFs in subject folder
    const allPdfs = fs
      .readdirSync(processedFolderPath)
      .filter((file) => file.endsWith(".pdf"));

    if (allPdfs.length === 0) {
      console.log(`No PDFs found for subject ${subjectCode}.`);
      await session.abortTransaction();
      return;
    }

    let unallocatedPdfs = (
      await SubjectFolderModel.findOne(
        { folderName: subjectCode },
        { unAllocated: 1, _id: 0 }
      ).lean()
    )?.unAllocated;

    // 2. FIRST TIME running → treat all PDFs as unallocated
    if (unallocatedPdfs === undefined) {
      unallocatedPdfs = allPdfs.length;
    }

    console.log("previousUnallocated →", unallocatedPdfs);

    // 3. Extract only remaining unallocated PDFs
    let newPdfs;

    if (unallocatedPdfs === allPdfs.length) {
      // first run → assign everything
      newPdfs = allPdfs;
    } else {
      // assign last unAllocated PDFs
      newPdfs = allPdfs.slice(-unallocatedPdfs);
    }

    console.log("PDFs to be assigned now:", newPdfs);

    const numUsers = users.length;
    let assignmentIndex = 0;
    let totalAssigned = 0;

    // ⭐ MAIN ASSIGNMENT LOOP ⭐
    for (const pdfFile of newPdfs) {
      let assigned = false;

      // Try to assign this PDF to someone
      for (let u = 0; u < numUsers; u++) {
        const user = users[assignmentIndex % numUsers];
        const maxBooklets = user.maxBooklets || 0;

        // Count how many PDFs assigned to THIS user already
        // const userAssignedCount = await AnswerPdf.countDocuments({
        //   taskId: {
        //     $in: await Task.find({
        //       userId: user._id,
        //       subjectCode,
        //     }).distinct("_id"),
        //   },
        // }).session(session);

        const userAssigned = await Task.aggregate([
          {
            $match: {
              userId: user._id,
              subjectCode,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalBooklets" },
            },
          },
        ]).session(session);

        const userAssignedCount = userAssigned[0]?.total ?? 0;

        console.log("userAssignedCount =", userAssignedCount);

        // If user already reached maximum → skip
        if (userAssignedCount >= maxBooklets) {
          assignmentIndex++;
          continue;
        }

        // FETCH existing task for this user
        let task = await Task.findOne({
          userId: user._id,
          subjectCode,
        }).session(session);

        // If NO existing task → create one
        if (!task) {
          task = new Task({
            subjectCode,
            userId: user._id,
            totalBooklets: 0,
            status: "inactive",
            currentFileIndex: 1,
          });

          await task.save({ session });
        }

        // SAVE this booklet under task
        await new AnswerPdf({
          taskId: task._id,
          answerPdfName: pdfFile,
          status: false,
        }).save({ session });

        // Increase task booklet count
        task.totalBooklets += 1;
        await task.save({ session });

        assignmentIndex++;
        totalAssigned++;
        assigned = true;
        break; // stop looping user list for this PDF
      }

      // If NOT assigned to anyone → stop entirely
      if (!assigned) {
        console.log("⚠ No user has remaining capacity.");
        break;
      }
    }

    // -------- SUBJECT FOLDER MODEL UPDATE --------
    const allTaskIds = await Task.find({ subjectCode })
      .distinct("_id")
      .session(session);

    const evaluationPending = await AnswerPdf.countDocuments({
      status: false,
      taskId: { $in: allTaskIds },
    }).session(session);

    console.log("evaluationPending", evaluationPending);

    const evaluated = await AnswerPdf.countDocuments({
      status: true,
      taskId: { $in: allTaskIds },
    }).session(session);

    console.log("evaluated", evaluated);

    // total PDFs in folder - total assigned = unallocated

    //this will check subjectFolderModel for currently unallocated count and allocated count and evaluation pending count and evaluated count
    const previousUnallocated =
      (
        await SubjectFolderModel.findOne(
          { folderName: subjectCode },
          { unAllocated: 1, _id: 0 }
        ).lean()
      )?.unAllocated ?? 0;
    console.log("previousUnallocated", previousUnallocated);

    let unAllocated = 0;

    if (previousUnallocated === 0) {
      unAllocated = newPdfs.length - totalAssigned;
    } else {
      unAllocated = previousUnallocated - totalAssigned;
    }

    const previouslyAllocated =
      (
        await SubjectFolderModel.findOne(
          { folderName: subjectCode },
          { allocated: 1, _id: 0 }
        ).lean()
      )?.allocated ?? 0;
    console.log("previouslyAllocated", previouslyAllocated);

    let allocated = 0;
    if (previouslyAllocated === 0) {
      allocated = totalAssigned;
    } else {
      allocated = previouslyAllocated + totalAssigned;
    }

    await SubjectFolderModel.findOneAndUpdate(
      { folderName: subjectCode },
      {
        $set: {
          allocated: allocated,
          evaluation_pending: evaluationPending,
          evaluated: evaluated,
          unAllocated: unAllocated,
        },
        updatedAt: new Date(),
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log(
      `Auto-assigned ${totalAssigned} booklets for subject ${subjectCode}.`
    );
    res.status(200).json({
      message: `Auto-assigned ${totalAssigned} booklets for subject ${subjectCode}.`,
    });
  } catch (error) {
    console.error("Error during auto-assignment:", error);
    await session.abortTransaction();
    session.endSession();
    res
      .status(500)
      .json({ error: "An error occurred during auto-assignment." });
  }
};

// const pauseTask = async (req, res) => {
//   const { id } = req.params;

//   try {
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid task ID." });
//     }

//     const task = await Task.findById(id);
//     console.log(task.remainingTimeInSec);
//     if (!task) {
//       return res.status(404).json({ message: "Task not found." });
//     }

//     // Task must be active and started
//     if (task.status !== "active") {
//       return res
//         .status(400)
//         .json({ message: "Only active tasks can be paused." });
//     }

//     if (!task.startTime) {
//       return res
//         .status(400)
//         .json({ message: "Start time not set for this task." });
//     }

//     // Get evaluation time from schema
//     const subject = await Subject.findOne({ code: task.subjectCode });
//     if (!subject) {
//       return res.status(404).json({ message: "Subject not found." });
//     }

//     const schemaRel = await SubjectSchemaRelation.findOne({
//       subjectId: subject._id,
//     });
//     if (!schemaRel) {
//       return res.status(404).json({ message: "Schema relation not found." });
//     }

//     const schema = await Schema.findById(schemaRel.schemaId);
//     if (!schema) {
//       return res.status(404).json({ message: "Schema not found." });
//     }

//     const evaluationTimeInMinutes = schema.evaluationTime;
//     if (
//       !evaluationTimeInMinutes ||
//       typeof evaluationTimeInMinutes !== "number"
//     ) {
//       return res
//         .status(400)
//         .json({ message: "Invalid evaluation time in schema." });
//     }

//     const now = new Date();

//     const lastResumedAt = new Date(task.lastResumedAt);
//     const elapsedSeconds = Math.floor((now - lastResumedAt) / 1000);

//     const prevRemaining =
//       task.remainingTimeInSec != null
//         ? task.remainingTimeInSec
//         : evaluationTimeInMinutes * 60;

//     let remainingSeconds = prevRemaining - elapsedSeconds;
//     if (remainingSeconds < 0) remainingSeconds = 0;

//     // Update the task
//     task.remainingTimeInSec = remainingSeconds;
//     task.status = "paused";

//     await task.save();

//     // Format to HH:mm:ss
//     const formatSecondsToHHMMSS = (totalSeconds) => {
//       const hrs = Math.floor(totalSeconds / 3600);
//       const mins = Math.floor((totalSeconds % 3600) / 60);
//       const secs = totalSeconds % 60;
//       return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
//         2,
//         "0"
//       )}:${String(secs).padStart(2, "0")}`;
//     };

//     return res.status(200).json({
//       message: "Task paused successfully.",

//       remainingTimeInSec: formatSecondsToHHMMSS(remainingSeconds),
//     });
//   } catch (err) {
//     console.error("Error in pauseTask:", err);
//     return res
//       .status(500)
//       .json({ message: "Failed to pause task", error: err.message });
//   }
// };

// const updateAssignedTask = async (req, res) => {
//   const { id } = req.params;
//   const { status, remainingTimeInSec } = req.body;

//   try {
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid task ID." });
//     }

//     const task = await Task.findById(id);
//     if (!task) {
//       return res.status(404).json({ message: "Task not found." });
//     }

//     // Update task fields
//     if (status) task.status = status;
//     if (remainingTimeInSec !== undefined)
//       task.remainingTimeInSec = remainingTimeInSec;

//     await task.save();

//     return res
//       .status(200)
//       .json({ message: "Task updated successfully.", task });
//   } catch (err) {
//     console.error("Error in updateAssignedTask:", err);
//     return res
//       .status(500)
//       .json({ message: "Failed to update task", error: err.message });
//   }
// };

const removeAssignedTask = async (req, res) => {
  const { id } = req.params;

  try {
    // Validate task ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    // Start a session to handle the deletion as a transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    // Validate if the provided task ID is a valid MongoDB ObjectId

    try {
      // Find and delete the task
      const task = await Task.findByIdAndDelete(id, { session });
      if (!task) {
        // Start a MongoDB session to handle the deletion as a transaction
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Task not found" });
      }

      // Attempt to find and delete the task by its ID
      // Delete all related AnswerPdf documents
      await AnswerPdf.deleteMany({ taskId: id }, { session });

      // If the task doesn't exist, abort the transaction and return a 404 response
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res
        .status(200)
        .json({ message: "Task and associated PDFs deleted successfully" });
      // Delete all AnswerPdf documents associated with the task ID
    } catch (error) {
      // Rollback the transaction in case of an error
      await session.abortTransaction();
      // Commit the transaction after successful deletions
      session.endSession();
      console.error("Error during task and PDF deletion:", error);
      res.status(500).json({
        message: "Failed to delete task and associated PDFs",
        error: error.message,
      });
    }
    // Send a success response after task and its PDFs are deleted
  } catch (error) {
    console.error("Error deleting task:", error);
    // Rollback the transaction in case of an error during deletion
    res
      .status(500)
      .json({ message: "Failed to delete task", error: error.message });
  }
};
// const activeTimers = {}; // To track active timers per task
const getAssignTaskById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // If start time isn't set, initialize it now
    if (!task.startTime) {
      task.startTime = new Date();
      task.lastResumedAt = new Date(); // new field
      task.status = "active";

      await task.save();
    }

    const subject = await Subject.findOne({ code: task.subjectCode });

    if (!subject) {
      return res
        .status(404)
        .json({ message: "Subject not found (create subject)." });
    }

    const courseSchemaRel = await SubjectSchemaRelation.findOne({
      subjectId: subject._id,
    });
    if (!courseSchemaRel) {
      return res.status(404).json({
        message:
          "Schema not found for subject (upload master answer and master question).",
      });
    }

    const schemaDetails = await Schema.findById(courseSchemaRel.schemaId);
    if (!schemaDetails) {
      return res.status(404).json({ message: "Schema not found." });
    }

    const minTime = schemaDetails.minTime; // in minutes
    const maxTime = schemaDetails.maxTime; // in minutes

    // --- Utility: format seconds to HH:mm:ss ---
    const formatSecondsToHHMMSS = (totalSeconds) => {
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      const hStr = String(hrs).padStart(2, "0");
      const mStr = String(mins).padStart(2, "0");
      const sStr = String(secs).padStart(2, "0");
      return `${hStr}:${mStr}:${sStr}`;
    };

    // ✅ MODIFIED: Calculate remaining time logic
    let remainingSeconds = 0;

    if (task.status === "paused" && task.remainingTimeInSec != null) {
      remainingSeconds = task.remainingTimeInSec;
      task.lastResumedAt = new Date();
      task.status = "active";
    } else if (task.status === "active" && task.lastResumedAt) {
      // Calculate elapsed time since last resume
      const elapsedSeconds = Math.floor(
        (new Date() - task.lastResumedAt) / 1000
      );
      remainingSeconds = Math.max(
        (task.remainingTimeInSec ?? maxTime * 60) - elapsedSeconds,
        0
      );
    } else {
      remainingSeconds =maxTime * 60;
    }

    const rootFolder = path.join(__dirname, "processedFolder");
    const subjectFolder = path.join(rootFolder, task.subjectCode);

    if (!fs.existsSync(subjectFolder)) {
      return res.status(404).json({ message: "Subject folder not found." });
    }

    const extractedBookletsFolder = path.join(
      subjectFolder,
      "extractedBooklets"
    );
    if (!fs.existsSync(extractedBookletsFolder)) {
      fs.mkdirSync(extractedBookletsFolder, { recursive: true });
    }

    const assignedPdfs = await AnswerPdf.find({ taskId: task._id });
    assignedPdfs.forEach((pdf, index) => {
      console.log(`   PDF ${index + 1}: ${pdf.answerPdfName}`);
    });
    if (assignedPdfs.length === 0) {
      return res
        .status(404)
        .json({ message: "No PDFs assigned to this task." });
    }
    console.log(`📊 TOTAL PDFS ASSIGNED: ${assignedPdfs.length}`);

    const currentPdf = assignedPdfs[task.currentFileIndex - 1];
    console.log(`📄 CURRENT PDF ID: ${currentPdf._id}`);
    if (!currentPdf) {
      return res
        .status(404)
        .json({ message: "No PDF found for the current file index." });
    }

    console.log(`📄 CURRENT PDF: ${currentPdf.answerPdfName}`);
    console.log(`📁 Current File Index: ${task.currentFileIndex}`);

    const pdfPath = path.join(subjectFolder, currentPdf.answerPdfName);
    if (!fs.existsSync(pdfPath)) {
      return res
        .status(404)
        .json({ message: `PDF file ${currentPdf.answerPdfName} not found.` });
    }

    const extractedImages = await AnswerPdfImage.find({
      answerPdfId: currentPdf._id,
    });
    console.log(
      `🖼️ EXISTING EXTRACTED IMAGES IN DATABASE: ${extractedImages.length}`
    );

    let extractedBookletPath = `processedFolder/${
      task.subjectCode
    }/extractedBooklets/${path.basename(currentPdf.answerPdfName, ".pdf")}`;

    const currentPdfFolder = path.join(
      extractedBookletsFolder,
      path.basename(currentPdf.answerPdfName, ".pdf")
    );

    // Define directory structure for completedFolder
    const completedFolder = path.join(__dirname, "completedFolder");
    const subjectCompletedFolder = path.join(completedFolder, task.subjectCode);
    const bookletFolder = path.join(
      subjectCompletedFolder,
      path.basename(currentPdf.answerPdfName, ".pdf")
    );

    if (!fs.existsSync(completedFolder)) fs.mkdirSync(completedFolder);
    if (!fs.existsSync(subjectCompletedFolder))
      fs.mkdirSync(subjectCompletedFolder);
    if (!fs.existsSync(bookletFolder)) fs.mkdirSync(bookletFolder);

    const hiddenPages = schemaDetails.hiddenPage || [];
    console.log("hiddenPages", hiddenPages);

    // if (extractedImages.length > 0) {
    //   // MOVE HIDDEN IMAGES TO SECURE LOCATION
    //   for (const [index, image] of extractedImages.entries()) {
    //     if (hiddenPages.includes(index)) {
    //       const sourceImagePath = path.join(currentPdfFolder, image.name);
    //       const destinationImagePath = path.join(bookletFolder, image.name);

    //       if (fs.existsSync(sourceImagePath)) {
    //         // Move hidden image to completedFolder (secure location)
    //         fs.renameSync(sourceImagePath, destinationImagePath);
    //         console.log(`Moved hidden image: ${image.name} to secure location`);
    //       }
    //     }
    //   }

    //   const visibleImages = extractedImages.filter(
    //     (_, index) => !hiddenPages.includes(index)
    //   );

    //   return res.status(200).json({
    //     task,
    //     remainingSeconds,
    //     answerPdfDetails: currentPdf,
    //     schemaDetails,
    //     extractedBookletPath,
    //     answerPdfImages: visibleImages,
    //   });
    // }
    if (extractedImages.length > 0) {
      // MOVE HIDDEN IMAGES TO SECURE LOCATION IMMEDIATELY AFTER EXTRACTION
      const hiddenImages = extractedImages.filter((_, index) =>
        hiddenPages.includes(index)
      );

      console.log("hidden images", hiddenImages);

      for (const image of hiddenImages) {
        const sourceImagePath = path.join(currentPdfFolder, image.name);
        const destinationImagePath = path.join(bookletFolder, image.name);

        if (fs.existsSync(sourceImagePath)) {
          // Move hidden image to completedFolder (secure location)
          fs.renameSync(sourceImagePath, destinationImagePath);
          console.log(`Moved hidden image: ${image.name} to secure location`);
        } else {
          console.error(`Hidden image not found: ${sourceImagePath}`);
        }
      }

      const visibleImages = extractedImages.filter(
        (_, index) => !hiddenPages.includes(index)
      );

      return res.status(200).json({
        task,
        remainingSeconds,
        answerPdfDetails: currentPdf,
        schemaDetails,
        extractedBookletPath,
        answerPdfImages: visibleImages,
      });
    }

    // If no extracted images exist, extract them
    if (!fs.existsSync(currentPdfFolder)) {
      fs.mkdirSync(currentPdfFolder, { recursive: true });
    }

    const imageFiles = await extractImagesFromPdf(pdfPath, currentPdfFolder);

    const imageDocs = imageFiles.map((imageFileName, i) => ({
      answerPdfId: currentPdf._id,
      name: imageFileName,
      status: i === 0 ? "visited" : "notVisited",
    }));

    const insertedImages = await AnswerPdfImage.insertMany(imageDocs);

    // MOVE HIDDEN IMAGES TO SECURE LOCATION IMMEDIATELY AFTER EXTRACTION
    const hiddenImages = insertedImages.filter((_, index) =>
      hiddenPages.includes(index)
    );

    for (const image of hiddenImages) {
      const sourceImagePath = path.join(currentPdfFolder, image.name);
      const destinationImagePath = path.join(bookletFolder, image.name);

      if (fs.existsSync(sourceImagePath)) {
        // Move hidden image to completedFolder (secure location)
        fs.renameSync(sourceImagePath, destinationImagePath);
        console.log(`Moved hidden image: ${image.name} to secure location`);
      } else {
        console.error(`Hidden image not found: ${sourceImagePath}`);
      }
    }

    const visibleImages = insertedImages.filter(
      (_, index) => !hiddenPages.includes(index)
    );

    return res.status(200).json({
      task,
      remainingSeconds,
      answerPdfDetails: currentPdf,
      schemaDetails,
      extractedBookletPath,
      answerPdfImages: visibleImages,
    });
  } catch (error) {
    console.error("Error fetching task:", error.message);
    res
      .status(500)
      .json({ message: "Failed to process task", error: error.message });
  }
};

// Utility to clear interval for a task

const getAllTaskHandler = async (req, res) => {
  try {
    const tasks = await Task.find().populate("userId", "name email");
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch tasks", error: error.message });
  }
};

const getAllAssignedTaskByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }
    const tasks = await Task.find({
      userId,
      status: { $ne: "success" },
    });

    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found.", tasks: [] });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch tasks", error: error.message });
  }
};

const updateCurrentIndex = async (req, res) => {
  const { id } = req.params;
  const { currentIndex } = req.body;

  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    if (!currentIndex) {
      return res.status(400).json({ message: "Invalid current index." });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Ensure currentIndex is a valid number and within the range of totalFiles
    if (currentIndex < 1 || currentIndex > task.totalFiles) {
      return res.status(400).json({
        message: `currentIndex should be between 1 and ${task.totalFiles}`,
      });
    }

    // Update currentFileIndex
    task.currentFileIndex = currentIndex;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res
      .status(500)
      .json({ message: "Failed to update task", error: error.message });
  }
};

const getQuestionDefinitionTaskId = async (req, res) => {
  const { answerPdfId, taskId } = req.query;

  try {
    // Validate IDs
    if (!isValidObjectId(taskId)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    if (!isValidObjectId(answerPdfId)) {
      return res.status(400).json({ message: "Invalid answerPdfId." });
    }

    // Retrieve the task
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subject = await Subject.findOne({ code: task.subjectCode });

    if (!subject) {
      return res
        .status(404)
        .json({ message: "Subject not found (create subject)." });
    }

    const courseSchemaDetails = await SubjectSchemaRelation.findOne({
      subjectId: subject._id,
    });

    if (!courseSchemaDetails) {
      return res.status(404).json({
        message:
          "Schema not found for the subject (upload master answer and master question).",
      });
    }

    const schemaDetails = await Schema.findOne({
      _id: courseSchemaDetails.schemaId,
    });

    if (!schemaDetails) {
      return res.status(404).json({ message: "Schema not found." });
    }

    // Fetch all QuestionDefinitions for the schema
    const questionDefinitions = await QuestionDefinition.find({
      schemaId: schemaDetails.id,
    });

    if (!questionDefinitions || questionDefinitions.length === 0) {
      return res.status(404).json({ message: "No QuestionDefinitions found" });
    }

    // Fetch Marks data based on the provided answerPdfId and questionDefinitionId
    const marksData = await Marks.find({ answerPdfId: answerPdfId });

    // Add marks related data to the question definitions
    const enrichedQuestionDefinitions = await Promise.all(
      questionDefinitions.map(async (question) => {
        // Find the related Marks entry for the current questionDefinitionId
        const marks = marksData.find(
          (m) => m.questionDefinitionId.toString() === question._id.toString()
        );

        // If Marks entry exists, add its data, otherwise leave as empty
        const marksInfo = marks
          ? {
              allottedMarks: marks.allottedMarks,
              answerPdfId: marks.answerPdfId,
              timerStamps: marks.timerStamps,
              isMarked: marks.isMarked,
            }
          : {
              allottedMarks: 0,
              answerPdfId: answerPdfId,
              timerStamps: "",
              isMarked: false,
            };

        // Return the enriched question with Marks data
        return {
          ...question.toObject(),
          ...marksInfo,
        };
      })
    );

    // Send the enriched data as a response
    res.status(200).json(enrichedQuestionDefinitions);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch tasks", error: error.message });
  }
};

const getAllTasksBasedOnSubjectCode = async (req, res) => {
  const { subjectcode } = req.query;

  try {
    if (!subjectcode) {
      return res.status(400).json({ message: "Subject code is required." });
    }

    const tasks = await Task.find({ subjectCode: subjectcode }).populate(
      "userId",
      "name email"
    );

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch tasks", error: error.message });
  }
};

const getUsersFormanualAssign = async (req, res) => {
  const { subjectCode } = req.params;

  let usersFormanualAssign = [];

  try {
    const subject = await Subject.findOne({ code: subjectCode });

    if (!subject) {
      return res.status(404).json({ message: "Invalid subject code" });
    }

    const subjectId = subject._id;

    // All users mapped to this subject
    const users = await User.find({ subjectCode: subjectId });

    for (const user of users) {
      const maximumBooklets = user.maxBooklets || 0;
      console.log("maximumBooklets", maximumBooklets);

      // IMPORTANT: ensure Task.subjectCode matches correct field type
      const result = await Task.aggregate([
        {
          $match: { userId: user._id, status: { $in: ["active", "inactive"] } },
        },
        { $group: { _id: null, total: { $sum: "$totalBooklets" } } },
      ]);

      const assignedBooklets = result.length ? result[0].total : 0;
      console.log("assignedBooklets", assignedBooklets);

      usersFormanualAssign.push({
        userId: user._id,
        name: user.name,
        email: user.email,
        maxBooklets: maximumBooklets,
        assignedBooklets,
        remaining: maximumBooklets - assignedBooklets,
      });
    }

    return res.status(200).json(usersFormanualAssign);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// const completedBookletHandler = async (req, res) => {
//   const { answerpdfid } = req.params;

//   try {
//     // Validate answerPdfId
//     if (!isValidObjectId(answerpdfid)) {
//       return res.status(400).json({ message: "Invalid task ID." });
//     }

//     const currentPdf = await AnswerPdf.findOne({ _id: answerpdfid });
//     if (!currentPdf) {
//       return res
//         .status(404)
//         .json({ message: "No PDF found for the current file index." });
//     }

//     const task = await Task.findById(currentPdf.taskId);
//     if (!task) {
//       return res.status(404).json({ message: "Task not found." });
//     }

// Find all tasks related to the same subjectCode
// const tasks = await Task.find({ subjectCode: task.subjectCode });

//     // Check if all images are annotated
//     const answerPdfImages = await AnswerPdfImage.find({
//       answerPdfId: currentPdf._id,
//     });
//     const iconsCheck = await Promise.all(
//       answerPdfImages.map(async (answerPdfImage) => {
//         const iconExists = await Icon.findOne({
//           answerPdfImageId: answerPdfImage._id,
//         });
//         return iconExists;
//       })
//     );

//     // if (iconsCheck.includes(null)) {
//     //   return res.status(404).json({
//     //     message: "Ensure all answer sheets are annotated/marked.",
//     //     success: false,
//     //   });
//     // }

//     // Update AnswerPdf status to 'true'
//     await AnswerPdf.findByIdAndUpdate(currentPdf._id, { status: true });

//     let totalBooklets = 0;
//     let completedBooklets = 0;

//     // Process each task and update the booklet counts
//     for (const currentTask of tasks) {
//       const answerPdfs = await AnswerPdf.find({
//         taskId: currentTask._id,
//         status: true,
//       });
//       totalBooklets += currentTask.totalBooklets;
//       completedBooklets += answerPdfs.length;
//     }

//     const subjectFolderDetails = await SubjectFolderModel.findOne({
//       folderName: task.subjectCode,
//     });
//     if (!subjectFolderDetails) {
//       return res.status(404).json({ message: "Subject folder not found" });
//     }

//     // Update folder details
//     subjectFolderDetails.evaluated = completedBooklets;
//     subjectFolderDetails.evaluation_pending = totalBooklets - completedBooklets;
//     await subjectFolderDetails.save();

//     // Check if all booklets are completed
//     if (completedBooklets === totalBooklets) {
//       task.status = "success";
//       await task.save();
//       return res
//         .status(200)
//         .json({ message: "Task is completed", success: true });
//     }

//     res.status(200).json({
//       message: "All images have been annotated/marked.",
//       success: true,
//     });
//   } catch (error) {
//     console.error("Error in completedBookletHandler:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to complete task", error: error.message });
//   }
// }

const completedBookletHandler = async (req, res) => {
  try {
    const { answerpdfid, userId, submitted } = req.params;

    const taskId = await AnswerPdf.findById(answerpdfid)
      .select("taskId")
      .lean();

      console.log("taskId", taskId);

    const subjectCode = await Task.findById(taskId)
      .select("subjectCode")
      .lean();

      console.log("subjectCode", subjectCode);

    const subjectName = await Subject
      .findOne({ code: subjectCode })
      .select("name")
      .lean();

      console.log("subjectName", subjectName);

    const { minTime, maxTime } = await Schema
      .findOne({ name: subjectName })
      .select("minTime maxTime")
      .lean();

    console.log("minTime, maxTime", minTime, maxTime);
    
    const effectiveTime = Math.max(minTime, submitted);

    const efficiency = Math.max(
      0,
      Math.min(
        100,
        Math.round(((maxTime - effectiveTime) / (maxTime - minTime)) * 100)
      )
    );

    // 6️⃣ PUSH efficiency into array
    await Task.updateOne(
      {
        _id: taskId,
        userId,
        subjectCode,
      },  
      {
        $push: { efficiency },
      }
    );

    await User.updateOne(
      { _id: userId },
      {
        $push: { efficiency },
      } 
    )

    if (!answerpdfid) {
      return res.status(400).json({
        success: false,
        message: "answerpdfid is required",
      });
    }

    console.log("Starting sync for booklet:", answerpdfid);

    const folderPath = path.join(
      "Annotations",
      String(userId),
      String(answerpdfid)
    );

    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({
        success: false,
        message: "Annotations folder not found",
      });
    }

    // Get all page JSON files
    const files = fs
      .readdirSync(folderPath)
      .filter((file) => file.startsWith("page_") && file.endsWith(".json"));

    let bulkOps = [];

    for (const file of files) {
      const pageNumber = Number(file.replace("page_", "").replace(".json", ""));
      const filePath = path.join(folderPath, file);

      let jsonData;

      try {
        jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (err) {
        console.log(`⚠ Skipping invalid JSON: ${file}`);
        continue;
      }

      const annotations = jsonData.annotations || [];

      for (const a of annotations) {
        // Skip if required fields missing
        if (
          !a.id ||
          !a.answerPdfImageId ||
          !a.questionDefinitionId ||
          !a.iconUrl ||
          !a.question ||
          !a.timeStamps
        ) {
          console.log("⚠ Skipping incomplete annotation:", a);
          continue;
        }

        bulkOps.push({
          updateOne: {
            filter: { annotationId: a.id }, // custom ID
            update: {
              $set: {
                annotationId: a.id,
                answerPdfImageId: a.answerPdfImageId,
                questionDefinitionId: a.questionDefinitionId,
                iconUrl: a.iconUrl,
                question: String(a.question),
                timeStamps: a.timeStamps,
                x: String(a.x),
                y: String(a.y),
                width: String(a.width),
                height: String(a.height),
                mark: String(a.mark),
                comment: a.comment ?? "",
                answerPdfId: a.answerPdfId,
                page: pageNumber,
                updatedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Icon.bulkWrite(bulkOps);
      console.log(`✅ Synced ${bulkOps.length} icons`);
    } else {
      console.log("⚠ No annotations found.");
    }

    const marksFile = path.join(folderPath, "marks.json");

    if (fs.existsSync(marksFile)) {
      const marksJSON = JSON.parse(fs.readFileSync(marksFile, "utf8"));

      const marksArray = marksJSON.marks || [];
      let markOps = [];

      for (const m of marksArray) {
        if (
          !m.questionDefinitionId ||
          !m.answerPdfId ||
          m.allottedMarks === undefined
        ) {
          console.log("⚠ Skipping invalid mark:", m);
          continue;
        }

        markOps.push({
          updateOne: {
            filter: {
              questionDefinitionId: m.questionDefinitionId,
              answerPdfId: m.answerPdfId,
            },
            update: {
              $set: {
                allottedMarks: Number(m.allottedMarks),
                timerStamps: String(m.timeStamps ?? ""),
                isMarked: Boolean(m.synced ?? false),
                updatedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }

      if (markOps.length > 0) {
        await Marks.bulkWrite(markOps);
        console.log(`✅ Synced ${markOps.length} marks`);
      }
    } else {
      console.log("⚠ marks.json not found");
    }

    const answerPdfDoc = await AnswerPdf.findByIdAndUpdate(answerpdfid, {
      status: true,
    });
    console.log("✅ Updated AnswerPdf status to true");

    const task = await Task.findById(answerPdfDoc.taskId);

    const tasks = await Task.find({ subjectCode: task.subjectCode });

    let totalBooklets = 0;
    let completedBooklets = 0;

    // Process each task and update the booklet counts
    for (const currentTask of tasks) {
      const answerPdfs = await AnswerPdf.find({
        taskId: currentTask._id,
        status: true,
      });
      
      totalBooklets += currentTask.totalBooklets;
      console.log("total booklets", currentTask.totalBooklets);

      completedBooklets += answerPdfs.length;
      console.log("completedBooklets", completedBooklets);
    }

    const subjectFolderDetails = await SubjectFolderModel.findOne({
      folderName: task.subjectCode,
    });
    if (!subjectFolderDetails) {
      return res.status(404).json({ message: "Subject folder not found" });
    }

    // Update folder details
    subjectFolderDetails.evaluated = completedBooklets;
    subjectFolderDetails.evaluation_pending = totalBooklets - completedBooklets;
    await subjectFolderDetails.save();

    // Check if all booklets are completed
    if (completedBooklets === totalBooklets) {
      task.status = "success";
      await task.save();
      return res
        .status(200)
        .json({ message: "Task is completed", success: true });
    }

    return res.status(200).json({
      success: true,
      message: "Booklet annotations synced successfully",
      totalSynced: bulkOps.length,
      answerPdfId: answerpdfid,
    });
  } catch (error) {
    console.error("❌ Error in completedBookletHandler:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const checkTaskCompletionHandler = async (req, res) => {
  const { id } = req.params;

  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const tasks = await Task.find({ subjectCode: task.subjectCode });

    let totalBooklets = 0;
    let completedBooklets = 0;

    for (const currentTask of tasks) {
      const answerPdfs = await AnswerPdf.find({
        taskId: currentTask._id,
        status: true,
      });
      totalBooklets += currentTask.totalBooklets;
      completedBooklets += answerPdfs.length;
    }

    const subjectFolderDetails = await SubjectFolderModel.findOne({
      folderName: task.subjectCode,
    });

    subjectFolderDetails.evaluated = completedBooklets;
    subjectFolderDetails.evaluation_pending = totalBooklets - completedBooklets;
    await subjectFolderDetails.save();

    const booklets = await AnswerPdf.find({ taskId: id, status: false });

    if (booklets.length === 0) {
      task.status = "success";
      await task.save();
      return res
        .status(200)
        .json({ message: "Task is completed", success: true });
    }

    return res
      .status(200)
      .json({ message: "Task is not completed", success: false });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch tasks", error: error.message });
  }
};

export {
  assigningTask,
  removeAssignedTask,
  getAssignTaskById,
  getAllAssignedTaskByUserId,
  getUsersFormanualAssign,
  getAllTaskHandler,
  updateCurrentIndex,
  getQuestionDefinitionTaskId,
  getAllTasksBasedOnSubjectCode,
  completedBookletHandler,
  checkTaskCompletionHandler,
  autoAssigning,
};
