import CoordinateAllocation from "../../models/subjectSchemaRelationModel/coordinateAllocationModel.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";
import CourseSchemaRelation from "../../models/subjectSchemaRelationModel/subjectSchemaRelationModel.js";
import QuestionDefinition from "../../models/schemeModel/questionDefinitionSchema.js";

/* -------------------------------------------------------------------------- */
/*                              CREATE COORDINATE ALLOCATION                  */
/* -------------------------------------------------------------------------- */
const createCoordinateAllocation = async (req, res) => {
    try {
        const { courseSchemaRelationId, questionId, questionImages, answerImages } = req.body;

        // Validate required fields
        if (!courseSchemaRelationId || !questionId || !questionImages || !answerImages) {
            return res.status(400).json({ message: "CourseSchemaRelationId, QuestionId, AnswerImages and QuestionImages are required." });
        }

        // Validate CourseSchemaRelationId
        if (!isValidObjectId(courseSchemaRelationId)) {
            return res.status(400).json({ message: "Invalid CourseSchemaRelationId." });
        }

        // Validate QuestionId
        if (!isValidObjectId(questionId)) {
            return res.status(400).json({ message: "Invalid QuestionId." });
        }

        // Validate AnswerImages
        if (!Array.isArray(answerImages)) {
            return res.status(400).json({ message: "AnswerImages must be an array." });
        }

        // Validate QuestionImages
        if (!Array.isArray(questionImages)) {
            return res.status(400).json({ message: "QuestionImages must be an array." });
        }


        // Check if CourseSchemaRelationId exists
        const courseSchemaRelation = await CourseSchemaRelation.findById(courseSchemaRelationId);
        if (!courseSchemaRelation) {
            return res.status(404).json({ message: "CourseSchemaRelation not found." });
        }

        // Check if QuestionId exists
        const question = await QuestionDefinition.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: "Question not found." });
        }

        // Check if a CoordinateAllocation with the same CourseSchemaRelationId and QuestionId already exists
        const existingCoordinateAllocation = await CoordinateAllocation.findOne({ courseSchemaRelationId, questionId });
        if (existingCoordinateAllocation) {
            return res.status(400).json({ message: "A CoordinateAllocation with the same CourseSchemaRelationId and QuestionId already exists." });
        }

        // Create a new CoordinateAllocation
        const newCoordinateAllocation = new CoordinateAllocation({
            courseSchemaRelationId,
            questionId,
            questionImages,
            answerImages
        });

        const savedCoordinateAllocation = await newCoordinateAllocation.save();
        res.status(201).json(savedCoordinateAllocation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating Coordinate Allocation.", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                               UPDATE COORDINATE ALLOCATION                 */
/* -------------------------------------------------------------------------- */
const updateCoordinateAllocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { questionImages, answerImages } = req.body;

        // Validate required fields
        if (!id) {
            return res.status(400).json({ message: "ID is required." });
        }

        if (!questionImages || !answerImages) {
            return res.status(400).json({ message: "QuestionImages and AnswerImages are required." });
        }

        // Validate ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid ID." });
        }

        // Validate AnswerImages
        if (!Array.isArray(answerImages)) {
            return res.status(400).json({ message: "AnswerImages must be an array." });
        }

        // Validate QuestionImages
        if (!Array.isArray(questionImages)) {
            return res.status(400).json({ message: "QuestionImages must be an array." });
        }

        // Check if the CoordinateAllocation exists
        const coordinateAllocation = await CoordinateAllocation.findById(id);

        if (!coordinateAllocation) {
            return res.status(404).json({ message: "Coordinate Allocation not found." });
        }

        // Find and update the record
        const updatedCoordinateAllocation = await CoordinateAllocation.findByIdAndUpdate(
            id,
            { $set: { questionImages, answerImages } },
            { new: true } // Return the updated document
        );

        if (!updatedCoordinateAllocation) {
            return res.status(404).json({ message: "Coordinate Allocation not found." });
        }

        res.status(200).json(updatedCoordinateAllocation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating Coordinate Allocation.", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                               DELETE COORDINATE ALLOCATION                 */
/* -------------------------------------------------------------------------- */
const deleteCoordinateAllocation = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id) {
            return res.status(400).json({ message: "ID is required." });
        }

        const deletedCoordinateAllocation = await CoordinateAllocation.findByIdAndDelete(id);

        if (!deletedCoordinateAllocation) {
            return res.status(404).json({ message: "Coordinate Allocation not found." });
        }

        res.status(200).json({ message: "Coordinate Allocation deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting Coordinate Allocation.", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                               GET COORDINATE ALLOCATION                    */
/* -------------------------------------------------------------------------- */
const getCoordinateAllocationById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id) {
            return res.status(400).json({ message: "ID is required." });
        }

        const coordinateAllocation = await CoordinateAllocation.findById(id);

        if (!coordinateAllocation) {
            return res.status(404).json({ message: "Coordinate Allocation not found." });
        }

        res.status(200).json(coordinateAllocation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching Coordinate Allocation.", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                               GET COORDINATE ALLOCATION                    */
/* -------------------------------------------------------------------------- */
const getCoordinateAllocationBySubjectSchemaRelationId = async (req, res) => {
    try {
        const { courseSchemaRelationId } = req.params;

        // Validate CourseSchemaRelationId
        if (!courseSchemaRelationId) {
            return res.status(400).json({ message: "CourseSchemaRelationId is required." });
        }

        const coordinateAllocations = await CoordinateAllocation.find({ courseSchemaRelationId });

        if (!coordinateAllocations || coordinateAllocations.length === 0) {
            return res.status(404).json({ message: "No Coordinate Allocations found for the given CourseSchemaRelationId." });
        }

        res.status(200).json(coordinateAllocations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching Coordinate Allocations.", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*         GET COORDINATE ALLOCATION BY SUBJECT ID THOSE STATUS TRUE          */
/* -------------------------------------------------------------------------- */

const getCoordinateAllocationBySubjectIdStatusTrue = async (req, res) => {
    try {
        const { courseSchemaRelationId } = req.params;

        // Validate SubjectId
        if (!courseSchemaRelationId) {
            return res.status(400).json({ message: "SubjectId is required." });
        }

        const coordinateAllocations = await CoordinateAllocation.find({ courseSchemaRelationId, status: true });

        if (!coordinateAllocations || coordinateAllocations.length === 0) {
            return res.status(404).json({ message: "No Coordinate Allocations found for the given courseSchemaRelationId." });
        }

        res.status(200).json(coordinateAllocations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching Coordinate Allocations.", error: error.message });
    }
};

export {
    createCoordinateAllocation,
    updateCoordinateAllocation,
    deleteCoordinateAllocation,
    getCoordinateAllocationById,
    getCoordinateAllocationBySubjectSchemaRelationId,
    getCoordinateAllocationBySubjectIdStatusTrue
};
