import mongoose from "mongoose";

const studentAnswerPdf = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true
    },
    answerPdfName: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: false
    },
    assignedDate: {
        type: Date,
        required: true,
        index: true
    }
});

const AnswerPdf = mongoose.model("AnswerPdf", studentAnswerPdf);

export default AnswerPdf;
