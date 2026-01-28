import SibApiV3Sdk from "sib-api-v3-sdk";

const client = SibApiV3Sdk.ApiClient.instance;

// Set API key
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const sendEmailSendotp = async (to, message) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    await apiInstance.sendTransacEmail({
      sender: { email: process.env.EMAIL_FROM },
      to: [{ email: to }],
      subject: "Your OTP for Password Reset",
      textContent: message,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Brevo Email Error:", error.message);
    throw new Error("Email could not be sent");
  }
};
const sendEmailSignup = async (to, message) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    await apiInstance.sendTransacEmail({
      sender: { email: process.env.EMAIL_FROM },
      to: [{ email: to }],
      subject: "Your password for onscreen marking site",
      textContent: message,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Brevo Email Error:", error.message);
    throw new Error("Email could not be sent");
  }
};

const sendEmailResetpassword = async (to, message) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    await apiInstance.sendTransacEmail({
      sender: { email: process.env.EMAIL_FROM },
      to: [{ email: to }],
      subject: "Reset-password for onscreen marking site",
      textContent: message,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Brevo Email Error:", error.message);
    throw new Error("Email could not be sent");
  }
};

export  { sendEmailSendotp, sendEmailSignup, sendEmailResetpassword };