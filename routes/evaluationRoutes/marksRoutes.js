import express from 'express';
const router = express.Router();

import {
    createMarks,
    updateMarks
} from "../../controllers/evaluationControllers/marksController.js";

import authMiddleware from "../../Middlewares/authMiddleware.js";

/* -------------------------------------------------------------------------- */
/*                           MARKS ROUTES                                     */
/* -------------------------------------------------------------------------- */

router.post('/create', createMarks);
router.put('/update/:id', authMiddleware, updateMarks);

export default router;