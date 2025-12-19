import mongoose from "mongoose";


/* -------------------------------------------------------------------------- */
/*                           SCHEMA STRUCTURE SCHEMA                          */
/* -------------------------------------------------------------------------- */

const schemaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    totalQuestions: {
        type: Number,
        required: true,
        min: [1, "Total questions must be at least 1."]
    },
    maxMarks: {
        type: Number,
        required: true,
        min: [1, "Maximum marks must be at least 1."]
    },
    minMarks: {
        type: Number,
        required: true,
        min: [0, "Minimum marks cannot be negative."]
    },
    compulsoryQuestions: {
        type: Number,
        default: 0,
        min: [0, "Compulsory questions cannot be negative."]
    },
    status: {
        type: Boolean,
        default: false
    },
    evaluationTime: {
        type: Number,
        required: true,
        min: [1, "Evaluation time must be at least 1."]
    },
    numberOfPage: {
        type: Number,
        require: true
    },
    hiddenPage: {
        type: [String],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});

const Schema = mongoose.model("Schema", schemaSchema);
export default Schema;
