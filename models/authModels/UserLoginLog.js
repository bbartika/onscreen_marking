import mongoose from "mongoose";

const UserLoginLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sessionId: {
        type: String,
        required: true
    },
    loginAt: {
        type: Date,
        default: Date.now
    },
    logoutAt: {
        type: Date,
        default: null
    },
    logoutReason: {
        type: String,
        default: null
    },
    status: {
      type: Number,
      enum: [0, 1], // 0 = offline, 1 = online
      default: 0
    },
    ip: {
        type: String
    },
    userAgent: {
        type: String
    }
}, { timestamps: true });

export default mongoose.model("UserLoginLog", UserLoginLogSchema);
