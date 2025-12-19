import express from 'express';
const router = express.Router();

import {
    createQuestionDefinition,
    updateQuestionDefinition,
    removeQuestionDefinition,
    getQuestionDefinitionById,
    getAllPrimaryQuestionBasedOnSchemeId,
} from "../../controllers/schemeControllers/questionDefinitionControllers.js"

import authMiddleware from "../../Middlewares/authMiddleware.js";


/* -------------------------------------------------------------------------- */
/*                           QUESTION DEFINITION ROUTES                       */
/* -------------------------------------------------------------------------- */

router.post("/create/questiondefinition", authMiddleware, createQuestionDefinition);
router.put('/update/questiondefinition/:id', authMiddleware, updateQuestionDefinition);
router.delete("/remove/questiondefinition/:id", authMiddleware, removeQuestionDefinition);
router.get('/get/questiondefinition/:id', authMiddleware, getQuestionDefinitionById);
router.get("/getall/questiondefinitions/:schemaId", authMiddleware, getAllPrimaryQuestionBasedOnSchemeId);


export default router;