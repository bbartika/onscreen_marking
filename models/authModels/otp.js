import mongoose from 'mongoose';

/* -------------------------------------------------------------------------- */
/*                           OTP SCHEMA                                       */
/* -------------------------------------------------------------------------- */

const otpSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    }
});

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
