import express from "express";
const router = express.Router();

import {
    assigningTask,
    reassignPendingBooklets,
    reassignBooklets,
    getUserCurrentTaskStatus,
   
    removeAssignedTask,
    getAssignTaskById,
    getAllAssignedTaskByUserId,
    getAllTaskHandler,
    updateCurrentIndex,
    getQuestionDefinitionTaskId,
    getAllTasksBasedOnSubjectCode,
    completedBookletHandler,
    checkTaskCompletionHandler,
    editTaskHandler,
    autoAssigning,
    rejectBooklet,
    getReviewerTask
    // generatePdfForCompletedBooklet
} from "../../controllers/taskControllers/taskControllers.js";

import authMiddleware from "../../Middlewares/authMiddleware.js";

/* -------------------------------------------------------------------------- */
/*                           TASK ROUTES                                      */
/* -------------------------------------------------------------------------- */

router.post("/create/task", assigningTask);
router.post("/autoassign/task", autoAssigning);
router.post("/reassign/pending-booklets", reassignPendingBooklets);
router.get("/user/task-status/:userId", getUserCurrentTaskStatus);
router.post("/reassign/booklets", reassignBooklets);    
// router.get("/pause/task/:id", pauseTask);
// router.put("/update/task/:id", updateAssignedTask);
router.put("/edit/task/:taskId", editTaskHandler);
router.put("/update/task/currentIndex/:id", updateCurrentIndex);
router.delete("/remove/task/:id", removeAssignedTask);
router.get("/get/all/tasks", getAllTaskHandler);
router.get("/get/reviewerTask/:id", getReviewerTask);
router.get("/get/task/:id", getAssignTaskById);
router.get("/get/questiondefinition", getQuestionDefinitionTaskId);
router.get("/getall/tasks/:userId", getAllAssignedTaskByUserId);
router.get("/subjectcode", getAllTasksBasedOnSubjectCode);
router.post("/rejectbooklet/:answerPdfId", rejectBooklet);
router.put("/completedbooklet/:answerpdfid/:userId", completedBookletHandler);

// router.post("/completeBooklet/generatePdf/:answerPdfId", generatePdfForCompletedBooklet);

router.put("/checktaskcompletion/:id", checkTaskCompletionHandler);

export default router;
