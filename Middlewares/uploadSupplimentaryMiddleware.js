
import multer from "multer";
import path from "path";
import fs from "fs";

/* =========================
   TEMP STORAGE
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.resolve(process.cwd(), "uploadedPdfs/temp");

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    cb(null, tempDir);
  },

  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

/* =========================
   FILE FILTER (PDF ONLY)
========================= */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext !== ".pdf") {
    return cb(
      new Error("Only PDF files are allowed for supplementary upload"),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});
const uploadSupplimentaryPdfMiddleware = (req, res, next) => {
  upload.single("supplimentaryPdf")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: "Supplementary PDF upload failed",
        error: err.message,
      });
    }
    next();
  });
};
export default uploadSupplimentaryPdfMiddleware;