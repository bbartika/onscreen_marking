import Otp from "../../models/authModels/otp.js";
import User from "../../models/authModels/User.js";
import bcrypt from "bcryptjs";
import sendOtpEmail from "../../services/otpService.js";
import jwt from "jsonwebtoken";
import { isValidObjectId } from "../../services/mongoIdValidation.js";
import UserLoginLog from "../../models/authModels/UserLoginLog.js";

import crypto from "crypto";
import redisClient from "../../services/redisClient.js";
import convertJSONToCSV from "../../services/jsonToCsv.js";
import sendEmail from "../../utils/sendEmail.js";
import { saveOtp, getOtp, deleteOtp } from "../../utils/otpStore.js";
import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                           USER CREATION                                    */
/* -------------------------------------------------------------------------- */

const createUser = async (req, res) => {
  const {
    name,
    email,
    password,
    mobile,
    role,
    permissions,
    subjectCode,
    maxBooklets,
  } = req.body;

  if (!name || !email || !password || !mobile || !role || !permissions) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  if (role === "evaluator") {
    if (!subjectCode || !maxBooklets) {
      return res.status(400).json({
        message:
          "Subject code and max booklets are required for evaluator role",
      });
    }
  }

  const session = await mongoose.startSession();

  const hashedPassword = await bcrypt.hash(password, 10);
  // const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); 

  if (password) {
    await sendEmail(
      email,
      `The password you created for the Onscreen Marking site is "${password}". Please keep it confidential.`
    );
  }

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
      maxBooklets,
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
    res
      .status(500)
      .json({ message: "Failed to send OTP", error: error.message });
  } finally {
    session.endSession();
  }
};

/* -------------------------------------------------------------------------- */
/*                           USER LOGIN                                       */
/* -------------------------------------------------------------------------- */

// const userLogin = async (req, res) => {
//   const { email, password, type } = req.body;

//   if (!email) {
//     return res.status(400).json({ message: "Email is required" });
//   }

//   if (!password) {
//     return res.status(400).json({ message: "Password is required" });
//   }

//   try {
//     if (password && type === "password") {
//       const user = await User.findOne({ email });

//       if (!user) {
//         return res
//           .status(401)
//           .json({ message: "User not found. Please sign up first." });
//       }

//       const isPasswordValid = await bcrypt.compare(password, user.password);

//       if (!isPasswordValid) {
//         return res.status(401).json({ message: "Invalid email or password" });
//       }



//       const token = jwt.sign(
//         { userId: user._id, email: user.email, role: user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: "72h" }
//       );

//       res
//         .status(200)
//         .json({ message: "Login successful", token: token, userId: user._id });
//     } else if (type === "otp") {
//       const user = await User.findOne({ email });

//       if (!user) {
//         return res
//           .status(404)
//           .json({ message: "User not found. Please sign up first." });
//       }

//       const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

//       await sendOtpEmail(email, otpCode);

//       await Otp.create({
//         user: user._id,
//         otp: otpCode,
//         expiresAt: Date.now() + 10 * 60 * 1000,
//         otpAttempts: 0,
//       });

//       res
//         .status(200)
//         .json({ message: "OTP sent to your email.", userId: user._id });
//     }
//   } catch (error) {
//     console.error("Error during login:", error);
//     res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };

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

      // Check if auto-logout is enabled for this login 
      const enableAutoLogout = req.body.enableAutoLogout === true || req.body.enableAutoLogout === "true";
      const tokenExpiry = enableAutoLogout ? "5m" : "72h";

      // 🔐 create unique session id (per device login)
      const sessionId = crypto.randomUUID();

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, sessionId },
        process.env.JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      // 🔒 FORCE LOGOUT ANY EXISTING ACTIVE SESSION (SERVER SIDE)
      await UserLoginLog.updateMany(
        {
          userId: user._id,
          status: 1 
        },
        {
          $set: {
            status: 0,
            logoutAt: new Date(),
            logoutReason: "Logged in from another device"
          }
        }
      );

      //Tracking User Login Logs
      await UserLoginLog.create({
        userId: user._id,
        sessionId,
        loginAt: new Date(),
        status: 1,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      });

      await redisClient.set(`user:session:${user._id}`, sessionId);

      const response = {
        message: "Login successful",
        token: token,
        userId: user._id,
        autoLogoutEnabled: enableAutoLogout
      };

      if (enableAutoLogout) {
        // Create session in Redis with 5 minute expiry
        await redisClient.setEx(`session:${user._id}`, 300, JSON.stringify({
          userId: user._id,
          lastActivity: Date.now()
        }));
      }

      // 🔥 MARK USER ONLINE
      await redisClient.setEx(`online:user:${user._id}`, 600, JSON.stringify({
        userId: user._id,
        lastSeen: Date.now()
      })
      );
      await redisClient.sAdd("online:users", String(user._id));

      res.status(200).json(response);
    } else if (type === 'otp') {
      const user = await User.findOne({ email });

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found. Please sign up first." });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      await sendOtpEmail(email, otpCode);

      await Otp.create({
        user: user._id,
        otp: otpCode,
        expiresAt: Date.now() + 10 * 60 * 1000,
        otpAttempts: 0
      });

      // 🔥 MARK USER ONLINE
      await redisClient.setEx(`online:user:${user._id}`, 600, JSON.stringify({
        userId: user._id,
        lastSeen: Date.now()
      })
      );
      await redisClient.sAdd("online:users", String(user._id));

      res
        .status(200)
        .json({ message: "OTP sent to your email.", userId: user._id });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};


/* -------------------------------------------------------------------------- */
/*                           OTP VERIFICATION                                 */
/* -------------------------------------------------------------------------- */

// const verifyOtp = async (req, res) => {
//   const { userId, otp } = req.body;

//   if (!userId || !otp) {
//     return res.status(400).json({ message: "User ID and OTP are required" });
//   }

//   try {
//     if (!isValidObjectId(userId)) {
//       return res.status(400).json({ message: "Invalid user ID." });
//     }

//     const otpRecord = await Otp.findOne({ user: userId, otp });

//     if (!otpRecord) {
//       // Validate user ID
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     if (otpRecord.expiresAt < Date.now()) {
//       await Otp.deleteOne({ user: userId, otp });
//       // Find OTP record for the user
//       await User.deleteOne({ _id: userId });
//       return res
//         .status(400)
//         .json({ message: "OTP has expired. User account deleted." });
//     }

//     if (otpRecord.attempts >= 3) {
//       await Otp.deleteOne({ user: userId, otp });
//       // Check if OTP has expired
//       await User.deleteOne({ _id: userId });
//       return res
//         .status(400)
//         .json({ message: "Maximum attempts exceeded. User account deleted." });
//     }

//     if (otpRecord.otp === otp) {
//       await Otp.deleteOne({ user: userId, otp });
//       // Check if maximum attempts have been exceeded
//       const user = await User.findById(userId);
//       const token = jwt.sign(
//         { userId: user._id, email: user.email, role: user.role },
//         // Validate OTP
//         process.env.JWT_SECRET,
//         { expiresIn: "24h" }
//       );

//       res
//         .status(200)
//         .json({ message: "OTP verified successfully", token, user: user._id });
//     } else {
//       otpRecord.attempts += 1;
//       await otpRecord.save();
//       res.status(400).json({ message: "Invalid OTP" });
//       // Increment attempts if OTP is invalid
//     }
//   } catch (error) {
//     console.error("Error during OTP verification:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to verify OTP", error: error.message });
//   }
// };

/* -------------------------------------------------------------------------- */
/*                           FORGOT PASSWORD                                  */
/* -------------------------------------------------------------------------- */

// const forgotPassword = async (req, res) => {
//   const { userId, newPassword } = req.body;

//   try {
//     if (!isValidObjectId(userId)) {
//       return res.status(400).json({ message: "Invalid user ID." });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(newPassword, salt);
//     user.password = hashedPassword;
//     await user.save();
//     res.status(200).json({ message: "Password reset successful" });
//   } catch (error) {
//     console.error("Error during password reset:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to reset password", error: error.message });
//   }
// };

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
    res
      .status(500)
      .json({ message: "Failed to delete user", error: error.message });
  }
};

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
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/*                           GET ALL USERS                                    */
/* -------------------------------------------------------------------------- */

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().lean();

    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const activeLog = await UserLoginLog.findOne({
          userId: user._id,
          status: 1
        }).select("_id");

        return {
          ...user,
          status: activeLog ? 1 : 0
        };
      })
    );

    res.status(200).json(usersWithStatus);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                           UPDATE USER DETAILS                              */
/* -------------------------------------------------------------------------- */

const updateUserDetails = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    mobile,
    role,
    permissions,
    subjectCode,
    maxBooklets,
    changepassword,
  } = req.body;

  try {
    // Validate the user ID format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    // Check if required fields are provided
    if (!name || !mobile || !role || !permissions) {
      return res
        .status(400)
        .json({ message: "Name, mobile, role, and permissions are required" });
    }

    // If the role is 'evaluator', check if additional fields are provided
    if (role === "evaluator") {
      if (!subjectCode || !maxBooklets) {
        return res.status(400).json({
          message:
            "Subject code and max booklets are required for evaluator role",
        });
      }
    }

    // Construct an update object, only including the fields that are provided
    const updateData = {};

    const hashedPassword = await bcrypt.hash(changepassword, 10);

    // Add fields to the updateData object if they are provided in the request body
    if (name) updateData.name = name;
    if (mobile) updateData.mobile = mobile;
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;
    if (subjectCode) updateData.subjectCode = subjectCode; // This is an array field
    if (maxBooklets) updateData.maxBooklets = maxBooklets;
    if (changepassword) updateData.password = hashedPassword;

    // Update the user in the database
    const user = await User.findByIdAndUpdate(id, updateData, { new: true });

    // If no user is found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const email = user.email;

    if (changepassword) {
      await sendEmail(email, changepassword);
    }

    // Return success message
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user details:", error);
    res
      .status(500)
      .json({ message: "Failed to update user details", error: error.message });
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
      const {
        name,
        email,
        password,
        mobile,
        role,
        subjectCode,
        maxBooklets,
        permissions,
        ...otherFields
      } = user;

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
          failedUsers.push({
            email,
            message:
              "Subject code and max booklets are required for evaluator role",
          });
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
        ...otherFields,
      });

      try {
        await newUser.save();
        successCount++;
      } catch (saveError) {
        failedUsers.push({
          email,
          reason: `Failed to save user: ${saveError.message}`,
        });
      }
    }

    if (failedUsers.length > 0) {
      return res.status(207).json({
        message: `Some users were not created successfully`,
        successCount,
        failedUsers,
      });
    }

    return res
      .status(200)
      .json({ message: "All users created successfully", successCount });
  } catch (error) {
    console.error("Error creating users:", error);
    return res
      .status(500)
      .json({ message: "Failed to create users", error: error.message });
  }
};

const OTP_TTL = 5 * 60 * 1000; // 5 minutes

const otpSend = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // security-friendly response (optional)
      return res.json({ message: "OTP sent successfully" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const hashedOtp = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    // user.resetOtp = hashedOtp;
    // user.resetOtpExpires = Date.now() + 5 * 60 * 1000;
    // await user.save();

    saveOtp(email, hashedOtp, OTP_TTL);

    await sendEmail(email, `Your OTP is ${otp}. It will expire in 5 minutes.`);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("OTP Send Error:", error.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

const otpVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const storedOtp = getOtp(email);

    // OTP not found or expired
    if (!storedOtp) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    // Check expiry
    if (storedOtp.expiresAt < Date.now()) {
      deleteOtp(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    // Hash received OTP
    const otpHash = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    // Compare hashes
    if (otpHash !== storedOtp.otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP verified → delete immediately
    deleteOtp(email);

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Verify OTP Error:", error.message);
    res.status(500).json({ message: "OTP verification failed" });
  }
};

const passwordReset = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    console.log("user is saved");

    // 🔐 close the door

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    res.status(500).json({ message: "Password reset failed" });
  }
};

/* -------------------------------------------------------------------------- */
/*                           AUTO LOGOUT MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

const checkIdleTimeout = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Check if session exists in Redis
    const session = await redisClient.get(`session:${userId}`);

    if (!session) {
      return res.status(401).json({
        message: "Session expired due to 5 minute inactivity",
        autoLogout: true
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update session activity - extend for another 5 minutes
    // // 300 seconds = 5 minutes
    await redisClient.setEx(`session:${userId}`, 300, JSON.stringify({
      userId: userId,
      lastActivity: Date.now()
    }));

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
      autoLogout: true
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                         LOGOUT BROWSER/TAB CLOSED USER                     */
/* -------------------------------------------------------------------------- */

const autoLogout = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(204).end();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId;
    const sessionId = decoded.sessionId;

    // 🔥 Update DB immediately
    await UserLoginLog.updateMany(
      {
        userId,
        sessionId,
        status: 1
      },
      {
        status: 0,
        logoutAt: new Date(),
        logoutReason: "Browser closed"
      }
    );

    // Cleanup Redis
    await redisClient.del(`online:user:${userId}`);
    await redisClient.sRem("online:users", String(userId));

    return res.status(204).end();
  } catch (err) {
    // Never block tab close
    return res.status(204).end();
  }
};

/* -------------------------------------------------------------------------- */
/*                           REMOVE OFFLINE USERS                             */
/* -------------------------------------------------------------------------- */

const getOnlineUsers = async (req, res) => {
  try {
    const userIds = await redisClient.sMembers("online:users");

    const onlineUsers = [];

    for (const userId of userIds) {

      // 🔐 STEP 1: CHECK DB SOURCE OF TRUTH
      const log = await UserLoginLog.findOne({
        userId,
        status: 1
      });

      // ❌ If DB says user is offline → clean Redis
      if (!log) {
        await redisClient.sRem("online:users", userId);
        await redisClient.del(`online:user:${userId}`);
        continue; // ⛔ skip this user
      }

      const isAlive = await redisClient.ttl(`online:user:${userId}`);

      if (isAlive > 0) {
        const user = await User.findById(userId).select("_id name email role");
        if (user) {
          onlineUsers.push({
            ...user.toObject(),
            status: 1
          });
        }
      } else {
        // 🔥 TTL expired → browser/tab/system closed
        await UserLoginLog.updateMany(
          {
            userId,
            status: 1
          },
          {
            status: 0,
            logoutAt: new Date(),
            logoutReason: "Session timeout / browser closed"
          }
        );
      
        // 2️⃣ Cleanup Redis
        await redisClient.sRem("online:users", userId);
        await redisClient.del(`online:user:${userId}`);
      }     
    }

    res.status(200).json({
      count: onlineUsers.length,
      users: onlineUsers,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch online users" });
  }
};

/* -------------------------------------------------------------------------- */
/*                           USER LOGIN LOGS TO CSV                            /
/* -------------------------------------------------------------------------- */

const downloadUserLogsCsv = async (req, res) => {
  try {
    const logs = await UserLoginLog.find()
      .populate("userId", "name email role")
      .sort({ loginAt: -1 })
      .lean();

    if (!logs || logs.length === 0) {
      return res.status(404).json({ message: "No logs found" });
    }

    const formatToIST = (date) => {
      if (!date) return "";
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    };

    const formattedLogs = logs.map(log => ({
      Name: log.userId?.name || "",
      Email: log.userId?.email || "",
      Role: log.userId?.role || "",
      SessionId: log.sessionId,
      LoginAt: formatToIST(log.loginAt),
      LogoutAt: formatToIST(log.logoutAt),
      LogoutReason: log.logoutReason || "",
      IP: log.ip || "",
      UserAgent: log.userAgent || ""
    }));

    const csv = convertJSONToCSV(formattedLogs);

    if (!csv) {
      return res.status(500).json({ message: "CSV conversion failed" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="user-login-logs.csv"'
    );

    res.status(200).send(csv);
  } catch (error) {
    console.error("Download CSV Error:", error);
    res.status(500).json({ message: "Failed to download user logs" });
  }
};

/* -------------------------------------------------------------------------- */
/*                           USER LOGOUT                             */
/* -------------------------------------------------------------------------- */

const userLogout = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessionId = req.user.sessionId;

    // Mark logout in DB
    await UserLoginLog.findOneAndUpdate(
      {
        userId,
        sessionId,
        logoutAt: null
      },
      {
        logoutAt: new Date(),
        logoutReason: "Manual logout",
        status: 0
      }
    );

    // Remove redis session (single-device)
    await redisClient.del(`user:session:${userId}`);

    // Remove online status
    await redisClient.del(`online:user:${userId}`);
    await redisClient.sRem("online:users", String(userId));

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
};


export {
  createUser,
  userLogin,
  userLogout,
  autoLogout,
  // verifyOtp,
  // forgotPassword,
  removeUser,
  getOnlineUsers,
  getUserById,
  getAllUsers,
  updateUserDetails,
  otpSend,
  otpVerify,
  passwordReset,
  createUsersByCsvFile,
  checkIdleTimeout,
  downloadUserLogsCsv
};
