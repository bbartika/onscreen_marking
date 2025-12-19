import mongoose from "mongoose";


/* -------------------------------------------------------------------------- */
/*                           SUBJECT SCHEMA                                    */
/* -------------------------------------------------------------------------- */
const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;