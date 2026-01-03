import express from "express";
const router = express.Router();
import {
    processingBookletsBySocket,
    servingBooklets,
    uploadingBooklets,
    removeRejectedBooklets,
    getAllBookletsName,
    processingBookletsManually
} from "../../controllers/bookletsProcessing/bookletsProcessing.js";

import authMiddleware from "../../Middlewares/authMiddleware.js";
import uploadedMiddleware from "../../Middlewares/uploadedMiddleware.js";


router.post('/uploadingbooklets', authMiddleware, uploadedMiddleware.single("file"), uploadingBooklets);
router.post('/processing', processingBookletsBySocket);
router.get('/booklet', servingBooklets);
router.delete('/rejected', removeRejectedBooklets);
router.get('/bookletname', getAllBookletsName);
router.post('/manually', processingBookletsManually);

export default router;

