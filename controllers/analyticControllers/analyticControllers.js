
import User from "../../models/authModels/User.js";
import Task from "../../models/taskModels/taskModel.js";
import CourseSchemaRelation from "../../models/subjectSchemaRelationModel/subjectSchemaRelationModel.js";
import Courses from "../../models/classModel/classModel.js";
import Subject from "../../models/classModel/subjectModel.js";
import Schema from "../../models/schemeModel/schema.js";
import answerPdf from "../../models/EvaluationModels/studentAnswerPdf.js";

const getAdminAnalytics = async (req, res) => {

    const totalUsers = await User.countDocuments({});
    const totalEvaluators = await User.countDocuments({ role: 'evaluator' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    const tasks = await Task.countDocuments({});
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });

    const courses = await Courses.countDocuments({});

    const subjects = await Subject.countDocuments({});

    const schemas = await Schema.countDocuments({});

    const totalResultGenerated = await answerPdf.countDocuments({status: true});

    return res.status(200).json({
        totalUsers,
        totalEvaluators,    
        totalAdmins,
        tasks,
        completedTasks,
        pendingTasks,
        courses,
        subjects,
        schemas,
        totalResultGenerated
    });

    
 }

import mongoose from "mongoose";


const getEvaluatorAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    // =========================
    // EVALUATED BOOKLETS
    // =========================
    const evaluatedAgg = await Task.aggregate([
      { $match: { userId } },
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
      { $match: { userId } },
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
      userId,
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
 


export { getAdminAnalytics, getEvaluatorAnalytics }