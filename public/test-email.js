require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER, // Send the email to yourself for testing
  subject: 'Test Email from Nodemailer',
  text: 'Hello! This is a test email to verify if Nodemailer is working.',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent successfully:', info.response);
  }
});
