import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import http from "http";
import database from "./utils/database.js";
import createInitialUser from "./services/initialUserCreation.js";


import authRoutes from "./routes/authRoutes/authRoutes.js";
import classRoutes from "./routes/classRoutes/classRoute.js";
import subjectRoutes from "./routes/subjectRoutes/subjectRoute.js";
import schemaRoutes from "./routes/schemeRoutes/schemaRoutes.js";
import questionDefinitionRoutes from "./routes/schemeRoutes/questionDefinitionRoutes.js";
import subjectQuestionRelationRoutes from "./routes/subjectSchemaRelationRoutes/subjectSchemaRelationRoutes.js";
import coordinateAllocation from "./routes/subjectSchemaRelationRoutes/coordinateAllocationRoutes.js";
import taskRoutes from "./routes/taskRoutes/taskRoutes.js";
// import syncfusionController from "./controllers/syncfusionController/sycnfusionController.js";
import answerPdfImageRoutes from './routes/evaluationRoutes/answerPdfImageRoutes.js';
import marksRoutes from './routes/evaluationRoutes/marksRoutes.js';
import iconRoutes from './routes/evaluationRoutes/iconRoutes.js';
import { subjectFolderWatcher } from "./controllers/studentControllers/subjectFolder.js";
import bookletProcessingRoutes from "./routes/bookletProcessingRoutes/bookletProcessingRoutes.js";
import resultGenerationRoutes from "./routes/resultGenerationRoutes/resultGenerationRoutes.js";
import analyticRoutes from "./routes/analyticRoutes/analyticRoutes.js";
import userRoutes from "./routes/userRoutes/userRoutes.js";

/* -------------------------------------------------------------------------- */
/*                           SERVER CONFIGURATION                             */
/* -------------------------------------------------------------------------- */


import handleAnnotationSocket from "./socket/annotationSocket.js";
import handleTimerSocket  from "./socket/handleTimer.js";
import handleAnalyticsSocket from "./socket/analyticSocket.js";
// For handling file uploads
const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "DELETE", "PUT"]
    }
});
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// Watcher setup for real-time updates
subjectFolderWatcher(io);


app.use('/uploadedPdfs', express.static(path.join(__dirname, 'uploadedPdfs')));
app.use('/processedFolder', express.static(path.join(__dirname, 'processedFolder')));


/* -------------------------------------------------------------------------- */
/*                           ROUTES ORIGIN                                    */
/* -------------------------------------------------------------------------- */

app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/schemas", schemaRoutes);
app.use("/api/schemas", questionDefinitionRoutes);
app.use("/api/subjects/relations", subjectQuestionRelationRoutes);
app.use("/api/coordinates", coordinateAllocation);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);





// app.use("/api/syncfusion", syncfusionController)
app.use("/api/evaluation/answerimages", answerPdfImageRoutes);
app.use("/api/evaluation/marks", marksRoutes);
app.use("/api/evaluation/icons", iconRoutes);
app.use('/api/bookletprocessing', bookletProcessingRoutes);
app.use('/api/resultgeneration', resultGenerationRoutes);
app.use('/api/analytic', analyticRoutes);


// Socket.IO Connection event
io.on('connection', (socket) => {
    console.log("A client connected");
    socket.on('disconnect', () => {
        console.log("A client disconnected");
    }); 
});

handleTimerSocket(io);
handleAnnotationSocket(io); 
handleAnalyticsSocket (io);




/* -------------------------------------------------------------------------- */
/*                           SERVER AND DATABASE SETUP                        */
/* -------------------------------------------------------------------------- */

server.listen(PORT, async () => {
    try {
        await database();
        await createInitialUser();
        console.log(`Server running on http://localhost:${PORT}`);
    } catch (error) {
        console.error("Error starting server:", error);
    }
});
