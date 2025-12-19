import express from "express";
const router = express.Router();
import {
    processingBookletsBySocket,
    servingBooklets,
    removeRejectedBooklets,
    getAllBookletsName,
    processingBookletsManually
} from "../../controllers/bookletsProcessing/bookletsProcessing.js";

import authMiddleware from "../../Middlewares/authMiddleware.js";

router.post('/processing', processingBookletsBySocket);
router.get('/booklet', servingBooklets);
router.delete('/rejected', removeRejectedBooklets);
router.get('/bookletname', getAllBookletsName);
router.post('/manually', processingBookletsManually);

export default router;

