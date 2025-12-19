import express from "express";
const router = express.Router();

import {
    createIconHandler,
    updateIconHandler,
    removeIconByIdHandler,
    getIconsById,
    getAllIconsByQuestionIdAndAnswerImageId
} from "../../controllers/evaluationControllers/iconController.js";
import authMiddleware from "../../Middlewares/authMiddleware.js";


/* -------------------------------------------------------------------------- */
/*                           ICON ROUTES                                      */
/* -------------------------------------------------------------------------- */
router.post("/create", createIconHandler);
router.put("/update/:id", updateIconHandler);
router.get("/geticons", getAllIconsByQuestionIdAndAnswerImageId);
router.get("/get/:id", getIconsById);
router.delete("/remove", removeIconByIdHandler);


export default router;
