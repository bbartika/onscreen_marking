import mongoose from "mongoose";

const bookletReassignmentSchema = new mongoose.Schema({
    subjectCode: {
        type: String,
        required: true,
    },

    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    fromTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true,
    },

    toTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true,
    },

    transferredCount: {
        type: Number,
        required: true,
    },

    transferredPdfNames: {
        type: [String],
        required: true,
    },

    reason: {
        type: String,
        default: "manual reassignment",
    },

    reassignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // admin
        required: true,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model(
    "BookletReassignment",
    bookletReassignmentSchema
);
