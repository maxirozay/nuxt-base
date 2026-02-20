import nodemailer from 'nodemailer'

export async function sendEmail (to: string, subject: string, html: string, attachments?: any[], bcc?: string) {
  const config = useRuntimeConfig()
  
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: true,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  })
  const mail = await transporter.sendMail({
    from: config.smtp.from,
    to,
    bcc,
    subject,
    html,
    attachments
  })
  return mail
}
