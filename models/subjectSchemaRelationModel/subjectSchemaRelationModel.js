import mongoose from "mongoose";

/* --------------------------------------------------------------------------  */
/*                           SUBJECT SCHEMA RELATION                           */
/* --------------------------------------------------------------------------  */

const courseSchemaRelation = new mongoose.Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
    },
    schemaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Schema",
        required: true,
    },
    questionPdfPath: {
        type: String,
        required: true
    },
    answerPdfPath: {
        type: String,
        required: true
    },
    relationName: {
        type: String,
        required: true
    },
    coordinateStatus: {
        type: Boolean,
        required: false
    },
    countOfQuestionImages: {
        type: Number,
        required: true
    },
    countOfAnswerImages: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const CourseSchemaRelation = mongoose.model("CourseSchemaRelation", courseSchemaRelation);

export default CourseSchemaRelation;