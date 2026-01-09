import Subject from "../../models/classModel/subjectModel.js";
import Task from "../../models/taskModels/taskModel.js";
import SubjectFolderModel from "../../models/StudentModels/subjectFolderModel.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";
import CourseSchemaRelation from "../../models/subjectSchemaRelationModel/subjectSchemaRelationModel.js";
import CoordinateAllocation from "../../models/subjectSchemaRelationModel/coordinateAllocationModel.js";
import Schema from "../../models/schemeModel/schema.js";
import fs from "fs";
import path from "path";

/* -------------------------------------------------------------------------- */
/*                           CREATE SUBJECT                                   */
/* -------------------------------------------------------------------------- */
const createSubject = async (req, res) => {
  const { name, code, classId } = req.body;

  if (!name || !code || !classId) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    if (!isValidObjectId(classId)) {
      return res.status(400).json({ message: "Invalid class ID." });
    }

    // Check if a subject with the same code exists in the same class (case-insensitive)
    const existingSubject = await Subject.findOne({
      classId,
      code: new RegExp(`^${code}$`, "i"), // Case-insensitive search
    });

    if (existingSubject) {
      return res.status(400).json({
        message: `Subject code '${code}' already exists in this class.`,
      });
    }

    // Create and save the new subject
    const newSubject = new Subject({
      name,
      code,
      classId,
    });
    const savedSubject = await newSubject.save();

    const subjectFolderPath = path.join(process.cwd(), "scannedFolder", code);

    if (!fs.existsSync(subjectFolderPath)) {
      fs.mkdirSync(subjectFolderPath, { recursive: true });
    }

    await SubjectFolderModel.create({
      folderName: code,
      description: "",
      allocated: 0,
      unAllocated: 0,
      evaluated: 0,
      evaluation_pending: 0,
      scannedFolder: 0,
    });

    return res.status(201).json(savedSubject);
  } catch (err) {
    console.error("Create subject error:", err);
    return res
      .status(500)
      .json({ message: "An error occurred while creating the subject." });
  }
};

/* -------------------------------------------------------------------------- */
/*                           REMOVE SUBJECT                                   */
/* -------------------------------------------------------------------------- */
const removeSubject = async (req, res) => {
  const { id } = req.params;
  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid subject ID." });
    }

    const subject = await Subject.findById(id).select("code").lean();

    if (!subject) {
      return res.status(404).json({ message: "Subject not found." });
    }

    const subjectCode = subject.code;

    // find this subject code is existing inside scanned folder
    const scannedFolderPath = path.join(
      process.cwd(),
      "scannedFolder",
      subjectCode
    );
    if (fs.existsSync(scannedFolderPath) && fs.readdirSync(scannedFolderPath).length > 0) {
      return res
        .status(400)
        .json({
          message: `Subject code '${subjectCode}' folder exists in scannedFolder. deletion can not be possible`,
        });
    }

    // find this subject code is existing inside processed folder

    const processedFolderPath = path.join(
      process.cwd(),
      "processedFolder",
      subjectCode
    );
    if (fs.existsSync(processedFolderPath) && fs.readdirSync(processedFolderPath).length > 0) {
      return res
        .status(400)
        .json({
          message: `Subject code '${subjectCode}' folder exists in processedFolder. deletion can not be possible`,
        });
    }

    //find there is alraedy created task under this subject
    const existingTask = await Task.find({ subjectCode: subjectCode });
    if (existingTask.length > 0) {
      return res
        .status(400)
        .json({
          message: `Tasks are already assigned to subject code '${subjectCode.code}'. Deletion not possible.`,
        });
    }

    //this will check

    // Find all SubjectSchemaRelations for this subject (try both ObjectId and string)
    let subjectSchemaRelations = await CourseSchemaRelation.find({ subjectId: id });
    if (subjectSchemaRelations.length === 0) {
      // Try as string if ObjectId didn't work
      subjectSchemaRelations = await CourseSchemaRelation.find({ subjectId: id.toString() });
    }
    
    if (subjectSchemaRelations.length > 0) {
      // Get all relation IDs
      const relationIds = subjectSchemaRelations.map(relation => relation._id);
      
      // Delete CoordinateAllocation records
      await CoordinateAllocation.deleteMany({ courseSchemaRelationId: { $in: relationIds } });
      
      // Delete associated files
      subjectSchemaRelations.forEach(relation => {
        const baseDir = path.resolve(process.cwd(), "uploadedPdfs");
        const questionPdfPath = path.join(baseDir, "questionPdfs", `${relation.questionPdfPath}.pdf`);
        const answerPdfPath = path.join(baseDir, "answerPdfs", `${relation.answerPdfPath}.pdf`);
        const questionImageDir = path.join(baseDir, "extractedQuestionPdfImages", relation.questionPdfPath);
        const answerImageDir = path.join(baseDir, "extractedAnswerPdfImages", relation.answerPdfPath);

        [questionPdfPath, answerPdfPath].forEach((filePath) => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });

        [questionImageDir, answerImageDir].forEach((dirPath) => {
          if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
          }
        });
      });
      
      // Delete SubjectSchemaRelation records
      await CourseSchemaRelation.deleteMany({ subjectId: id });
    }

    // Try to delete the subject (if exists)
    const deletedSubject = await Subject.findByIdAndDelete(id);
    
    if (!deletedSubject && subjectSchemaRelations.length === 0) {
      return res.status(404).json({ message: "Subject not found." });
    }
    
    return res.status(200).json({ message: "Subject and all related data successfully removed." });

    
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while removing the subject." });
  }
};

// const removeSubject = async (req, res) => {
//   const { id } = req.params;
//   try {
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid subject ID." });
//     }

//     // Find all SubjectSchemaRelations for this subject (try both ObjectId and string)
//     let subjectSchemaRelations = await CourseSchemaRelation.find({ subjectId: id });
//     if (subjectSchemaRelations.length === 0) {
//       // Try as string if ObjectId didn't work
//       subjectSchemaRelations = await CourseSchemaRelation.find({ subjectId: id.toString() });
//     }
    
//     if (subjectSchemaRelations.length > 0) {
//       // Get all relation IDs
//       const relationIds = subjectSchemaRelations.map(relation => relation._id);
      
//       // Delete CoordinateAllocation records
//       await CoordinateAllocation.deleteMany({ courseSchemaRelationId: { $in: relationIds } });
      
//       // Delete associated files
//       subjectSchemaRelations.forEach(relation => {
//         const baseDir = path.resolve(process.cwd(), "uploadedPdfs");
//         const questionPdfPath = path.join(baseDir, "questionPdfs", `${relation.questionPdfPath}.pdf`);
//         const answerPdfPath = path.join(baseDir, "answerPdfs", `${relation.answerPdfPath}.pdf`);
//         const questionImageDir = path.join(baseDir, "extractedQuestionPdfImages", relation.questionPdfPath);
//         const answerImageDir = path.join(baseDir, "extractedAnswerPdfImages", relation.answerPdfPath);

//         [questionPdfPath, answerPdfPath].forEach((filePath) => {
//           if (fs.existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//           }
//         });

//         [questionImageDir, answerImageDir].forEach((dirPath) => {
//           if (fs.existsSync(dirPath)) {
//             fs.rmSync(dirPath, { recursive: true, force: true });
//           }
//         });
//       });
      
//       // Delete SubjectSchemaRelation records
//       await CourseSchemaRelation.deleteMany({ subjectId: id });
//     }

//     // Try to delete the subject (if exists)
//     const deletedSubject = await Subject.findByIdAndDelete(id);
    
//     if (!deletedSubject && subjectSchemaRelations.length === 0) {
//       return res.status(404).json({ message: "Subject not found." });
//     }
    
//     return res.status(200).json({ message: "Subject and all related data successfully removed." });
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .json({ message: "An error occurred while removing the subject." });
//   }
// };
/* -------------------------------------------------------------------------- */
/*                           GET SUBJECT BY ID                                */
/* -------------------------------------------------------------------------- */
const getSubjectById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid subject ID." });
    }

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found." });
    }
    return res.status(200).json(subject);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while retrieving the subject." });
  }
};

/* -------------------------------------------------------------------------- */
/*                           GET ALL SUBJECTS                                 */
/* -------------------------------------------------------------------------- */
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    return res.status(200).json(subjects);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while retrieving the subjects." });
  }
};

/* -------------------------------------------------------------------------- */
/*                           UPDATE SUBJECT BY ID                             */
/* -------------------------------------------------------------------------- */
const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, code, classId } = req.body;

  if (!name || !code || !classId) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid subject ID." });
    }

    if (!isValidObjectId(classId)) {
      return res.status(400).json({ message: "Invalid class ID." });
    }

    // Check if a subject with the same code exists in the same class (case-insensitive) and is not the current subject
    const existingSubject = await Subject.findOne({
      classId,
      code: new RegExp(`^${code}$`, "i"),
      _id: { $ne: id },
    });

    if (existingSubject) {
      return res.status(400).json({
        message: `Subject code '${code}' already exists in this class.`,
      });
    }

    // Find and update the subject
    const subject = await Subject.findByIdAndUpdate(
      id,
      { name, code },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ message: "Subject not found." });
    }

    return res.status(200).json(subject);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while updating the subject." });
  }
};

const subjectsWithTasks = async (req, res) => {
  try {
    const subjects = await Subject.find();
    console.log("subjects", subjects);

    if (!subjects || subjects.length === 0) {
      return res.status(404).json({ message: "No subjects found." });
    }

    const subjectCodes = subjects.map((subject) => subject.code);

    const tasks = await Task.find({ subjectCode: { $in: subjectCodes } });

    if (!tasks || tasks.length === 0) {
      return res
        .status(404)
        .json({ message: "No tasks assigned to any subject." });
    }

    const assignedSubjectCodes = new Set(tasks.map((task) => task.subjectCode));

    const subjectsWithTasks = subjects.filter((subject) =>
      assignedSubjectCodes.has(subject.code)
    );

    return res.status(200).json({ subjects: subjectsWithTasks });
  } catch (error) {
    console.error("Error fetching subjects with tasks:", error);
    return res
      .status(500)
      .json({ message: "An error occurred.", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/*                           GET ALL SUBJECTS BY CLASS  ID                    */
/* -------------------------------------------------------------------------- */
const getAllSubjectBasedOnClassId = async (req, res) => {
  const { classId } = req.params;
  try {
    if (!isValidObjectId(classId)) {
      return res.status(400).json({ message: "Invalid class ID." });
    }

    const subjects = await Subject.find({ classId }).lean();
    const result = await Promise.all(
      subjects.map(async (subject) => {
        const schemaRelation = await CourseSchemaRelation.findOne({
          subjectId: subject._id,
        }).lean();

        if (!schemaRelation) {
          return {
            ...subject,

            flag: false,
          };
        }

        const schema = await Schema.findById(schemaRelation.schemaId)
          .select("name")
          .lean();

        return {
          ...subject,
          flag: true,
          schemaId: schemaRelation.schemaId,
          schemaName: schema?.name || null,
        };
      })
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while retrieving the subjects." });
  }
};

export {
  createSubject,
  removeSubject,
  getSubjectById,
  getAllSubjects,
  updateSubject,
  getAllSubjectBasedOnClassId,
  subjectsWithTasks,
};
