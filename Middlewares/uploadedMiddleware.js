import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadedMiddleware = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.zip$/i)) {
      return cb(new Error("Only ZIP files are allowed"));
    }
    cb(null, true);
  }
});

export default uploadedMiddleware;