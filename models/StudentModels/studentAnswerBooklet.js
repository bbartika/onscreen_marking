import mongoose from "mongoose";

const StudentAnswerBooklet = new mongoose.Schema({
    studentFolderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StudentFolder",
        required: true
    },
    totalImages: {
        type: Number,
        required: true
    },
    answerBookletName: {
        type: String,
        required: true
    },
    isProcessed: {
        type: Boolean,
        default: false
    }
})

export default StudentAnswerBooklet;