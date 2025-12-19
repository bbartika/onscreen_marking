import Subject from "../../models/classModel/subjectModel.js";
import Task from "../../models/taskModels/taskModel.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";



/* -------------------------------------------------------------------------- */
/*                           CREATE SUBJECT                                   */
/* -------------------------------------------------------------------------- */
const createSubject = async (req, res) => {
    const { name, code, classId } = req.body;

    if (!name || !code || !classId) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        if (!isValidObjectId(classId)) {
            return res.status(400).json({ message: "Invalid class ID." });
        }

        // Check if a subject with the same code exists in the same class (case-insensitive)
        const existingSubject = await Subject.findOne({
            classId,
            code: new RegExp(`^${code}$`, 'i') // Case-insensitive search
        });

        if (existingSubject) {
            return res.status(400).json({
                message: `Subject code '${code}' already exists in this class.`
            });
        }

        // Create and save the new subject
        const newSubject = new Subject({
            name,
            code,
            classId
        });
        const savedSubject = await newSubject.save();

        return res.status(201).json(savedSubject);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "An error occurred while creating the subject." });
    }
};

/* -------------------------------------------------------------------------- */
/*                           REMOVE SUBJECT                                   */
/* -------------------------------------------------------------------------- */
const removeSubject = async (req, res) => {
    const { id } = req.params;
    try {

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid subject ID." });
        }

        const subject = await Subject.findByIdAndDelete(id);
        if (!subject) {
            return res.status(404).json({ message: "Subject not found." });
        }
        return res.status(200).json({ message: "Subject successfully removed." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while removing the subject." });
    }
}

/* -------------------------------------------------------------------------- */
/*                           GET SUBJECT BY ID                                */
/* -------------------------------------------------------------------------- */
const getSubjectById = async (req, res) => {
    const { id } = req.params;
    try {


        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid subject ID." });
        }

        const subject = await Subject.findById(id);
        if (!subject) {
            return res.status(404).json({ message: "Subject not found." });
        }
        return res.status(200).json(subject);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while retrieving the subject." });
    }
}

/* -------------------------------------------------------------------------- */
/*                           GET ALL SUBJECTS                                 */
/* -------------------------------------------------------------------------- */
const getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find();
        return res.status(200).json(subjects);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while retrieving the subjects." });
    }
}

/* -------------------------------------------------------------------------- */
/*                           UPDATE SUBJECT BY ID                             */
/* -------------------------------------------------------------------------- */
const updateSubject = async (req, res) => {
    const { id } = req.params;
    const { name, code, classId } = req.body;

    if (!name || !code || !classId) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid subject ID." });
        }

        if (!isValidObjectId(classId)) {
            return res.status(400).json({ message: "Invalid class ID." });
        }

        // Check if a subject with the same code exists in the same class (case-insensitive) and is not the current subject
        const existingSubject = await Subject.findOne({
            classId,
            code: new RegExp(`^${code}$`, 'i'),
            _id: { $ne: id }
        });

        if (existingSubject) {
            return res.status(400).json({
                message: `Subject code '${code}' already exists in this class.`
            });
        }

        // Find and update the subject
        const subject = await Subject.findByIdAndUpdate(
            id,
            { name, code },
            { new: true }
        );

        if (!subject) {
            return res.status(404).json({ message: "Subject not found." });
        }

        return res.status(200).json(subject);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while updating the subject." });
    }
};

const subjectsWithTasks = async (req, res) => {
    try {
        const subjects = await Subject.find();
        console.log("subjects", subjects);
        
        if (!subjects || subjects.length === 0) {
            return res.status(404).json({ message: "No subjects found." });
        }

        const subjectCodes = subjects.map((subject) => subject.code);

        const tasks = await Task.find({ subjectCode: { $in: subjectCodes } });

        

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ message: "No tasks assigned to any subject." });
        }

        const assignedSubjectCodes = new Set(tasks.map((task) => task.subjectCode));

        const subjectsWithTasks = subjects.filter((subject) =>
            assignedSubjectCodes.has(subject.code)
        );

        return res.status(200).json({ subjects: subjectsWithTasks });
    } catch (error) {
        console.error("Error fetching subjects with tasks:", error);
        return res.status(500).json({ message: "An error occurred.", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                           GET ALL SUBJECTS BY CLASS  ID                    */
/* -------------------------------------------------------------------------- */
const getAllSubjectBasedOnClassId = async (req, res) => {
    const { classId } = req.params;
    try {


        if (!isValidObjectId(classId)) {
            return res.status(400).json({ message: "Invalid class ID." });
        }

        const subjects = await Subject.find({ classId });
        return res.status(200).json(subjects);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while retrieving the subjects." });
    }
}


export {
    createSubject,
    removeSubject,
    getSubjectById,
    getAllSubjects,
    updateSubject,
    getAllSubjectBasedOnClassId,
    subjectsWithTasks
};
