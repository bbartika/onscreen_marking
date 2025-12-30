import redisClient, { connectRedis } from "../services/redisClient.js";
import Subject from "../models/classModel/subjectModel.js";
import Task from "../models/taskModels/taskModel.js";
import Schema from "../models/schemeModel/schema.js";
import SubjectSchemaRelation from "../models/subjectSchemaRelationModel/subjectSchemaRelationModel.js";

// Redis key structure: timer:{taskId}:{answerPdfId}
const getTimerKey = (taskId, answerPdfId) => `timer:${taskId}:${answerPdfId}`;

export default function handleTimerSocket(io) {
  // Initialize Redis connection when socket server starts
  connectRedis()
    .then(() => {
      console.log("✅ Redis ready for socket operations");
    })
    .catch((err) => {
      console.error("❌ Redis connection failed:", err.message);
    });

  io.on("connection", (socket) => {
    console.log("🔌 Client connected: ", socket.id);

    socket.on("join-timerRoom", ({ taskId }) => {
      const roomName = `task_${taskId}`;
      socket.join(roomName);
      console.log(`🟢 Client ${socket.id} joined room: ${roomName}`);
      socket.emit("room-joined", { taskId, room: roomName });
    });

    socket.on("start-evaluation", async (data) => {
      try {
        const { taskId, answerPdfId } = data;
        console.log("data of start-evaluation", data);
        const timerKey = getTimerKey(taskId, answerPdfId);
        console.log("timerKey", timerKey);

        // Ensure Redis is connected
        await connectRedis();

        const task = await Task.findById(taskId);
        if (!task) {
          throw new Error("Task not found");
        }

        const subject = await Subject.findOne({ code: task.subjectCode });
        if (!subject) {
          throw new Error("Subject not found (create subject).");
        }

        const courseSchemaRel = await SubjectSchemaRelation.findOne({
          subjectId: subject._id,
        });
        if (!courseSchemaRel) {
          throw new Error(
            "Schema not found for subject (upload master answer and master question)."
          );
        }

        const schemaDetails = await Schema.findById(courseSchemaRel.schemaId);
        if (!schemaDetails) {
          throw new Error("Schema not found.");
        }

        const minTime = schemaDetails.minTime; // in seconds
        const maxTime = schemaDetails.maxTime; // in seconds

        // Check if timer exists in Redis
        const existingTimer = await redisClient.get(timerKey);
        console.log("existingTimer", existingTimer);

        if (!existingTimer) {
          // Create new timer in Redis
          const timerData = {
            taskId,
            answerPdfId,
            totalTime: maxTime,
            remainingTime: maxTime,

            startTime: Date.now(),
            lastUpdated: Date.now(),
          };

          await redisClient.set(timerKey, JSON.stringify(timerData));
          console.log(`⏰ Timer created in Redis: ${timerKey}`);
        }

        // Get current timer state (always fetch from Redis)
        const timer = JSON.parse(await redisClient.get(timerKey));
        console.log("timer", timer);

        // Update remaining time if running
        const now = Date.now();
        // const elapsed = Math.floor((now - timer.lastUpdated) / 1000);
        // timer.remainingTime = Math.max(0, timer.remainingTime - elapsed);
        timer.lastUpdated = now;

        // Save updated time back to Redis
        await redisClient.set(timerKey, JSON.stringify(timer));

        console.log(
          "timer update, remaining time, total time",
          taskId,
          answerPdfId,
          timer.remainingTime,
          
          timer.totalTime
        );

        socket.emit("start-timer-update", {
          taskId,
          answerPdfId,
          remainingTime: timer.remainingTime,
          
          totalTime: timer.totalTime,
        });
      } catch (error) {
        console.error("Error starting evaluation:", error);
        socket.emit("timer-error", { message: error.message });
      }
    });

    socket.on("timer-update", async (data) => {
      try {
        const { taskId, answerPdfId, remainingTime } = data;
        console.log("🕒 Received timer update from frontend:", {
          taskId,
          answerPdfId,
          remainingTime,
        });

        // Ensure Redis is connected
        await connectRedis();

        const timerKey = getTimerKey(taskId, answerPdfId);

        // Get current timer state from Redis
        const existingTimer = await redisClient.get(timerKey);

        if (existingTimer) {
          const timer = JSON.parse(existingTimer);

          // Update only the remaining time and timestamp
          timer.remainingTime = Math.max(0, remainingTime);
          timer.lastUpdated = Date.now();

          // Save back to Redis
          await redisClient.set(timerKey, JSON.stringify(timer));

          console.log("✅ Timer updated in Redis:", {
            taskId,
            answerPdfId,
            remainingTime: timer.remainingTime,
          });

          // Optional: Send acknowledgment back to frontend
          socket.emit("timer-update-ack", {
            taskId,
            answerPdfId,
            success: true,
            remainingTime: timer.remainingTime,
          });
        } else {
          console.warn("⚠️ Timer not found in Redis for update:", timerKey);
          // socket.emit("timer-update-ack", {
          //   taskId,
          //   answerPdfId,
          //   success: false,
          //   error: "Timer not found",
          // });
        }
      } catch (error) {
        console.error("Error updating timer:", error);
        socket.emit("timer-error", {
          message: error.message,
          type: "timer-update-error",
        });
      }
    });

    

    socket.on("leave-room", ({ taskId }) => {
      const roomName = `task_${taskId}`;
      socket.leave(roomName);
      console.log(`🔴 Client ${socket.id} left room: ${roomName}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Client disconnected:", socket.id, "Reason:", reason);
    });
  });
}
