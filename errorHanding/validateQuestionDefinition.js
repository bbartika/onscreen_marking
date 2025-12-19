
/* -------------------------------------------------------------------------- */
/*                     VALIDATE QUESTION DEFINITION                           */
/* -------------------------------------------------------------------------- */

export const validateQuestionDefinition = ({
    schemaId,
    questionsName,
    maxMarks,
    minMarks,
    bonusMarks,
    marksDifference,
    isSubQuestion,
    numberOfSubQuestions,
    compulsorySubQuestions,
}) => {
    if (!schemaId || !questionsName || maxMarks == null || minMarks == null) {
        return "Missing required fields: schemaId, questionsName, maxMarks, or minMarks.";
    }

    if (Number(minMarks) > Number(maxMarks)) {
        return "Minimum marks must be less than or equal to maximum marks.";
    }

    if (isSubQuestion) {
        if (Number(numberOfSubQuestions) < 0 || Number(compulsorySubQuestions) < 0) {
            return "Subquestions cannot have numberOfSubQuestions or compulsorySubQuestions defined.";
        }

        if (Number(numberOfSubQuestions) < Number(compulsorySubQuestions)) {
            return "Number of sub-question cannot be less than compulsory sub-questions.";
        }

    }

    if (!marksDifference || isNaN(Number(marksDifference)) || Number(marksDifference) <= 0) {
        return "Marks difference is required and must be a positive number for parent questions.";
    }

    if (Number(bonusMarks) < 0) {
        return "Bonus marks cannot be negative.";
    }

    return null;
};
