import mongoose from "mongoose";

const reviewerTaskSchema = new mongoose.Schema(
{
    subjectCode: {
     type: String,
     required: true,
    },

    evaluatorId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "User",
     required: true,
    },

    reviewerId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "User",
     required: true,
    },

    questiondefinitionId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "QuestionDefinition",
     required: true,
    },

    totalBooklets: {
     type: Number,
     default: 0,
    },

    status: {
     type: String,
     enum: ["inactive", "active", "completed"],
     default: "inactive",
    },

    createdAt: {
     type: Date,
     default: Date.now,
    },
},
{ timestamps: true },
);

export default mongoose.model("ReviewerTask", reviewerTaskSchema);