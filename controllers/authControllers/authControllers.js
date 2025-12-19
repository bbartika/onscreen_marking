import Otp from '../../models/authModels/otp.js';
import User from '../../models/authModels/User.js';
import bcrypt from 'bcryptjs';
import sendOtpEmail from '../../services/otpService.js';
import jwt from "jsonwebtoken";
import { isValidObjectId } from '../../services/mongoIdValidation.js';
import mongoose from 'mongoose';

/* -------------------------------------------------------------------------- */
/*                           USER CREATION                                    */
/* -------------------------------------------------------------------------- */

const createUser = async (req, res) => {
    const { name, email, password, mobile, role, permissions, subjectCode, maxBooklets } = req.body;

    if (!name || !email || !password || !mobile || !role || !permissions) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
    }

    if (role === "evaluator") {
        if (!subjectCode || !maxBooklets) {
            return res.status(400).json({ message: "Subject code and max booklets are required for evaluator role" });
        }
    }

    const session = await mongoose.startSession();

    const hashedPassword = await bcrypt.hash(password, 10);
    // const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        session.startTransaction();

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            mobile,
            role,
            permissions,
            subjectCode,
            maxBooklets
        });
        await newUser.save();

        // await sendOtpEmail(email, otpCode);

        // await Otp.create({
        //     user: newUser._id,
        //     otp: otpCode,
        //     expiresAt: Date.now() + 10 * 60 * 1000
        // });

        await session.commitTransaction();
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error during user creation:", error);
        res.status(500).json({ message: "Failed to send OTP", error: error.message });
    }
    finally {
        session.endSession();
    }
};

/* -------------------------------------------------------------------------- */
/*                           USER LOGIN                                       */
/* -------------------------------------------------------------------------- */

const userLogin = async (req, res) => {
    const { email, password, type } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }

    try {
        if (password && type === 'password') {
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(401).json({ message: "User not found. Please sign up first." });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            const token = jwt.sign(
                { userId: user._id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "72h" }
            );

            res.status(200).json({ message: "Login successful", token: token, userId: user._id });
        } else if (type === 'otp') {
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({ message: "User not found. Please sign up first." });
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

            await sendOtpEmail(email, otpCode);

            await Otp.create({
                user: user._id,
                otp: otpCode,
                expiresAt: Date.now() + 10 * 60 * 1000,
                otpAttempts: 0
            });

            res.status(200).json({ message: "OTP sent to your email.", userId: user._id });
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                           OTP VERIFICATION                                 */
/* -------------------------------------------------------------------------- */

const verifyOtp = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.status(400).json({ message: "User ID and OTP are required" });
    }

    try {

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        const otpRecord = await Otp.findOne({ user: userId, otp });

        if (!otpRecord) {
            // Validate user ID
            return res.status(400).json({ message: "Invalid OTP" });
        }

        if (otpRecord.expiresAt < Date.now()) {
            await Otp.deleteOne({ user: userId, otp });
            // Find OTP record for the user
            await User.deleteOne({ _id: userId });
            return res.status(400).json({ message: "OTP has expired. User account deleted." });
        }

        if (otpRecord.attempts >= 3) {
            await Otp.deleteOne({ user: userId, otp });
            // Check if OTP has expired
            await User.deleteOne({ _id: userId });
            return res.status(400).json({ message: "Maximum attempts exceeded. User account deleted." });
        }

        if (otpRecord.otp === otp) {
            await Otp.deleteOne({ user: userId, otp });
            // Check if maximum attempts have been exceeded
            const user = await User.findById(userId);
            const token = jwt.sign(
                { userId: user._id, email: user.email, role: user.role },
                // Validate OTP
                process.env.JWT_SECRET,
                { expiresIn: "24h" }
            );

            res.status(200).json({ message: "OTP verified successfully", token, user: user._id });
        } else {
            otpRecord.attempts += 1;
            await otpRecord.save();
            res.status(400).json({ message: "Invalid OTP" });
            // Increment attempts if OTP is invalid
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        res.status(500).json({ message: "Failed to verify OTP", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                           FORGOT PASSWORD                                  */
/* -------------------------------------------------------------------------- */

const forgotPassword = async (req, res) => {
    const { userId, newPassword } = req.body;

    try {

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Error during password reset:", error);
        res.status(500).json({ message: "Failed to reset password", error: error.message });
    }
}

/* -------------------------------------------------------------------------- */
/*                           REMOVE USER BY ID                                */
/* -------------------------------------------------------------------------- */

const removeUser = async (req, res) => {
    const { id } = req.params;

    try {

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await User.deleteOne({ _id: id });
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error during user deletion:", error);
        res.status(500).json({ message: "Failed to delete user", error: error.message });
    }
}

/* -------------------------------------------------------------------------- */
/*                           GET USER DETAILS BY ID                           */
/* -------------------------------------------------------------------------- */

const getUserById = async (req, res) => {
    const { id } = req.params;
    try {

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        const user = await User.findById(id);
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users", error: error.message });
    }
}

/* -------------------------------------------------------------------------- */
/*                           GET ALL USERS                                    */
/* -------------------------------------------------------------------------- */

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        if (!users || users.length === 0) {
            return res.status(200).json({ message: "No users found", users: [] });
        }
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                           UPDATE USER DETAILS                              */
/* -------------------------------------------------------------------------- */

const updateUserDetails = async (req, res) => {
    const { id } = req.params;
    const { name, mobile, role, permissions, subjectCode, maxBooklets } = req.body;

    try {
        // Validate the user ID format
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }

        // Check if required fields are provided
        if (!name || !mobile || !role || !permissions) {
            return res.status(400).json({ message: "Name, mobile, role, and permissions are required" });
        }

        // If the role is 'evaluator', check if additional fields are provided
        if (role === "evaluator") {
            if (!subjectCode || !maxBooklets) {
                return res.status(400).json({ message: "Subject code and max booklets are required for evaluator role" });
            }
        }

        // Construct an update object, only including the fields that are provided
        const updateData = {};

        // Add fields to the updateData object if they are provided in the request body
        if (name) updateData.name = name;
        if (mobile) updateData.mobile = mobile;
        if (role) updateData.role = role;
        if (permissions) updateData.permissions = permissions;
        if (subjectCode) updateData.subjectCode = subjectCode;  // This is an array field
        if (maxBooklets) updateData.maxBooklets = maxBooklets;

        // Update the user in the database
        const user = await User.findByIdAndUpdate(id, updateData, { new: true });

        // If no user is found
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return success message
        res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
        console.error("Error updating user details:", error);
        res.status(500).json({ message: "Failed to update user details", error: error.message });
    }
};


/* -------------------------------------------------------------------------- */
/*                           CREATE USERS BY CSV UPLOAD                       */
/* -------------------------------------------------------------------------- */
const createUsersByCsvFile = async (req, res) => {
    try {
        const users = req.body;

        if (!users || users.length === 0) {
            return res.status(400).json({ message: "No users found in the file." });
        }

        let successCount = 0;
        let failedUsers = [];

        for (const user of users) {
            const { name, email, password, mobile, role, subjectCode, maxBooklets, permissions, ...otherFields } = user;

            // Validate required fields
            if (!name || !email || !password || !mobile || !role || !permissions) {
                failedUsers.push({ email, reason: "Missing required fields" });
                continue; // Skip this user if required fields are missing
            }

            // Check if the email already exists in the database
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                failedUsers.push({ email, reason: "Email already exists" });
                continue; // Skip the user if email already exists
            }

            if (role === "evaluator") {
                if (!subjectCode || !maxBooklets) {
                    failedUsers.push({ email, message: "Subject code and max booklets are required for evaluator role" });
                }
            }

            // Encrypt the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create a new user with encrypted password and other required fields
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                mobile,
                role,
                subjectCode,
                maxBooklets,
                permissions,
                ...otherFields
            });

            try {
                await newUser.save();
                successCount++;
            } catch (saveError) {
                failedUsers.push({ email, reason: `Failed to save user: ${saveError.message}` });
            }
        }

        if (failedUsers.length > 0) {
            return res.status(207).json({
                message: `Some users were not created successfully`,
                successCount,
                failedUsers
            });
        }

        return res.status(200).json({ message: "All users created successfully", successCount });

    } catch (error) {
        console.error("Error creating users:", error);
        return res.status(500).json({ message: "Failed to create users", error: error.message });
    }
};

export {
    createUser,
    userLogin,
    verifyOtp,
    forgotPassword,
    removeUser,
    getUserById,
    getAllUsers,
    updateUserDetails,
    createUsersByCsvFile
};

