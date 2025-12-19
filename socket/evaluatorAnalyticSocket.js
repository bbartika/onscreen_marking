
import Task from "../models/taskModels/taskModel.js";


const EVALUATOR_ANALYTICS_ROOM = "evaluator-analytics";

export default function handleEvaluatorAnalyticsSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Client connected for analytics:", socket.id);

    // ===============================
    // JOIN EVALUATOR ANALYTICS ROOM
    // ===============================
    socket.on("join-evaluatorAnalytics-room", async ({userId}) => {

      if (!userId) {
        return;
      }
      socket.join(EVALUATOR_ANALYTICS_ROOM);
      console.log(`🟢 ${socket.id} joined ${EVALUATOR_ANALYTICS_ROOM}`);

      socket.emit("room-joined", { room: EVALUATOR_ANALYTICS_ROOM });

      // Send analytics immediately after join
      try {
        const analytics = await getEvaluatorAnalytics(userId);
        socket.emit("evaluator-analytics-data", analytics);
      } catch (err) {
        socket.emit("evaluator-analytics-error", {
          message: "Failed to fetch analytics",
        });
      }
    });

    // ===============================
    // MANUAL REFRESH FROM FRONTEND
    // ===============================
    socket.on("get-evaluator-analytics", async ({ userId }) => {
      try {
        const analytics = await getEvaluatorAnalytics(userId);
        io.to(EVALUATOR_ANALYTICS_ROOM).emit("evaluator-analytics-data", analytics);
      } catch (error) {
        console.error("❌ Analytics fetch error:", error);
        socket.emit("admin-analytics-error", {
          message: "Failed to fetch analytics",
        });
      }
    });

    // ===============================
    // AUTO REFRESH (EVERY 30 SECONDS)
    // ===============================
    const interval = setInterval(async () => {
      try {
        const analytics = await getEvaluatorAnalytics(userId);
        io.to(EVALUATOR_ANALYTICS_ROOM).emit("evaluator-analytics-data", analytics);
      } catch (err) {
        console.error("❌ Auto refresh error:", err);
      }
    }, 30000);

    socket.on("disconnect", () => {
      clearInterval(interval);
      console.log("🔴 Client disconnected:", socket.id);
    });
  });
}













import mongoose from "mongoose";


export async function getEvaluatorAnalytics(userId) {
  try {
    const evaluatorId = new mongoose.Types.ObjectId(userId);

    // =========================
    // EVALUATED BOOKLETS
    // =========================
    const evaluatedAgg = await Task.aggregate([
      { $match: { userId:evaluatorId } },
      {
        $lookup: {
          from: "answerpdfs",
          localField: "_id",
          foreignField: "taskId",
          as: "answerPdfs",
        },
      },
      { $unwind: "$answerPdfs" },
      { $match: { "answerPdfs.status": true } },
      { $count: "count" },
    ]);

    const evaluatedBooklets = evaluatedAgg[0]?.count || 0;

    // =========================
    // PENDING BOOKLETS
    // =========================
    const pendingAgg = await Task.aggregate([
      { $match: { userId : evaluatorId } },
      {
        $lookup: {
          from: "answerpdfs",
          localField: "_id",
          foreignField: "taskId",
          as: "answerPdfs",
        },
      },
      { $unwind: "$answerPdfs" },
      { $match: { "answerPdfs.status": false } },
      { $count: "count" },
    ]);

    const pendingBooklets = pendingAgg[0]?.count || 0;

    // =========================
    // TASK COUNTS
    // =========================
    const completedTasks = await Task.countDocuments({
      userId: evaluatorId,
      status: "success",
    });

    const pendingTasks = await Task.countDocuments({
      userId,
      status: { $in: ["active", "pending"] },
    });

    return res.status(200).json({
      evaluatedBooklets,
      pendingBooklets,
      completedTasks,
      pendingTasks,
    });

  } catch (error) {
    console.error("Evaluator analytics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};