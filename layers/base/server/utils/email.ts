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
  const base = await buildEmail(html, locale)
  const mail = await transporter.sendMail({
    from: config.smtp.from,
    to,
    bcc,
    subject: subject.replaceAll('{{appName}}', appName),
    html: base,
    attachments,
  })
  return mail
}

export async function buildEmail(html: string, locale: string = 'en') {
  const config = useRuntimeConfig()
  const appName = useRuntimeConfig().public.name
  const base = (await useStorage('assets:server').getItem(`emails/base.html`)) as string
  const localeBase = (await useStorage('assets:server').getItem(
    `emails/${locale}/base.html`,
  )) as string
  return inlineStyles(
    base
      .replace('{{content}}', localeBase?.replace('{{content}}', html) || html)
      .replaceAll('{{appName}}', appName)
      .replaceAll('{{url}}', config.public.url)
      .replaceAll('{{logo}}', config.public.logo),
  )
}

export async function sendEmailTemplate(
  templateId: string,
  locale: string = 'en',
  params: Record<string, any> = {},
  to: string,
  attachments?: any[],
  bcc?: string,
) {
  const { subject, html } = await buildEmailTemplate(templateId, locale, params)
  sendEmail(to, subject, html, locale, attachments, bcc)
}

export async function buildEmailTemplate(
  templateId: string,
  locale: string = 'en',
  params: Record<string, any>,
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
  return {
    subject: subject.replace(/{{(\w+)}}/g, (_: string, key: string) => params[key] || ''),
    html: html.replace(/{{(\w+)}}/g, (_: string, key: string) => params[key] || ''),
  }
}

function getClasses(html: string) {
  const classes: Record<string, string> = {}
  const style = html
    .replaceAll(/\n/g, '')
    .replaceAll(/\s{2,}/g, ' ')
    .replace(/.*<style>/, '')
    .replace(/<\/style>.*/, '')
  style.split('}').forEach((rule) => {
    const [selectors, declarations] = rule.split('{')
    if (!selectors || !declarations) return
    classes[selectors.trim().replace(/^\./, '')] = declarations.trim()
  })
  return classes
}

function inlineStyles(html: string): string {
  const classes = getClasses(html)
  return html.replace(/class="(.*?)"/g, (_, className) => {
    const styles = className
      .split(' ')
      .map((name: string) => classes[name] || '')
      .join('; ')
    return `style="${styles}"`
  })
}
