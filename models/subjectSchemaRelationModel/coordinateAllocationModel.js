import mongoose from "mongoose";

const coordinateAllocationSchema = new mongoose.Schema({
    courseSchemaRelationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CourseSchemaRelation",
        required: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionDefinition",
        required: true
    },
    questionImages: {
        type: [String],
        required: true
    },
    answerImages: {
        type: [String],
        required: true
    }
});

const CoordinateAllocation = mongoose.model(
    "CoordinateAllocation",
    coordinateAllocationSchema
);

export default CoordinateAllocation;
