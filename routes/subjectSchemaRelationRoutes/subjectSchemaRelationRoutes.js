import express from 'express';
const router = express.Router();

import {
    createSubjectSchemaRelation,
    getSubjectSchemaRelationById,
    deleteSubjectSchemaRelationById,
    updateSubjectSchemaRelation,
    getAllSubjectSchemaRelationBySubjectId,
    getAllSubjectSchemaRelationBySchemaId,
    getAllSubjectSchemaRelationBySchemaIdAndSubjectId,
    getAllSubjectSchemaRelationBySubjectIdCoordinateStatusTrue,
    getAllCoordinatesAndSchemaRelationDetails
} from "../../controllers/subjectSchemaRelation/subjectSchemaRelation.js"



import uploadMiddleware from '../../controllers/subjectSchemaRelation/uploadingPdf.js';
import authMiddleware from "../../Middlewares/authMiddleware.js";

router.post('/createsubjectschemarel', authMiddleware, uploadMiddleware, createSubjectSchemaRelation);
router.put('/updatesubjectbyid/:id', authMiddleware, uploadMiddleware, updateSubjectSchemaRelation);
router.delete('/deletesubjectbyid/:id', authMiddleware, deleteSubjectSchemaRelationById);
router.get('/getsubjectbyid/:id', getSubjectSchemaRelationById);
router.get('/getallsubjectschemarelationstatustrue/:subjectId', authMiddleware, getAllSubjectSchemaRelationBySubjectIdCoordinateStatusTrue);
router.get('/getallcoordinatesandschemarelationdetails', getAllCoordinatesAndSchemaRelationDetails);
router.get('/getallsubjectbyid/:subjectId', authMiddleware, getAllSubjectSchemaRelationBySubjectId);
router.get('/getallschemabyid/:schemaId', authMiddleware, getAllSubjectSchemaRelationBySchemaId);
router.get('/getallschemabyidandsubjectid/:schemaId/:subjectId', authMiddleware, getAllSubjectSchemaRelationBySchemaIdAndSubjectId);

export default router;
