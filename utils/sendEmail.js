import { createTransport } from "nodemailer";
const supportEmail = process.env.SUPPORT_EMAIL;
const companyName = process.env.COMPANY_NAME;
/**
 * Sends an email using the provided options.
 *
 * @param {Object} option - The email options.
 * @param {string} option.email - The recipient's email address.
 * @param {string} option.subject - The subject of the email.
 * @param {string} option.message - The message content of the email.
 * @returns {Promise<void>} A promise that resolves when the email is sent.
 */
const sendEmail = async function (option) {
  // create a transporter
  const transporter = createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const emailOptions = {
    from: `${companyName} Support <${supportEmail}>`,
    to: option.email,
    subject: option.subject,
    text: option.message,
  };

  await transporter.sendMail(emailOptions);
};

export default sendEmail;
