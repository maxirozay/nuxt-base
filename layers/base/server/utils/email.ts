import nodemailer from 'nodemailer'

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  locale: string = 'en',
  attachments?: any[],
  bcc?: string,
) {
  const config = useRuntimeConfig()

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: true,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  })
  const appName = useRuntimeConfig().public.name
  const base = (await useStorage('assets:server').getItem(`emails/${locale}/base.html`)) as string
  const mail = await transporter.sendMail({
    from: config.smtp.from,
    to,
    bcc,
    subject: subject.replaceAll('{{appName}}', appName),
    html: base.replace('{{content}}', html).replaceAll('{{appName}}', appName),
    attachments,
  })
  return mail
}

export async function sendEmailTemplate(
  templateId: string,
  locale: string = 'en',
  params: any = {},
  to: string,
  attachments?: any[],
  bcc?: string,
) {
  let template = (await useStorage('assets:server').getItem(
    `emails/${locale}/${templateId}.html`,
  )) as string
  if (!template) {
    template = (await useStorage('assets:server').getItem(`emails/en/${templateId}.html`)) as string
    if (!template) {
      throw new Error(`Email template not found: ${locale}/${templateId}`)
    }
  }
  const match = template.match(/<title>(.*?)<\/title>/i)
  const subject = match ? (match[1] as string) : '{{appName}}'
  const html = template
  sendEmail(
    to,
    subject.replace(/{{(\w+)}}/g, (_: string, key: string) => params[key] || ''),
    html.replace(/{{(\w+)}}/g, (_: string, key: string) => params[key] || ''),
    locale,
    attachments,
    bcc,
  )
}
