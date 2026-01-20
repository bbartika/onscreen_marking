import UserLoginLog from "../models/authModels/UserLoginLog.js";

const CLEANUP_AFTER = 10 * 60 * 1000; // 10 minutes

await UserLoginLog.updateMany(
    {
        status: 1,
        updatedAt: { $lt: new Date(Date.now() - CLEANUP_AFTER) }
    },
    {
        status: 0,
        logoutAt: new Date(),
        logoutReason: "System cleanup (inactive session)"
    }
);

process.exit();
