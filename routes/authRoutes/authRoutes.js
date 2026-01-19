import express from "express";
const router = express.Router();

import authMiddleware from "../../Middlewares/authMiddleware.js";
import {
    createUser,
    userLogin,
    userLogout,
    autoLogout,
    // verifyOtp,
    // forgotPassword,
    removeUser,
    getOnlineUsers,    
    downloadUserLogsCsv,
    getUserById,
    getAllUsers,
    updateUserDetails,
    createUsersByCsvFile,
    otpSend,
    otpVerify,
    passwordReset
} from "../../controllers/authControllers/authControllers.js";


router.post('/signup', authMiddleware, createUser);
router.post('/signin', userLogin);
router.post("/logout", authMiddleware, userLogout);
router.post("/auto-logout", autoLogout);
// router.post('/verify', verifyOtp);
router.post('/createuserbycsv', authMiddleware, createUsersByCsvFile);
router.get("/user-logs/download", authMiddleware, downloadUserLogsCsv);
router.get("/online/users", authMiddleware, getOnlineUsers);
router.post('/send-otp',  otpSend);
router.post('/verify-otp', otpVerify);
router.post('/reset-password', passwordReset);
// router.put('/forgotpassword', forgotPassword);
router.put('/update/:id', authMiddleware, updateUserDetails);
router.delete('/removeUser/:id', authMiddleware, removeUser);
router.get('/:id', authMiddleware, getUserById);
router.get('/', authMiddleware, getAllUsers);


export default router;
