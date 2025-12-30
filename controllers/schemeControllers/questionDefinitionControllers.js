import QuestionDefinition from "../../models/schemeModel/questionDefinitionSchema.js";
import { validateQuestionDefinition } from "../../errorHanding/validateQuestionDefinition.js";
import Schema from "../../models/schemeModel/schema.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";
import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                           CREATE QUESTION DEFINITION                       */
/* -------------------------------------------------------------------------- */
const createQuestionDefinition = async (req, res) => {
    const {
        schemaId,
        parentQuestionId,
        questionsName,
        maxMarks,
        minMarks,
        bonusMarks,
        isSubQuestion,
        marksDifference,
        numberOfSubQuestions,
        compulsorySubQuestions,
    } = req.body;

    try {
        const errorMessage = validateQuestionDefinition({
            schemaId,
            questionsName,
            maxMarks,
            minMarks,
            bonusMarks,
            isSubQuestion,
            parentQuestionId: parentQuestionId ? parentQuestionId : null,
            marksDifference,
            numberOfSubQuestions,
            compulsorySubQuestions,
        });


        if (!isValidObjectId(schemaId)) {
            return res.status(400).json({ message: "Invalid schemaId." });
        }

        if (parentQuestionId && !isValidObjectId(parentQuestionId)) {
            return res.status(400).json({ message: "Invalid parentQuestionId." });
        }

        if (errorMessage) {
            return res.status(400).json({ message: errorMessage });
        }

        const existingSchema = await Schema.findById(schemaId);

        if (!existingSchema) {
            return res.status(400).json({ message: "Invalid schemaId. Schema does not exist." });
        }

        const questionDefinitionData = {
            schemaId,
            parentQuestionId: parentQuestionId ? parentQuestionId : null,
            questionsName,
            maxMarks,
            minMarks,
            isSubQuestion,
            bonusMarks: bonusMarks || 0,
            marksDifference: marksDifference || 0,
            numberOfSubQuestions: isSubQuestion ? (numberOfSubQuestions) : 0,
            compulsorySubQuestions: isSubQuestion ? (compulsorySubQuestions) : 0,
        };

        const questionDefinition = new QuestionDefinition(questionDefinitionData);

        await questionDefinition.save();

        return res.status(201).json({
            message: "Question definition created successfully.",
            data: questionDefinition,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while creating the question definition." });
    }
};


/* -------------------------------------------------------------------------- */
/*                       UPDATE QUESTION DEFINITION BY ID                     */
/* -------------------------------------------------------------------------- */
const updateQuestionDefinition = async (req, res) => {
    const {
        schemaId,
        parentQuestionId,
        questionsName,
        maxMarks,
        minMarks,
        bonusMarks,
        isSubQuestion,
        marksDifference,
        numberOfSubQuestions,
        compulsorySubQuestions,
    } = req.body;

    const { id } = req.params;

    try {
        const errorMessage = validateQuestionDefinition({
            schemaId,
            questionsName,
            maxMarks,
            minMarks,
            parentQuestionId: parentQuestionId || null,
            bonusMarks,
            marksDifference,
            isSubQuestion,
            numberOfSubQuestions,
            compulsorySubQuestions,
        });

        if (errorMessage) {
            return res.status(400).json({ message: errorMessage });
        }

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid question definition ID." });
        }

        if (!isValidObjectId(schemaId)) {
            return res.status(400).json({ message: "Invalid schemaId." });
        }

        if (parentQuestionId && !isValidObjectId(parentQuestionId)) {
            return res.status(400).json({ message: "Invalid parentQuestionId." });
            
        }

        // Check if the question definition exists
        const existingQuestion = await QuestionDefinition.findById(id);
        if (!existingQuestion) {
            return res.status(404).json({ message: "Question definition not found." });
        }

        // Ensure the schema exists
        const existingSchema = await Schema.findById(schemaId);
        if (!existingSchema) {
            return res.status(400).json({ message: "Invalid schemaId. Schema does not exist." });
        }


        if (existingQuestion.isSubQuestion && !isSubQuestion) {
            await QuestionDefinition.deleteMany({ parentQuestionId: existingQuestion._id });
        }

        // Prepare updated data
        const updatedData = {
            schemaId,
            parentQuestionId: parentQuestionId ? parentQuestionId : null,
            questionsName,
            maxMarks,
            minMarks,
            isSubQuestion,
            bonusMarks: bonusMarks || 0,
            marksDifference: marksDifference || 0,
            numberOfSubQuestions: isSubQuestion ? (numberOfSubQuestions || 0) : 0,
            compulsorySubQuestions: isSubQuestion ? (compulsorySubQuestions || 0) : 0,
        };

        // Update the question definition
        const updatedQuestion = await QuestionDefinition.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true } // Return the updated document
        );

        return res.status(200).json({
            message: "Question definition updated successfully.",
            data: updatedQuestion,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "An error occurred while updating the question definition.",
        });
    }
};


/* -------------------------------------------------------------------------- */
/*                           REMOVE QUESTION DEFINITION                       */
/* -------------------------------------------------------------------------- */
const removeQuestionDefinition = async (req, res) => {
    const { id } = req.params;

    try {
        const existingQuestion = await QuestionDefinition.findById(id);
        if (!existingQuestion) {
            return res.status(404).json({ message: "Question definition not found." });
        }

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid question definition ID." });
        }

        if (existingQuestion.isSubQuestion) {
            const subQuestions = await QuestionDefinition.find({
                parentQuestionId: id,
            });

            if (subQuestions.length > 0) {
                await QuestionDefinition.deleteMany({ parentQuestionId: id });
            }
        }

        await QuestionDefinition.findByIdAndDelete(id);

        return res.status(200).json({
            message: "Question definition and associated subquestions removed successfully.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "An error occurred while removing the question definition.",
        });
    }
};


/* -------------------------------------------------------------------------- */
/*                           GET QUESTION DEFINITION BY ID                    */
/* -------------------------------------------------------------------------- */

const getQuestionDefinitionById = async (req, res) => {
    const { id } = req.params;
    try {

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid question definition ID." });
        }

        const questionDefinition = await QuestionDefinition.findById(id);

        if (!questionDefinition) {
            return res.status(404).json({ message: "Question definition not found." });
        }

        let subQuestions = [];
        if (questionDefinition.isSubQuestion) {
            subQuestions = await QuestionDefinition.find({ parentQuestionId: id });
        }
        console.log("questionDefinition:", questionDefinition);

        console.log("subQuestions:", subQuestions);

        return res.status(200).json({
            message: "Question definition retrieved successfully.",
            data: {
                parentQuestion: questionDefinition,
                subQuestions: subQuestions,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "An error occurred while retrieving the question definition.",
        });
    }
};

/* -------------------------------------------------------------------------- */
/*                  GET ALL PRIMARY QUESTION BY SCHEMA ID                     */
/* -------------------------------------------------------------------------- */
const getAllPrimaryQuestionBasedOnSchemeId = async (req, res) => {
    const { schemaId } = req.params;

    try {

        if (!isValidObjectId(schemaId)) {
            return res.status(400).json({ message: "Invalid question definition ID." });
        }

        const primaryQuestions = await QuestionDefinition.find({
            schemaId,
            parentQuestionId: null,
        });

        console.log("primaryQuestions:", primaryQuestions);

        const subQuestionsMap = await QuestionDefinition.find({
                schemaId: new mongoose.Types.ObjectId(schemaId),
                parentQuestionId: { $ne: null }
            });

            console.log("subQuestionsMap:", subQuestionsMap);

        if (primaryQuestions.length === 0) {
            return res.status(200).json({ message: "No primary questions found for the given schemaId.", data: [] });
        }

        return res.status(200).json({
            message: "Primary questions retrieved successfully.",
            data: primaryQuestions,subQuestionsMap
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "An error occurred while retrieving the primary questions.",
        });
    }
};

export {
    createQuestionDefinition,
    updateQuestionDefinition,
    removeQuestionDefinition,
    getQuestionDefinitionById,
    getAllPrimaryQuestionBasedOnSchemeId,
}


