import mongoose from "mongoose";

const iconSchema = new mongoose.Schema({
    // ⭐ OUR CUSTOM UNIQUE ID FROM FRONTEND JSON
    annotationId: {
        type: String,
        required: true,
        unique: true
    },

    answerPdfImageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnswerPdfImage",
        required: true
    },

    questionDefinitionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionDefinition",
        required: true
    },

    iconUrl: {
        type: String,
        required: true
    },

    question: {
        type: String,
        required: true
    },

    timeStamps: {
        type: String,
        required: true
    },

    x: {
        type: String,
        required: true
    },

    y: {
        type: String,
        required: true
    },

    width: {
        type: String,
        required: true
    },

    height: {
        type: String,
        required: true
    },

    mark: {
        type: String,
        required: true
    },

    comment: {
        type: String,
        default: ""
    },

    answerPdfId: {
        type: String,
        required: true
    },

    page: {
        type: Number,
        required: true
    }
});

const Icon = mongoose.model("Icon", iconSchema);

export default Icon;