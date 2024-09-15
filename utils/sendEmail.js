import { createTransport } from "nodemailer";
const supportEmail = process.env.SUPPORT_EMAIL;
const companyName = process.env.COMPANY_NAME;
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
