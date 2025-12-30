// import multer from 'multer';
// import fs from 'fs';
// import path from 'path';

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const uploadDir = path.resolve(process.cwd(), 'uploadedPdfs/temp');

//         fs.mkdir(uploadDir, { recursive: true }, (err) => {
//             if (err) {
//                 console.error("Error creating directory:", err);
//                 return cb(err, null);
//             }
//             cb(null, uploadDir);
//         });
//     },
//     filename: (req, file, cb) => {
//         const uniqueName = `${Date.now()}-${file.originalname}`;
//         cb(null, uniqueName);
//     }
// });

// const upload = multer({ storage });

// export const uploadMiddleware = (req, res, next) => {

//     upload.fields([
//         { name: 'questionPdf', maxCount: 1 },
//         { name: 'answerPdf', maxCount: 1 }
//     ])(req, res, (err) => {
//         if (err) {
//             console.error("Error uploading files:", err);
//             return res.status(400).json({ message: 'File upload failed', error: err.message });
//         }

//         next();
//     });
// };

// export default uploadMiddleware;

import multer from "multer";
import fs from "fs";
import path from "path";

//  Resolve ONCE, not per request
const tempDir = path.resolve(process.cwd(), "uploadedPdfs", "temp");

// MUST be sync (critical)
fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

export const uploadMiddleware = (req, res, next) => {
  upload.fields([
    { name: "questionPdf", maxCount: 1 },
    { name: "answerPdf", maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      console.error("Error uploading files:", err);
      return res.status(400).json({
        message: "File upload failed",
        error: err.message,
      });
    }
    next();
  });
};

export default uploadMiddleware;
