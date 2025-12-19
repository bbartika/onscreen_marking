import express from "express";
const router = express.Router();

import {
    getUsersFormanualAssign
   
} from "../../controllers/taskControllers/taskControllers.js";



/* -------------------------------------------------------------------------- */
/*                           TASK ROUTES                                      */
/* -------------------------------------------------------------------------- */


router.get("/get/usersFormanualAssign/:subjectCode",getUsersFormanualAssign );


export default router;
