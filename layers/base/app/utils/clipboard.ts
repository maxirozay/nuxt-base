export async function copyToClipboard(text: string) {
  const { $t } = useI18n()
  const appStore = useAppStore()
  await navigator.clipboard.writeText(text)
  appStore.notify($t('copied') as string, 'success')
}
