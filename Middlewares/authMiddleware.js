// import User from "../models/authModels/User.js";
// import jwt from "jsonwebtoken"

// /* -------------------------------------------------------------------------- */
// /*                           AUTH MIDDLEWARE                                  */
// /* -------------------------------------------------------------------------- */

// const authMiddleware = async (req, res, next) => {
//     const token = req?.headers?.authorization?.split(" ")[1];
//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const user = await User.findById(decoded.userId);
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         req.user = user;
//         next();
//     } catch (error) {
//         return res.status(401).json({ message: "Unauthorized" });
//     }
// }

// export default authMiddleware;

import User from "../models/authModels/User.js";
import jwt from "jsonwebtoken"
import redisClient from "../services/redisClient.js";
import UserLoginLog from "../models/authModels/UserLoginLog.js";

/* -------------------------------------------------------------------------- */
/*                           AUTH MIDDLEWARE                                  */
/* -------------------------------------------------------------------------- */

const authMiddleware = async (req, res, next) => {
    const token = req?.headers?.authorization?.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // 🔒 SINGLE DEVICE CHECK
        const activeSessionId = await redisClient.get(
          `user:session:${decoded.userId}`
        );

        if (!activeSessionId || activeSessionId !== decoded.sessionId) {
            await UserLoginLog.findOneAndUpdate(
                {
                  userId: decoded.userId,
                  sessionId: decoded.sessionId,
                  logoutAt: null
                },
                {
                  logoutAt: new Date(),
                  logoutReason: "Logged in from another device"
                }
            );

          return res.status(401).json({
            message: "You have been logged out because you logged in on another device",
            forceLogout: true
          });
        }

        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if this is a 5-minute token (auto-logout enabled)
        const tokenExpiry = decoded.exp - decoded.iat;
        const isAutoLogoutToken = tokenExpiry <= 300; // 5 minutes or less
        
        if (isAutoLogoutToken) {
            // Check Redis session for auto-logout users
            const session = await redisClient.get(`session:${decoded.userId}`);
            
            if (!session) {
                await UserLoginLog.findOneAndUpdate(
                    {
                      userId: decoded.userId,
                      sessionId: decoded.sessionId,
                      logoutAt: null
                    },
                    {
                      logoutAt: new Date(),
                      logoutReason: "Auto logout (inactivity)"
                    }
                );

                return res.status(401).json({ 
                    message: "Session expired due to 5 minute inactivity",
                    autoLogout: true 
                });
            }
            
            // Update session activity
            await redisClient.setEx(`session:${decoded.userId}`, 300, JSON.stringify({
                userId: decoded.userId,
                lastActivity: Date.now()
            }));
        }
        
        req.user = user;
        req.user.sessionId = decoded.sessionId;

        // 🔁 Refresh online heartbeat
        await redisClient.setEx(
          `online:user:${user._id}`,
          600, // extend online status
          "1"
        );

        await redisClient.sAdd("online:users", String(user._id));

        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
}

export default authMiddleware;