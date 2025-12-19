import express from "express";
const router = express.Router();

import { generateResult, getPreviousResult, downloadResultByName  , getCompletedBooklets  } from "../../controllers/resultGenerationContollers/resultGeneration.js";
import upload from "../../services/uploadFile.js";

/* -------------------------------------------------------------------------- */
/*                           RESULT GENERATION ROUTES                         */
/* -------------------------------------------------------------------------- */

router.post('/generate', upload.single('csvFilePath'), generateResult);
router.get('/getpreviousresult', getPreviousResult);
router.get('/downloadresult', downloadResultByName);
router.get('/getcompletedbooklets/:id/:userId', getCompletedBooklets);

export default router;