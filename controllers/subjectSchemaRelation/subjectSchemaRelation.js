import SubjectSchemaRelation from "../../models/subjectSchemaRelationModel/subjectSchemaRelationModel.js";
import Subject from "../../models/classModel/subjectModel.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";
import CoordinateAllocation from "../../models/subjectSchemaRelationModel/coordinateAllocationModel.js";
import Schema from "../../models/schemeModel/schema.js";
import fs from 'fs';
import path from 'path';
import extractImagesFromPdf from "../../services/extractImagesFromPdf.js"

/* -------------------------------------------------------------------------- */
/*                              CREATE SUBJECT SCHEMA RELATION                */
/* -------------------------------------------------------------------------- */

const createSubjectSchemaRelation = async (req, res) => {
    const { schemaId, subjectId, relationName } = req.body;

    console.log("Request Body:", req.body);

    try {
        // Validate incoming data
        if (!schemaId || !subjectId || !req.files?.questionPdf || !req.files?.answerPdf) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Validate ObjectId
        if (!isValidObjectId(subjectId) || !isValidObjectId(schemaId)) {
            return res.status(400).json({ message: "Invalid subjectId or schemaId." });
        }

        // Ensure relationName is provided
        if (!relationName) {
            return res.status(400).json({ message: "Relation name is required." });
        }

        // Check if the Subject exists
        const isValidSubject = await Subject.findOne({ _id: subjectId });

        if (!isValidSubject) {
            return res.status(404).json({ message: "Subject not found." });
        }

        // Check if the Schema exists
        const isValidSchema = await Schema.findOne({ _id: schemaId });
        if (!isValidSchema) {
            return res.status(404).json({ message: "Schema not found." });
        }

        // Remove any existing SubjectSchemaRelation with the same schemaId and subjectId
        const existingRelation = await SubjectSchemaRelation.findOne({ schemaId, subjectId });

        console.log("Existing Relation:", existingRelation);

        if (existingRelation) {
            // Delete associated files
            const questionPdfPath = path.resolve(process.cwd(), 'uploadedPdfs/questionPdfs', `${existingRelation.questionPdfPath}.pdf`);
            const answerPdfPath = path.resolve(process.cwd(), 'uploadedPdfs/answerPdfs', `${existingRelation.answerPdfPath}.pdf`);
            const questionImageDir = path.resolve(process.cwd(), 'uploadedPdfs/extractedQuestionPdfImages', existingRelation.questionPdfPath);
            const answerImageDir = path.resolve(process.cwd(), 'uploadedPdfs/extractedAnswerPdfImages', existingRelation.answerPdfPath);

            // Delete files and directories
            [questionPdfPath, answerPdfPath].forEach((filePath) => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // Remove PDF files
                }
            });

            [questionImageDir, answerImageDir].forEach((dirPath) => {
                if (fs.existsSync(dirPath)) {
                    fs.rmSync(dirPath, { recursive: true, force: true }); // Remove image directories
                }
            });

            // Remove the existing database entry
            await SubjectSchemaRelation.deleteOne({ _id: existingRelation._id });
        }

        // Define base directories for storing files
        const baseDir = path.resolve(process.cwd(), 'uploadedPdfs');
        const questionPdfDir = path.join(baseDir, 'questionPdfs');
        const answerPdfDir = path.join(baseDir, 'answerPdfs');
        const extractedQuestionImageDir = path.join(baseDir, 'extractedQuestionPdfImages');
        const extractedAnswerImageDir = path.join(baseDir, 'extractedAnswerPdfImages');

        // Ensure the directories exist
        const ensureDir = (dir) => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        };

        [questionPdfDir, answerPdfDir, extractedQuestionImageDir, extractedAnswerImageDir].forEach(ensureDir);

        // Move and rename the PDF files
        const questionPdf = req.files.questionPdf[0];
        const answerPdf = req.files.answerPdf[0];

        if (!fs.existsSync(questionPdf.path)) {
  throw new Error(`Question PDF missing at ${questionPdf.path}`);
}

if (!fs.existsSync(answerPdf.path)) {
  throw new Error(`Answer PDF missing at ${answerPdf.path}`);
}
 console.log("questionpdfDir", questionPdfDir);
 console.log("answerPdfDir", answerPdfDir);


        const questionPdfPath = path.join(questionPdfDir, questionPdf.filename);
        const answerPdfPath = path.join(answerPdfDir, answerPdf.filename);

        console.log("Q temp:", questionPdf.path);
        console.log("A temp:", answerPdf.path);

        try {
            fs.renameSync(questionPdf.path, questionPdfPath);
            fs.renameSync(answerPdf.path, answerPdfPath);
        } catch (error) {
            console.error("Error moving files:", error);
            return res.status(500).json({ error: "Error processing files" });
        }

        // Extract images from PDFs and create directories for extracted images
        const questionImageSubDir = path.join(extractedQuestionImageDir, `${path.basename(questionPdf.filename, '.pdf')}`);
        const answerImageSubDir = path.join(extractedAnswerImageDir, `${path.basename(answerPdf.filename, '.pdf')}`);

        ensureDir(questionImageSubDir);
        ensureDir(answerImageSubDir);

        const questionImage = await extractImagesFromPdf(questionPdfPath, questionImageSubDir);
        const questionImageCount = questionImage.length;
        console.log("Question Image Count:", questionImageCount);

        const answerImage = await extractImagesFromPdf(answerPdfPath, answerImageSubDir);
        const answerImageCount = answerImage.length;
        console.log("Answer Image Count:", answerImageCount);
        // Create the new SubjectSchemaRelation document
        const newSubjectSchemaRelation = new SubjectSchemaRelation({
            schemaId,
            subjectId,
            questionPdfPath: `${path.basename(questionPdf.filename, '.pdf')}`,
            answerPdfPath: `${path.basename(answerPdf.filename, '.pdf')}`,
            countOfQuestionImages: questionImageCount,
            countOfAnswerImages: answerImageCount,
            relationName,
            coordinateStatus: false
        });

        const savedSubjectSchemaRelation = await newSubjectSchemaRelation.save();

        // Respond with the saved SubjectSchemaRelation
        res.status(201).json(savedSubjectSchemaRelation);
    } catch (error) {
        console.error("Error creating subject schema relation:", error);
        res.status(500).json({ error: 'An error occurred while creating the subject schema relation.' });
    }
};

/* -------------------------------------------------------------------------- */
/*                           GET SUBJECT SCHEMA RELATION                      */
/* -------------------------------------------------------------------------- */
const getSubjectSchemaRelationById = async (req, res) => {
    const { id } = req.params;

    try {
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid subject schema relation ID." });
        }

        const subjectSchemaRelation = await SubjectSchemaRelation.findById({ _id: id });

        if (!subjectSchemaRelation) {
            return res.status(404).json({ message: "Subject schema relation not found." });
        }

        res.status(200).json(subjectSchemaRelation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while retrieving the subject schema relation.' });
    }
}


/* -------------------------------------------------------------------------- */
/*                           DELETE SUBJECT SCHEMA RELATION                   */
/* -------------------------------------------------------------------------- */
const deleteSubjectSchemaRelationById = async (req, res) => {
    const { id } = req.params;

    try {
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid subject schema relation ID." });
        }


        // Find the SubjectSchemaRelation before deletion
        const subjectSchemaRelation = await SubjectSchemaRelation.findById({ _id: id });
        if (!subjectSchemaRelation) {
            return res.status(404).json({ message: "Subject schema relation not found." });
        }

        // Define base directories
        const baseDir = path.resolve(process.cwd(), 'uploadedPdfs');
        const questionPdfPath = path.join(baseDir, 'questionPdfs', `${subjectSchemaRelation.questionPdfPath}.pdf`);
        const answerPdfPath = path.join(baseDir, 'answerPdfs', `${subjectSchemaRelation.answerPdfPath}.pdf`);
        const extractedQuestionImageDir = path.join(baseDir, 'extractedQuestionPdfImages', subjectSchemaRelation.questionPdfPath);
        const extractedAnswerImageDir = path.join(baseDir, 'extractedAnswerPdfImages', subjectSchemaRelation.answerPdfPath);

        // Helper function to remove files or directories
        const removeFileOrDirectory = (filePath) => {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(filePath);
                }
            }
        };

        // Remove PDF files and extracted image directories
        removeFileOrDirectory(questionPdfPath);
        removeFileOrDirectory(answerPdfPath);
        removeFileOrDirectory(extractedQuestionImageDir);
        removeFileOrDirectory(extractedAnswerImageDir);

        // Delete the SubjectSchemaRelation from the database
        await SubjectSchemaRelation.findByIdAndDelete(id);

        res.status(200).json({ message: "Subject schema relation and associated files deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while deleting the subject schema relation.' });
    }
};

/* -------------------------------------------------------------------------- */
/*                           UPDATE SUBJECT SCHEMA RELATION                   */
/* -------------------------------------------------------------------------- */
const updateSubjectSchemaRelation = async (req, res) => {
    const { id } = req.params;
    try {
        const { schemaId, subjectId, relationName, coordinateStatus } = req.body;

        if (!schemaId || !subjectId || !relationName) {
            return res.status(400).json({ message: 'SchemaId , RelationName and SubjectId  are required.' });
        }

        if (!isValidObjectId(subjectId) || !isValidObjectId(schemaId)) {
            return res.status(400).json({ message: 'Invalid schemaId or subjectId.' });
        }

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'subject schema relation ID is invalid.' });
        }

        const subjectSchemaRelation = await SubjectSchemaRelation.findOne({ _id: id });

        if (!subjectSchemaRelation) {
            return res.status(404).json({ message: 'SubjectSchemaRelation not found.' });
        }


        const baseDir = path.resolve(process.cwd(), 'uploadedPdfs');
        const questionPdfDir = path.join(baseDir, 'questionPdfs');
        const answerPdfDir = path.join(baseDir, 'answerPdfs');
        const extractedQuestionImageDir = path.join(baseDir, 'extractedQuestionPdfImages');
        const extractedAnswerImageDir = path.join(baseDir, 'extractedAnswerPdfImages');

        let updatedFields = { relationName, coordinateStatus };

        // Handle Question PDF Replacement
        if (req.files.questionPdf) {
            const oldQuestionPdf = subjectSchemaRelation.questionPdfPath;
            const questionPdf = req.files.questionPdf[0];
            const questionPdfPath = path.join(questionPdfDir, questionPdf.filename);

            // Delete old PDF and its extracted images
            if (oldQuestionPdf) {
                const oldQuestionPdfPath = path.join(questionPdfDir, `${oldQuestionPdf}.pdf`);
                const oldQuestionImageDir = path.join(extractedQuestionImageDir, oldQuestionPdf);
                if (fs.existsSync(oldQuestionPdfPath)) fs.unlinkSync(oldQuestionPdfPath);
                if (fs.existsSync(oldQuestionImageDir)) fs.rmSync(oldQuestionImageDir, { recursive: true, force: true });
            }

            // Move and process new Question PDF
            fs.renameSync(questionPdf.path, questionPdfPath);
            const questionImageSubDir = path.join(extractedQuestionImageDir, path.basename(questionPdf.filename, '.pdf'));
            if (!fs.existsSync(questionImageSubDir)) fs.mkdirSync(questionImageSubDir, { recursive: true });
            const questionImageCount = await extractImagesFromPdf(questionPdfPath, questionImageSubDir);

            updatedFields.questionPdfPath = path.basename(questionPdf.filename, '.pdf');
            updatedFields.countOfQuestionImages = questionImageCount;
            updatedFields.relationName = relationName;
            updatedFields.coordinateStatus = coordinateStatus;
        }

        // Handle Answer PDF Replacement
        if (req.files.answerPdf) {
            const oldAnswerPdf = subjectSchemaRelation.answerPdfPath;
            const answerPdf = req.files.answerPdf[0];
            const answerPdfPath = path.join(answerPdfDir, answerPdf.filename);

            // Delete old PDF and its extracted images
            if (oldAnswerPdf) {
                const oldAnswerPdfPath = path.join(answerPdfDir, `${oldAnswerPdf}.pdf`);
                const oldAnswerImageDir = path.join(extractedAnswerImageDir, oldAnswerPdf);
                if (fs.existsSync(oldAnswerPdfPath)) fs.unlinkSync(oldAnswerPdfPath);
                if (fs.existsSync(oldAnswerImageDir)) fs.rmSync(oldAnswerImageDir, { recursive: true, force: true });
            }

            // Move and process new Answer PDF
            fs.renameSync(answerPdf.path, answerPdfPath);
            const answerImageSubDir = path.join(extractedAnswerImageDir, path.basename(answerPdf.filename, '.pdf'));
            if (!fs.existsSync(answerImageSubDir)) fs.mkdirSync(answerImageSubDir, { recursive: true });
            const answerImageCount = await extractImagesFromPdf(answerPdfPath, answerImageSubDir);

            updatedFields.answerPdfPath = path.basename(answerPdf.filename, '.pdf');
            updatedFields.countOfAnswerImages = answerImageCount;
            updatedFields.relationName = relationName;
            updatedFields.coordinateStatus = coordinateStatus;
        }

        // Update the database record
        const updatedSubjectSchemaRelation = await SubjectSchemaRelation.findByIdAndUpdate(
            subjectSchemaRelation._id,
            { $set: updatedFields },
            { new: true }
        );

        res.status(200).json(updatedSubjectSchemaRelation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while updating the subject schema relation.' });
    }
};

/* -------------------------------------------------------------------------- */
/*                           GET ALL SUBJECT SCHEMA RELATION                  */
/* -------------------------------------------------------------------------- */
const getAllSubjectSchemaRelationBySubjectId = async (req, res) => {
    const { subjectId } = req.params;
    try {

        if (!isValidObjectId(subjectId)) {
            return res.status(400).json({ message: "Invalid subject ID." });
        }

        const subjectSchemaRelations = await SubjectSchemaRelation.find({ subjectId: subjectId });
        if (!subjectSchemaRelations) {
            return res.status(404).json({ message: "Subject schema relations not found." });
        }

        res.status(200).json(subjectSchemaRelations);

    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while retrieving the subject schema relations.' });
    }
}
/* -------------------------------------------------------------------------- */
/*                           GET ALL SUBJECT SCHEMA RELATION                  */
/* -------------------------------------------------------------------------- */


const getAllSubjectSchemaRelationBySchemaId = async (req, res) => {
    const { schemaId } = req.params;

    try {

        if (!isValidObjectId(schemaId)) {
            return res.status(400).json({ message: "Invalid schema ID." });
        }

        const subjectSchemaRelations = await SubjectSchemaRelation.find({ schemaId: schemaId });
        if (!subjectSchemaRelations) {
            return res.status(404).json({ message: "Subject schema relations not found." });
        }

        res.status(200).json(subjectSchemaRelations);

    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while retrieving the subject schema relations.' });
    }
}

/* -------------------------------------------------------------------------- */
/*                           GET ALL SUBJECT SCHEMA RELATION                  */
/* -------------------------------------------------------------------------- */

const getAllSubjectSchemaRelationBySchemaIdAndSubjectId = async (req, res) => {
    const { schemaId, subjectId } = req.params;

    try {
        if (!schemaId || !subjectId) {
            return res.status(400).json({ message: "Invalid schema ID." });
        }

        if (!isValidObjectId(schemaId) || !isValidObjectId(subjectId)) {
            return res.status(400).json({ message: "Invalid schema ID." });
        }

        const subjectSchemaRelations = await SubjectSchemaRelation.find({ schemaId: schemaId, subjectId: subjectId });
        if (!subjectSchemaRelations) {
            return res.status(404).json({ message: "Subject schema relations not found." });
        }

        res.status(200).json(subjectSchemaRelations);

    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while retrieving the subject schema relations.' });
    }

}

/* -------------------------------------------------------------------------- */
/*                           GET ALL SUBJECT SCHEMA RELATION                  */
/* -------------------------------------------------------------------------- */

const getAllSubjectSchemaRelationBySubjectIdCoordinateStatusTrue = async (req, res) => {
    const { subjectId } = req.params;

    try {

        if (!isValidObjectId(subjectId)) {
            return res.status(400).json({ message: "Invalid subject ID." });
        }

        const subjectSchemaRelations = await SubjectSchemaRelation.find({ subjectId: subjectId, coordinateStatus: true });

        if (!subjectSchemaRelations) {
            return res.status(404).json({ message: "Subject schema relations not found." });
        }

        res.status(200).json(subjectSchemaRelations);

    }
    catch (error) {
        return res.status(500).json({ error: 'An error occurred while retrieving the subject schema relations.' });
    }
}

const getAllCoordinatesAndSchemaRelationDetails = async (req, res) => {
    const { subjectcode, questionDefinitionId } = req.query;

    try {
        if (!isValidObjectId(questionDefinitionId)) {
            return res.status(400).json({ message: " Invalid subject schema relation ID or question definition ID." });
        }


        const subjectDetails = await Subject.findOne({ code: subjectcode });

        if (!subjectDetails) {
            return res.status(404).json({ message: "Subject not found." });
        }

        const subjectSchemaRelation = await SubjectSchemaRelation.findOne({ subjectId: subjectDetails._id });


        if (!subjectSchemaRelation) {
            return res.status(404).json({ message: "Subject schema relation not found." });
        }

        const coordinateDetails = await CoordinateAllocation.find({ courseSchemaRelationId: subjectSchemaRelation._id, questionId: questionDefinitionId });

        if (!coordinateDetails) {
            return res.status(404).json({ message: "Coordinates not found." });
        }

        const Data = {
            subjectSchemaRelation,
            coordinateDetails
        }

        res.status(200).json(Data);
    }
    catch (error) {
        return res.status(500).json({ error: 'An error occurred while retrieving the subject schema relations.' });
    }
}




export default createSubjectSchemaRelation;

export {
    createSubjectSchemaRelation,
    getSubjectSchemaRelationById,
    deleteSubjectSchemaRelationById,
    updateSubjectSchemaRelation,
    getAllSubjectSchemaRelationBySubjectId,
    getAllSubjectSchemaRelationBySchemaId,
    getAllSubjectSchemaRelationBySchemaIdAndSubjectId,
    getAllCoordinatesAndSchemaRelationDetails,
    getAllSubjectSchemaRelationBySubjectIdCoordinateStatusTrue
}
