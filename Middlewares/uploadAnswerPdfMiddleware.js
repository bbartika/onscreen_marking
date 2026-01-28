import multer from "multer";
import path from "path";
import fs from "fs";

const tempDir = path.resolve(process.cwd(), "uploadedPdfs/answer-temp");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: tempDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext !== ".pdf" && ext !== ".zip") {
    return cb(
      new Error("Only PDF or ZIP files are allowed for answer upload"),
      false,
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB (scalable)
  },
  fileFilter,
});

const uploadAnswerPdfMiddleware = (req, res, next) => {
  upload.single("answerFile")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: "Answer file upload failed",
        error: err.message,
      });
    }
    next();
  });
};

export default uploadAnswerPdfMiddleware;
