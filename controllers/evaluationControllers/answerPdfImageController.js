import fs from "fs";
import path from "path";
import AnswerPdfImage from "../../models/EvaluationModels/answerPdfImageModel.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";
import { __dirname } from "../../server.js";
import AnswerPdf from "../../models/EvaluationModels/studentAnswerPdf.js";
import Task from "../../models/taskModels/taskModel.js";

import SubjectSchemaRelation from "../../models/subjectSchemaRelationModel/subjectSchemaRelationModel.js";

import Schema from "../../models/schemeModel/schema.js";

import Subject from "../../models/classModel/subjectModel.js";

// const getAnswerPdfImages = async (req, res) => {
//     const { answerPdfId } = req.params;

//     try {

//         if (!isValidObjectId(answerPdfId)) {
//             return res.status(400).json({ message: "Invalid answerPdfId." });
//         }

//         const answerPdfImages = await AnswerPdfImage.find({ answerPdfId });
//         res.status(200).json(answerPdfImages);
//     } catch (error) {
//         console.error("Error fetching answerPdfImages:", error);
//         res.status(500).json({ message: "Failed to fetch answerPdfImages", error: error.message });
//     }
// };

const getAnswerPdfImages = async (req, res) => {
  const { answerPdfId } = req.params;

  try {
    if (!isValidObjectId(answerPdfId)) {
      return res.status(400).json({ message: "Invalid answerPdfId." });
    }

    // Get all images
    const answerPdfImages = await AnswerPdfImage.find({ answerPdfId });

    // Get the answer PDF to find the task and schema
    const answerPdf = await AnswerPdf.findById(answerPdfId);
    if (!answerPdf) {
      return res.status(404).json({ message: "Answer PDF not found." });
    }

    // Get the task to find schema details
    const task = await Task.findById(answerPdf.taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
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
    
    

   

    // const hiddenPages = schemaDetails.hiddenPage || [];
    

    const visibleImages = answerPdfImages.filter(
        (_, index) => !schemaDetails.hiddenPage?.includes(index)
      )

    // Get schema details for hidden pages configuration

    

    // Filter out hidden pages


    res.status(200).json(visibleImages);
  } catch (error) {
    console.error("Error fetching answerPdfImages:", error);
    res
      .status(500)
      .json({
        message: "Failed to fetch answerPdfImages",
        error: error.message,
      });
  }
};

const updateAnswerPdfImageById = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid answerPdfImage ID." });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }

    const answerPdfImage = await AnswerPdfImage.findOneAndUpdate(
      { _id: id },
      { status },
      { new: true }
    );
    if (!answerPdfImage) {
      return res.status(404).json({ message: "AnswerPdfImage not found" });
    }
    res.status(200).json(answerPdfImage);
  } catch (error) {
    console.error("Error updating answerPdfImage:", error);
    res
      .status(500)
      .json({
        message: "Failed to update answerPdfImage",
        error: error.message,
      });
  }
};

const savedAnswerImages = async (req, res) => {
  const { subjectcode, bookletName, imageName } = req.body;

  // Validation
  if (!subjectcode || !bookletName || !imageName) {
    return res.status(400).json({
      message: "subjectcode, bookletName, and imageName are required",
    });
  }

  // Define directory structure
  const mainFolder = path.join(__dirname, "completedFolder");
  const subjectFolder = path.join(mainFolder, subjectcode);
  const bookletFolder = path.join(subjectFolder, bookletName);

  try {
    // Ensure directories exist
    if (!fs.existsSync(mainFolder)) fs.mkdirSync(mainFolder);
    if (!fs.existsSync(subjectFolder)) fs.mkdirSync(subjectFolder);
    if (!fs.existsSync(bookletFolder)) fs.mkdirSync(bookletFolder);

    // Handle the uploaded file
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Save the image in the target folder with the provided imageName
    const filePath = path.join(bookletFolder, imageName);
    fs.copyFileSync(uploadedFile.path, filePath);

    // Respond with success
    res.status(200).json({
      message: "Image saved successfully",
      savedPath: filePath,
    });
  } catch (error) {
    console.error("Error saving the image:", error);
    res.status(500).json({ message: "Error saving the image", error });
  }
};

export { getAnswerPdfImages, updateAnswerPdfImageById, savedAnswerImages };
