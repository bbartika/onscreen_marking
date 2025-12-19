import mongoose from "mongoose";

const answerPdfImageSchema = new mongoose.Schema({
    answerPdfId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnswerPdf",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    }
});

const AnswerPdfImage = mongoose.model("AnswerPdfImage", answerPdfImageSchema);

export default AnswerPdfImage;