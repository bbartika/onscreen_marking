import Schema from "../../models/schemeModel/schema.js";
import QuestionDefinition from "../../models/schemeModel/questionDefinitionSchema.js";
import SchemaAnswerPdf from "../../models/schemeModel/answerPdfModel.js";
import extractImagesFromPdf from "../../services/extractImagesFromPdf.js";
import mongoose from "mongoose";

import path from "path";
import fs from "fs";

import unzipper from "unzipper";
import stream from "stream";
import { promisify } from "util";

/* -------------------------------------------------------------------------- */
/*                           CREATE SCHEMA                                    */
/* -------------------------------------------------------------------------- */
const createSchema = async (req, res) => {
  const {
    name,
    totalQuestions,
    maxMarks,
    minMarks,
    minTime,
    maxTime,
    compulsoryQuestions,
    isActive,
    numberOfPage,
    hiddenPage,
    numberOfSupplement,
    PageofSupplement,
    perPage,
  } = req.body;

  try {
    if (
      !name ||
      !totalQuestions ||
      !maxMarks ||
      !minMarks ||
      !minTime ||
      !maxTime ||
      !numberOfPage ||
      !hiddenPage ||
      !perPage
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (Number(totalQuestions) <= 0) {
      return res
        .status(400)
        .json({ message: "Total questions must be greater than 0" });
    }
    if (Number(perPage) <= 0) {
      return res.status(400).json({
        message: "Timer minutes must be greater than 0",
      });
    }
    if (Number(maxMarks) <= 0) {
      return res
        .status(400)
        .json({ message: "Max marks must be greater than 0" });
    }
    if (Number(minMarks) < 0 || Number(minMarks) > Number(maxMarks)) {
      return res
        .status(400)
        .json({ message: "Minimum marks should be between 0 and max marks" });
    }
    if (Number(minTime) < 0 || Number(minTime) > Number(maxTime)) {
      return res
        .status(400)
        .json({ message: "Minimum time should be between 0 and max time" });
    }
    if (Number(maxTime) < 0 || Number(maxTime) < Number(minTime)) {
      return res.status(400).json({
        message: "Maximum time should be greater than or equal to minimum time",
      });
    }

    if (Number(compulsoryQuestions) < 0) {
      return res.status(400).json({
        message: "Compulsory questions marks should be between 0 and max marks",
      });
    }

    if (Number(compulsoryQuestions) > Number(maxMarks)) {
      return res.status(400).json({
        message: "Compulsory question marks cannot be greater than max marks.",
      });
    }

    const newSchema = new Schema({
      name,
      totalQuestions,
      perPage,
      maxMarks,
      minMarks,
      minTime,
      maxTime,
      compulsoryQuestions,

      numberOfPage,
      hiddenPage,
      isActive,
      status: false,
      numberOfSupplement: numberOfSupplement ? Number(numberOfSupplement) : 0,
      PageofSupplement: PageofSupplement ? Number(PageofSupplement) : 0
    });

    const savedSchema = await newSchema.save();
    return res.status(201).json(savedSchema);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "An error occurred while creating the schema." });
  }
};

/* -------------------------------------------------------------------------- */
/*                           UPDATE SCHEMA                                    */
/* -------------------------------------------------------------------------- */

const updateSchema = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    totalQuestions,
    maxMarks,
    minMarks,
    minTime,
    maxTime,
    compulsoryQuestions,
    status,
    isActive,
    numberOfPage,
    hiddenPage,
    numberOfSupplement,
    PageofSupplement,
    perPage,
  } = req.body;

  console.log("Update schema called with:", {
    name,
    totalQuestions,
    maxMarks,
    minMarks,
    minTime,
    maxTime,
    compulsoryQuestions,
    status,
    isActive,
    numberOfPage,
    hiddenPage,
    numberOfSupplement,
    PageofSupplement,
    perPage,
  });

  try {
    // Check if all required fields are present
    if (
      !name ||
      !totalQuestions ||
      !maxMarks ||
      !minMarks ||
      !minTime ||
      !maxTime ||
      !numberOfPage ||
      !hiddenPage ||
      !perPage
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate totalQuestions, maxMarks, minMarks
    if (Number(totalQuestions) <= 0) {
      return res
        .status(400)
        .json({ message: "Total questions must be greater than 0" });
    }
    if (Number(perPage) <= 0) {
      return res.status(400).json({
        message: "Timer minutes must be greater than 0",
      });
    }
    if (Number(maxMarks) <= 0) {
      return res
        .status(400)
        .json({ message: "Max marks must be greater than 0" });
    }
    if (Number(minMarks) < 0 || Number(minMarks) > Number(maxMarks)) {
      return res
        .status(400)
        .json({ message: "Minimum marks should be between 0 and max marks" });
    }
    if (Number(minTime) < 0 || Number(minTime) > Number(maxTime)) {
      return res
        .status(400)
        .json({ message: "Minimum time should be between 0 and max time" });
    }
    if (Number(maxTime) < 0 || Number(maxTime) < Number(minTime)) {
      return res.status(400).json({
        message: "Maximum time should be greater than or equal to minimum time",
      });
    }

    if (Number(compulsoryQuestions) < 0) {
      return res.status(400).json({
        message: "Compulsory questions marks should be between 0 and max marks",
      });
    }

    if (Number(compulsoryQuestions) > Number(maxMarks)) {
      return res.status(400).json({
        message: "Compulsory question marks cannot be greater than max marks.",
      });
    }

    // Find schema by id and update it
    const schema = await Schema.findById(id);

    if (!schema) {
      return res.status(404).json({ message: "Schema not found." });
    }

    const parentQuestions = await QuestionDefinition.find({
      schemaId: id,
      parentQuestionId: null,
    });

    parentQuestions.sort(
      (a, b) => Number(a.questionsName) - Number(b.questionsName),
    );

    const existingParentCount = parentQuestions.length;
    const newTotal = Number(totalQuestions);

    if (existingParentCount > newTotal) {
      const parentsToDelete = parentQuestions.slice(newTotal);

      const parentIds = parentsToDelete.map((q) => q._id);

      await QuestionDefinition.deleteMany({
        $or: [
          { _id: { $in: parentIds } },
          { parentQuestionId: { $in: parentIds } },
        ],
      });
      console.log(
        `Deleted ${parentsToDelete.length} parent questions and their sub-questions.`,
      );
    }

    schema.name = name;
    schema.totalQuestions = totalQuestions;
    schema.perPage = perPage;
    schema.maxMarks = maxMarks;
    schema.minMarks = minMarks;
    schema.minTime = minTime;
    schema.maxTime = maxTime;

    schema.compulsoryQuestions = compulsoryQuestions;
    schema.isActive = isActive;
    schema.numberOfPage = numberOfPage;
    schema.hiddenPage = hiddenPage;
    schema.status = status;
    schema.numberOfSupplement = numberOfSupplement;
    schema.PageofSupplement = PageofSupplement;

    const updatedSchema = await schema.save();
    return res.status(200).json(updatedSchema);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while updating the schema." });
  }
};

/* -------------------------------------------------------------------------- */
/*                           GET SCHEMA BY ID                                 */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                           GET ALL SCHEMA                                   */
/* -------------------------------------------------------------------------- */
const getAllSchemas = async (req, res) => {
  try {
    const schemas = await Schema.find();
    return res.status(200).json(schemas);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while retrieving the schemas." });
  }
};

const getSchemaById = async (req, res) => {
  const { id } = req.params;
  try {
    const schema = await Schema.findById(id);
    if (!schema) {
      return res.status(404).json({ message: "Schema not found." });
    }
    return res.status(200).json(schema);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while retrieving the schema." });
  }
};
/* -------------------------------------------------------------------------- */
/*                           REMOVE SCHEMA BY ID                              */
/* -------------------------------------------------------------------------- */
const removeSchema = async (req, res) => {
  const { id } = req.params;

  try {
    await QuestionDefinition.deleteMany({ schemaId: id });
    const schema = await Schema.findByIdAndDelete(id);

    if (!schema) {
      return res.status(404).json({ message: "Schema not found." });
    }

    return res.status(200).json({
      message:
        "Schema and associated question definitions successfully removed.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message:
        "An error occurred while removing the schema and associated questions.",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                           GET ALL SCHEMA  STATUS                           */
/* -------------------------------------------------------------------------- */
const getAllCompletedSchema = async (req, res) => {
  try {
    const schemas = await Schema.find({ status: true });
    return res.status(200).json(schemas);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while retrieving the schemas." });
  }
};

const uploadSupplimentaryPdf = async (req, res) => {
  try {
    const { schemaId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No PDF file uploaded." });
    }

    // if (!isValidObjectId(schemaId)) {
    //   return res.status(400).json({ message: "Invalid schemaId." });
    // }

    const schema = await Schema.findById(schemaId);
    if (!schema) {
      return res.status(404).json({ message: "Schema not found." });
    }

    /* ================================
       DIRECTORY SETUP
    ================================= */
    const baseDir = path.resolve(process.cwd(), "uploadedPdfs");

    const supplimentaryPdfDir = path.join(baseDir, "supplimentary-pdf");
    const extractedImagesDir = path.join(
      baseDir,
      "extractedSupplimentaryPdfImages",
      schemaId,
    );

    fs.mkdirSync(supplimentaryPdfDir, { recursive: true });
    fs.mkdirSync(extractedImagesDir, { recursive: true });

    /* ================================
       MOVE PDF
    ================================= */
    const finalPdfPath = path.join(supplimentaryPdfDir, `${schemaId}.pdf`);

    await fs.promises.rename(file.path, finalPdfPath);

    /* ================================
       UPDATE SCHEMA (processing)
    ================================= */

    schema.supplimentaryPdfPath = `supplimentary-pdf/${schemaId}.pdf`;
    schema.supplimentaryProcessingStatus = "processing";
    await schema.save();

    res.status(200).json({
      message: "Supplimentary PDF uploaded. Image extraction started.",
      schemaId,
    });

    /* ================================
       BACKGROUND IMAGE EXTRACTION
    ================================= */
    setImmediate(async () => {
      try {
        const images = await extractImagesFromPdf(
          finalPdfPath,
          extractedImagesDir,
        );

        await Schema.findByIdAndUpdate(schemaId, {
          supplimentaryImageCount: images.length,
          supplimentaryProcessingStatus: "completed",
        });
      } catch (err) {
        await Schema.findByIdAndUpdate(schemaId, {
          supplimentaryProcessingStatus: "failed",
          supplimentaryErrorMessage: err.message,
        });
      }
    });
  } catch (error) {
    console.error("Supplimentary PDF upload error:", error);
    res.status(500).json({
      message: "Failed to upload supplimentary PDF",
    });
  }
};

const getSchemadetailsById = async (req, res) => {
  const { id } = req.params;

  try {
    // if (!isValidObjectId(id)) {
    //   return res
    //     .status(400)
    //     .json({ message: "Invalid subject schema relation ID." });
    // }

    const schemaDetails = await Schema.findById({
      _id: id,
    });

    if (!schemaDetails) {
      return res.status(404).json({ message: "Schema not found." });
    }
    res.status(200).json(schemaDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while retrieving the schema.",
    });
  }
};

// const getcoordinateSupplimentarypdf = async (req, res) => {
//   const { id } = req.params;
//   const { coordination } = req.body;

//   try {
//     if (!coordination || !coordination.type || !coordination.areas) {
//       return res.status(400).json({
//         message: "coordination.type and coordination.areas are required"
//       });
//     }

//     const schema = await Schema.findById(id);
//     if (!schema) {
//       return res.status(404).json({ message: "Schema not found" });
//     }

//     const updates = [];

//     // WHOLE PAGE
//     if (coordination.type === "WHOLE_PAGE") {
//       if (!Array.isArray(coordination.areas)) {
//         return res.status(400).json({
//           message: "areas must be an array of page numbers"
//         });
//       }

//       coordination.areas.forEach(pageNumber => {
//         updates.push({
//           pageNumber,
//           type: "WHOLE_PAGE",
//           coordinates: []
//         });
//       });
//     }

//     // PARTIAL PAGE
//     if (coordination.type === "PARTIAL_PAGE") {
//       Object.entries(coordination.areas).forEach(([page, coords]) => {
//         updates.push({
//           pageNumber: Number(page),
//           type: "PARTIAL_PAGE",
//           coordinates: coords
//         });
//       });
//     }

//     // 🔑 UPSERT IN MEMORY
//     for (const page of updates) {
//       const index = schema.supplementaryPages.findIndex(
//         p => p.pageNumber === page.pageNumber
//       );

//       if (index !== -1) {
//         // update
//         schema.supplementaryPages[index].type = page.type;
//         schema.supplementaryPages[index].coordinates = page.coordinates;
//       } else {
//         // insert
//         schema.supplementaryPages.push(page);
//       }
//     }

//     await schema.save();

//     res.status(200).json({
//       message: "Supplementary coordination saved successfully",
//       data: schema
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Failed to save supplementary coordination"
//     });
//   }
// };
const getcoordinateSupplimentarypdf = async (req, res) => {
  const { schemaId } = req.params;
  const { coordination } = req.body;

  console.log("schemaId =", schemaId);

  try {
    if (!coordination || !coordination.type || !coordination.areas) {
      return res.status(400).json({
        message: "coordination.type and coordination.areas are required",
      });
    }
    const schemaidd = new mongoose.Types.ObjectId(schemaId);

    const schema = await Schema.findById(schemaidd);
    if (!schema) {
      return res.status(404).json({ message: "Schema not found" });
    }

    const existingType =
      schema.supplementaryPages.length > 0
        ? schema.supplementaryPages[0].type
        : null;

    if (existingType && existingType !== coordination.type) {
      // 🔥 DELETE EVERYTHING
      schema.supplementaryPages = [];
    }

    const updates = [];

    // WHOLE PAGE
    if (coordination.type === "WHOLE_PAGE") {
      if (!Array.isArray(coordination.areas)) {
        return res.status(400).json({
          message: "areas must be an array of page numbers",
        });
      }

      coordination.areas.forEach((pageNumber) => {
        updates.push({
          pageNumber,
          type: "WHOLE_PAGE",
          coordinates: [],
        });
      });
    }

    // PARTIAL PAGE
    if (coordination.type === "PARTIAL_PAGE") {
      Object.entries(coordination.areas).forEach(([page, coords]) => {
        updates.push({
          pageNumber: Number(page),
          type: "PARTIAL_PAGE",
          coordinates: coords,
        });
      });
    }

    //  UPSERT IN MEMORY
    for (const page of updates) {
      const index = schema.supplementaryPages.findIndex(
        (p) => p.pageNumber === page.pageNumber,
      );

      if (index !== -1) {
        schema.supplementaryPages[index].coordinates = page.coordinates;
      } else {
        // insert

        schema.supplementaryPages.push(page);
      }
    }

    await schema.save();

    res.status(200).json({
      message: "Supplementary coordination saved successfully",
      data: schema,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to save supplementary coordination",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                           New PDF Upload Pipeline                          */
/* -------------------------------------------------------------------------- */

const pipeline = promisify(stream.pipeline);

const uploadAnswerPdf = async (req, res) => {
  try {
    const { schemaId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const schema = await Schema.findById(schemaId);
    if (!schema) {
      return res.status(404).json({ message: "Schema not found" });
    }

    /* ================================
       GENERATE UNIQUE PDF ID
    ================================= */
    const answerPdfId = new mongoose.Types.ObjectId();

    /* ================================
       DIRECTORY SETUP (LIKE SUPPLEMENTARY)
    ================================= */
    const baseDir = path.resolve(process.cwd(), "uploadedPdfs");

    const answerPdfDir = path.join(baseDir, "answer-pdfs");
    const extractedImagesDir = path.join(
      baseDir,
      "extractedAnswerPdfImages",
      schemaId.toString(),
    );

    fs.mkdirSync(answerPdfDir, { recursive: true });
    fs.mkdirSync(extractedImagesDir, { recursive: true });

    /* ================================
       MOVE PDF
    ================================= */
    const finalPdfPath = path.join(answerPdfDir, `${answerPdfId}.pdf`);

    await fs.promises.rename(file.path, finalPdfPath);

    /* ================================
       STORE DB RECORD
    ================================= */
    await SchemaAnswerPdf.create({
      _id: answerPdfId,
      schemaId,
      fileName: file.originalname,
      filePath: `answer-pdfs/${answerPdfId}.pdf`,
      fileSize: file.size,
      uploadType: "DIRECT_PDF",
      uploadedBy: req.user._id,
    });

    res.status(200).json({
      message: "Answer PDF uploaded. Image extraction started.",
      answerPdfId,
    });

    /* ================================
       BACKGROUND IMAGE EXTRACTION
    ================================= */
    setImmediate(async () => {
      try {
        const images = await extractImagesFromPdf(
          finalPdfPath,
          extractedImagesDir,
        );

        // OPTIONAL: store image count later if needed
        // await SchemaAnswerPdf.findByIdAndUpdate(answerPdfId, {
        //   imageCount: images.length
        // });
      } catch (err) {
        console.error("Answer PDF image extraction failed:", err);
      }
    });
  } catch (error) {
    console.error("uploadAnswerPdf error:", error);
    return res.status(500).json({
      message: "Failed to upload answer PDF",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*               New PDF Upload Pipeline Fetch Pipeline                       */
/* -------------------------------------------------------------------------- */

const getAnswerPdfImages = async (req, res) => {
  try {
    const { answerPdfId } = req.params;

    if (!answerPdfId) {
      return res.status(400).json({
        message: "answerPdfId is required",
      });
    }

    const imagesDir = path.join(
      process.cwd(),
      "uploadedPdfs",
      "extractedAnswerPdfImages",
      answerPdfId,
    );

    if (!fs.existsSync(imagesDir)) {
      return res.status(404).json({
        message: "Extracted images not found for this PDF",
      });
    }

    const files = fs
      .readdirSync(imagesDir)
      .filter((file) => file.toLowerCase().endsWith(".png"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
        return numA - numB;
      });

    if (files.length === 0) {
      return res.status(404).json({
        message: "No images found for this PDF",
      });
    }

    const imageUrls = files.map((file) => ({
      page: parseInt(file.match(/\d+/)?.[0], 10),
      imageUrl: `/uploadedPdfs/extractedAnswerPdfImages/${answerPdfId}/${file}`,
    }));

    return res.status(200).json({
      answerPdfId,
      totalPages: imageUrls.length,
      images: imageUrls,
    });
  } catch (error) {
    console.error("getAnswerPdfImages error:", error);
    return res.status(500).json({
      message: "Failed to fetch answer PDF images",
    });
  }
};

const serveAnswerPdfImage = async (req, res) => {
  try {
    const { schemaId, imageName } = req.params;

    const imagePath = path.join(
      process.cwd(),
      "uploadedPdfs",
      "extractedAnswerPdfImages",
      schemaId,
      imageName,
    );

    if (!fs.existsSync(imagePath)) {
      return res.status(404).send("Image not found");
    }

    res.sendFile(imagePath);
  } catch (err) {
    res.status(500).send("Failed to load image");
  }
};

export {
  createSchema,
  updateSchema,
  getSchemaById,
  getAllSchemas,
  removeSchema,
  getAllCompletedSchema,
  uploadSupplimentaryPdf,
  getSchemadetailsById,
  getcoordinateSupplimentarypdf,
  uploadAnswerPdf,
  getAnswerPdfImages,
  serveAnswerPdfImage,
};
