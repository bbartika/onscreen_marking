import mongoose from "mongoose";

const marksSchema = new mongoose.Schema({
    questionDefinitionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionDefinition",
        required: true
    },
    answerPdfId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnswerPdf",
        required: true
    },
    allottedMarks: {
        type: Number,
        required: true
    },
    timerStamps: {
        type: String,
        required: true
    },
    isMarked: {
        type: Boolean,
        default: false
    }
})

const Marks = mongoose.model('Marks', marksSchema);


export default Marks;