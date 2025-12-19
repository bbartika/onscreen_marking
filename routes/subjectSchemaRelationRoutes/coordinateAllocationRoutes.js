import express from "express";
const router = express.Router();

import {
    createCoordinateAllocation,
    updateCoordinateAllocation,
    deleteCoordinateAllocation,
    getCoordinateAllocationById,
    getCoordinateAllocationBySubjectSchemaRelationId,
    getCoordinateAllocationBySubjectIdStatusTrue
} from "../../controllers/subjectSchemaRelation/coordinateAllocation.js";
import authMiddleware from "../../Middlewares/authMiddleware.js";



/* -------------------------------------------------------------------------- */
/*                           COORDINATE ALLOCATION ROUTES                     */
/* -------------------------------------------------------------------------- */


router.post("/createcoordinateallocation", authMiddleware, createCoordinateAllocation);
router.put("/updatecoordinateallocation/:id", authMiddleware, updateCoordinateAllocation);
router.delete("/deletecoordinateallocation/:id", authMiddleware, deleteCoordinateAllocation);
router.get("/getcoordinateallocationbyid/:id", authMiddleware, getCoordinateAllocationById);
router.get("/getcoordinateallocationbysubjectidstatustrue/:courseSchemaRelationId", authMiddleware, getCoordinateAllocationBySubjectIdStatusTrue);
router.get("/getcoordinateallocationbyschemarelationid/:courseSchemaRelationId", authMiddleware, getCoordinateAllocationBySubjectSchemaRelationId);

export default router;
