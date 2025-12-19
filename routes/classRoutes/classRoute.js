import express from "express";
const router = express.Router();

import authMiddleware from "../../Middlewares/authMiddleware.js";
import { createCourse, updateCourse, getAllCourses, getCourseById, removeCourse } from "../../controllers/classControllers/classController.js";

/* -------------------------------------------------------------------------- */
/*                           CLASS ROUTES                                     */
/* -------------------------------------------------------------------------- */

router.post("/create/class", createCourse);
router.put("/update/classes/:id", authMiddleware, updateCourse);
router.delete("/remove/class/:id", authMiddleware, removeCourse);
router.get("/get/class", authMiddleware, getAllCourses);
router.get("/getbyid/class/:id", authMiddleware, getCourseById);


export default router;
