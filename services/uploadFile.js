import multer from "multer";
import { __dirname } from "../server.js";
import path from "path"
import fs from "fs";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempFolder = path.join(__dirname, "temp/uploads");

        // Create the directory if it doesn't exist
        if (!fs.existsSync(tempFolder)) {
            fs.mkdirSync(tempFolder, { recursive: true });
        }

        cb(null, tempFolder);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

export default upload;