import express from "express";
const router = express.Router();

import { createSchema, updateSchema, getAllSchemas,getSchemaById, removeSchema, getAllCompletedSchema, getSchemadetailsById, uploadSupplimentaryPdf, getcoordinateSupplimentarypdf, uploadAnswerPdf, getAnswerPdfImages, serveAnswerPdfImage } from "../../controllers/schemeControllers/schemaControllers.js";
import authMiddleware from "../../Middlewares/authMiddleware.js";

import uploadAnswerPdfMiddleware from "../../Middlewares/uploadAnswerPdfMiddleware.js";
import  uploadSupplimentaryPdfMiddleware  from "../../Middlewares/uploadSupplimentaryMiddleware.js";

/* -------------------------------------------------------------------------- */
/*                           SCHEMA ROUTES                                    */
/* -------------------------------------------------------------------------- */

router.post("/create/schema", authMiddleware, createSchema);
router.put("/update/schema/:id", authMiddleware, updateSchema);
router.delete("/remove/schema/:id", authMiddleware, removeSchema);
router.get("/get/schema/:id", authMiddleware, getSchemaById);
router.get("/getall/schema", getAllSchemas);
router.get("/getall/completed/schema", authMiddleware, getAllCompletedSchema);


router.post("/uploadAnswerPdf/:schemaId", authMiddleware, uploadAnswerPdfMiddleware, uploadAnswerPdf);
router.get("/get/answer-pdf-images/:schemaId/:imageName", serveAnswerPdfImage);
router.get("/getschemadetailsbyid/:id", getSchemadetailsById);
router.post("/uploadSupplimentarypdf/:schemaId", authMiddleware, uploadSupplimentaryPdfMiddleware, uploadSupplimentaryPdf);

router.post("/getcoordinates/:schemaId", getcoordinateSupplimentarypdf);


export default router;
