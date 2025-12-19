import User from "../models/authModels/User.js";
import Task from "../models/taskModels/taskModel.js";
import Courses from "../models/classModel/classModel.js";
import Subject from "../models/classModel/subjectModel.js";
import Schema from "../models/schemeModel/schema.js";
import answerPdf from "../models/EvaluationModels/studentAnswerPdf.js";

import mongoose from "mongoose";


export default function handleAnalyticsSocket(io) {
  const ADMIN_ANALYTICS_ROOM = "admin-analytics";

  io.on("connection", (socket) => {
    console.log("🟢 Client connected for analytics:", socket.id);

    let adminInterval = null;
    let evaluatorInterval = null;

    // ===============================
    // ADMIN ANALYTICS
    // ===============================
    socket.on("join-analytics-room", async () => {
      socket.join(ADMIN_ANALYTICS_ROOM);
      console.log(`🟢 ${socket.id} joined ${ADMIN_ANALYTICS_ROOM}`);

      try {
        const analytics = await fetchAdminAnalytics();
        socket.emit("admin-analytics-data", analytics);
      } catch (err) {
        socket.emit("admin-analytics-error", {
          message: "Failed to fetch admin analytics",
        });
      }

      // 🔄 Auto refresh (30s)
      if (!adminInterval) {
        adminInterval = setInterval(async () => {
          try {
            const analytics = await fetchAdminAnalytics();
            io.to(ADMIN_ANALYTICS_ROOM).emit("admin-analytics-data", analytics);
          } catch (err) {
            console.error("❌ Admin auto-refresh error:", err);
          }
        }, 30000);
      }
    });

    socket.on("get-admin-analytics", async () => {
      try {
        const analytics = await fetchAdminAnalytics();
        io.to(ADMIN_ANALYTICS_ROOM).emit("admin-analytics-data", analytics);
      } catch (err) {
        socket.emit("admin-analytics-error", {
          message: "Failed to fetch admin analytics",
        });
      }
    });

    // ===============================
    // EVALUATOR ANALYTICS
    // ===============================
    socket.on("join-evaluatorAnalytics-room", async ({ userId }) => {

      console.log("userId in evaluator analytics socket:", userId);

      if (!userId) return;

      const room = `evaluator-analytics:${userId}`;
      socket.join(room);
      console.log(`🟢 ${socket.id} joined ${room}`);

      try {
        const analytics = await getEvaluatorAnalytics(userId);
        socket.emit("evaluator-analytics-data", analytics);
      } catch (err) {
        socket.emit("evaluator-analytics-error", {
          message: "Failed to fetch evaluator analytics",
        });
      }

      // 🔄 Auto refresh (30s)
      evaluatorInterval = setInterval(async () => {
        try {
          const analytics = await getEvaluatorAnalytics(userId);
          io.to(room).emit("evaluator-analytics-data", analytics);
        } catch (err) {
          console.error("❌ Evaluator auto-refresh error:", err);
        }
      }, 30000);
    });

    socket.on("get-evaluator-analytics", async ({ userId }) => {
      if (!userId) return;

      const room = `evaluator-analytics:${userId}`;
      try {
        const analytics = await getEvaluatorAnalytics(userId);
        io.to(room).emit("evaluator-analytics-data", analytics);
      } catch (err) {
        socket.emit("evaluator-analytics-error", {
          message: "Failed to fetch evaluator analytics",
        });
      }
    });

    // ===============================
    // CLEANUP
    // ===============================
    socket.on("disconnect", () => {
      if (adminInterval) clearInterval(adminInterval);
      if (evaluatorInterval) clearInterval(evaluatorInterval);
      console.log("🔴 Client disconnected:", socket.id);
    });
  });
}



// ===============================
// ANALYTICS CALCULATION
// ===============================
async function fetchAdminAnalytics() {

  const [
    totalUsers,
    totalEvaluators,
    totalAdmins,
    tasks,
    completedTasks,
    pendingTasks,
    courses,
    subjects,
    schemas,
    totalResultGenerated,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: "evaluator" }),
    User.countDocuments({ role: "admin" }),
    Task.countDocuments({}),
    Task.countDocuments({ status: "completed" }),
    Task.countDocuments({ status: "pending" }),
    Courses.countDocuments({}),
    Subject.countDocuments({}),
    Schema.countDocuments({}),
    answerPdf.countDocuments({ status: true }),
  ]);

  return {
    totalUsers,
    totalEvaluators,
    totalAdmins,
    tasks,
    completedTasks,
    pendingTasks,
    courses,
    subjects,
    schemas,
    totalResultGenerated,
  };
}

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

    return {
      evaluatedBooklets,
      pendingBooklets,
      completedTasks,
      pendingTasks,
    };

  } catch (error) {
    console.error("Evaluator analytics error:", error);
    // return res.status(500).json({ message: "Internal server error" });
  }
};