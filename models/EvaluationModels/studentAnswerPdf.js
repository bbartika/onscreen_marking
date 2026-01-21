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
        type: String,
        default: false
    },
    assignedDate: {
        type: Date,
        required: true,
        index: true
    },
    rejectionReason:{
        type: String
    },

    rejectedAt:{
        type: Date
    }
});

const AnswerPdf = mongoose.model("AnswerPdf", studentAnswerPdf);

export default AnswerPdf;
