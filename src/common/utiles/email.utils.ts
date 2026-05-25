import { SendMailOptions } from 'nodemailer';
import nodemailer from 'nodemailer';

export async function sendEmail (mailOptions:SendMailOptions) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  return await transporter.sendMail(mailOptions)
}