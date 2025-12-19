import chokidar from "chokidar";
import path from "path";
import fs from "fs";
import SubjectFolderModel from "../../models/StudentModels/subjectFolderModel.js";
import { io } from "../../server.js";
import { __dirname } from "../../server.js";

const subjectFolderWatcher = () => {
    const scannedDataPath = path.join(__dirname, "scannedFolder");

    if (!fs.existsSync(scannedDataPath)) {
        console.log(`'scannedFolder' does not exist. Creating it at: ${scannedDataPath}`);
        fs.mkdirSync(scannedDataPath, { recursive: true });
    } else {
        console.log(`'scannedFolder' exists at: ${scannedDataPath}`);
    }

    // File watcher setup
    const watcher = chokidar.watch(scannedDataPath, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        depth: 1,
    });

    // Helper function to count PDFs in a folder
    const countPdfsInFolder = (folderPath) => {
        const files = fs.readdirSync(folderPath);
        return files.filter(file => file.endsWith(".pdf")).length;
    };

    // Function to handle folder updates or creation
    const updateOrCreateFolderInDatabase = async (folderName, folderPath) => {
        try {
            const totalPdfs = countPdfsInFolder(folderPath);

            if (totalPdfs === 0) {
                console.log(`No PDFs found in folder: ${folderName}. Skipping database update.`);
                return;
            }

            const updatedFolder = await SubjectFolderModel.findOneAndUpdate(
                { folderName },
                {
                    $set: {
                        scannedFolder: totalPdfs,
                        updatedAt: new Date(),
                    },
                    $setOnInsert: {
                        description: "new",
                        allocated: 0,
                        evaluated: 0,
                        unAllocated: 0,
                        evaluation_pending: 0,
                        createdAt: new Date(),
                    },
                },
                { upsert: true, new: true }
            );

            // Emit the updated data to clients
            io.emit("folder-update", updatedFolder);
        } catch (error) {
            console.error(`Error handling folder in database: ${error.message}`);
        }
    };
                

    // Function to handle folder removal from the database
    const removeFolderFromDatabase = async (folderName) => {
        try {
            await SubjectFolderModel.deleteOne({ folderName });
            io.emit("folder-remove", { folderName });
        } catch (error) {
            console.error(`Error removing folder ${folderName} from database: ${error.message}`);
        }
    };

    // Send the current state of folders to the frontend on connection
    io.on("connection", async (socket) => {
        try {
            const folders = await SubjectFolderModel.find();
            socket.emit("folder-list", folders);
        } catch (error) {
            console.error(`Error fetching folder list: ${error.message}`);
        }

        socket.on("disconnect", () => {
            console.log("A client disconnected:", socket.id);
        });
    });

    // Watch for database changes
    const dbWatcher = SubjectFolderModel.watch([], { fullDocument: "updateLookup" });
    dbWatcher.on("change", (change) => {
        switch (change.operationType) {
            case "insert":
                io.emit("folder-add", change.fullDocument);
                break;
            case "update":
                io.emit("folder-update", change.fullDocument);
                break;
            case "delete":
                io.emit("folder-remove", { folderName: change.documentKey.folderName });
                break;
            default:
                console.log("Unhandled change type:", change.operationType);
        }
    });

    // File watcher events
    watcher.on("add", async (filePath) => {
        const parsedPath = path.parse(filePath);
        const folderName = parsedPath.dir.split(path.sep).pop();
        const fileName = parsedPath.base;

        if (fileName.endsWith(".pdf") && folderName !== "scannedFolder") {
            const folderPath = path.join(scannedDataPath, folderName);

            // Update or create the folder in the database
            await updateOrCreateFolderInDatabase(folderName, folderPath);
        }
    });

    watcher.on("addDir", async (folderPath) => {
        const folderName = path.basename(folderPath);

        if (folderName !== "scannedFolder") {
            const folderFiles = fs.readdirSync(folderPath);
            const hasPdfFiles = folderFiles.some(file => file.endsWith(".pdf"));

            if (hasPdfFiles) {
                await updateOrCreateFolderInDatabase(folderName, folderPath);
            } else {
                console.log(`Folder ${folderName} contains no PDFs or only subfolders. Skipping database update.`);
            }
        }
    });

    watcher.on("unlink", async (filePath) => {
        const parsedPath = path.parse(filePath);
        const folderName = parsedPath.dir.split(path.sep).pop();
        const fileName = parsedPath.base;

        if (fileName.endsWith(".pdf") && folderName !== "scannedFolder") {
            const folderPath = path.join(scannedDataPath, folderName);
            await updateOrCreateFolderInDatabase(folderName, folderPath);
        }
    });

    watcher.on("unlinkDir", async (folderPath) => {
        const folderName = path.basename(folderPath);

        if (folderName !== "scannedFolder") {
            await removeFolderFromDatabase(folderName);
        }
    });

    watcher.on("ready", () => {
        console.log("Watcher is ready for changes.");
    });
};

export { subjectFolderWatcher };
