import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                           COURSE SCHEMA                                    */
/* -------------------------------------------------------------------------- */

const courseSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        trim: true,
    },
    classCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    session: {
        type: Number,
        required: true,
    },
    year: {
        type: String,
        required: true,
        trim: true,
    },
    startDate: {
        type: Date,
        default: null,
    },
    endDate: {
        type: Date,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

courseSchema.pre('save', function () {
    this.updatedAt = Date.now();
    // next();
});

const Course = mongoose.model('Course', courseSchema);

export default Course;


