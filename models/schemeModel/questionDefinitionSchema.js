import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                           QUESTION DEFINITION SCHEMA                       */
/* -------------------------------------------------------------------------- */

const questionDefinitionSchema = new mongoose.Schema({
    schemaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Schema",
        required: true,
    },
    parentQuestionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionDefinition",
        default: null,
    },
    questionsName: {
        type: String,
        required: true,
    },
    maxMarks: {
        type: Number,
        required: true,
    },
    minMarks: {
        type: Number,
        required: true,
    },
    isSubQuestion: {
        type: Boolean,
        required: true,
        default: false,
    },
    bonusMarks: {
        type: Number,
        default: 0,
    },
    marksDifference: {
        type: Number,
        required: function () {
            return !this.isSubQuestion;
        },
    },
    numberOfSubQuestions: {
        type: Number,
        default: 0,
    },
    compulsorySubQuestions: {
        type: Number,
        default: 0,
    },
});

const QuestionDefinition = mongoose.model(
    "QuestionDefinition",
    questionDefinitionSchema
);

export default QuestionDefinition;
