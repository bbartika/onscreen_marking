import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTHMAIL,
        pass: process.env.AUTHPASSWORD
    }
});

const sendOtpEmail = async (email, otpCode) => {
    const mailOptions = {
        from: process.env.AUTHMAIL,
        to: email,
        subject: 'Your OTP Code - OMR INDIA OUTSOURCES PVT. LTD.',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: auto;">
                <h1 style="text-align: center; color: #4CAF50; font-size: 28px; margin-bottom: 10px;">OMR INDIA OUTSOURCES PVT. LTD.</h1>
                <h2 style="text-align: center; color: #333; font-size: 22px; margin-bottom: 20px;">One-Time Password (OTP) Verification</h2>
                <p style="font-size: 16px;">Dear User,</p>
                <p style="font-size: 16px;">Please use the following OTP code to proceed with your verification:</p>
                <div style="text-align: center; font-size: 26px; font-weight: bold; padding: 15px; background-color: #f0f0f0; border-radius: 6px; margin: 30px 0;">
                    ${otpCode}
                </div>
                <p style="font-size: 16px;">If you did not request this OTP, please ignore this email or contact our support team.</p>
                <p style="font-size: 16px;">Thank you,</p>
                <p style="font-size: 16px; color: #4CAF50;">OMR INDIA OUTSOURCES PVT. LTD.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
};

export default sendOtpEmail;