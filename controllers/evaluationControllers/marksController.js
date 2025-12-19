import Marks from "../../models/EvaluationModels/marksModel.js";
import { isValidObjectId } from "../../services/mongoIdValidation.js";

const createMarks = async (req, res) => {
    const { questionDefinitionId, answerPdfId, allottedMarks, timerStamps, isMarked } = req.body;
    try {
        if (!isValidObjectId(questionDefinitionId) || !isValidObjectId(answerPdfId)) {
            return res.status(400).json({ message: "Invalid questionDefinitionId or answerPdfId." });
        }

        const existingMarks = await Marks.findOne({ questionDefinitionId, answerPdfId });


        if (existingMarks) {
            existingMarks.allottedMarks = allottedMarks;
            existingMarks.timerStamps = timerStamps;
            existingMarks.isMarked = isMarked;

            await existingMarks.save();

            return res.status(200).json(existingMarks);
        } else {
            const marks = new Marks({ questionDefinitionId, answerPdfId, allottedMarks, timerStamps, isMarked: isMarked });
            await marks.save();

            return res.status(201).json(marks);
        }

    } catch (error) {
        console.error("Error creating or updating marks:", error);
        res.status(500).json({ message: "Failed to create or update marks", error: error.message });
    }
};


const updateMarks = async (req, res) => {
    const { id } = req.params;
    const { allottedMarks, timerStamps, isMarked } = req.body;

    try {

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid marks ID." });
        }

        const marks = await Marks.findOneAndUpdate({ _id: id }, { allottedMarks, timerStamps, isMarked }, { new: true });
        if (!marks) {
            return res.status(404).json({ message: "Marks not found." });
        }
        res.status(200).json(marks);
    }
    catch (error) {
        console.error("Error updating marks:", error);
        res.status(500).json({ message: "Failed to update marks", error: error.message });
    }
};

export {
    createMarks,
    updateMarks
}
