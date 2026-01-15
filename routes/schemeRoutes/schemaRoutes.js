import express from "express";
const router = express.Router();

import { createSchema, updateSchema, getAllSchemas,getSchemaById, removeSchema, getAllCompletedSchema, getSchemadetailsById, uploadSupplimentaryPdf, getcoordinateSupplimentarypdf } from "../../controllers/schemeControllers/schemaControllers.js";
import authMiddleware from "../../Middlewares/authMiddleware.js";


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



router.get("/getschemadetailsbyid/:id", getSchemadetailsById);
router.post("/uploadSupplimentarypdf/:schemaId", authMiddleware, uploadSupplimentaryPdfMiddleware, uploadSupplimentaryPdf);

router.get("/getcoordinates/:schemaId", getcoordinateSupplimentarypdf);


export default router;
