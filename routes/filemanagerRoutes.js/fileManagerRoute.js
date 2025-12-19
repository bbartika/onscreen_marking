import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { listFiles, uploadFile, deleteFile } from '../../controllers/filemanagerController.js/filemanagerController.js';

// Root folder for uploads
const rootFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), '../wwwroot/Files');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, rootFolder);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});
const upload = multer({ storage });
const router = express.Router();
/* -------------------------------------------------------------------------- */
/*                                FILE MANAGER ROUTES                         */
/* -------------------------------------------------------------------------- */
router.post('/list', listFiles);
router.post('/upload', upload.single('file'), uploadFile);
router.post('/delete', deleteFile);

export default router;
    