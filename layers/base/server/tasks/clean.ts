export default defineTask({
  meta: {
    name: 'clean',
    description: 'Clean old backups and logs',
  },
  async run() {
    const config = useRuntimeConfig()
  
    let backup = 'success'
    try {
      await cleanOldBackups()
      if (config.s3.privateBucket) {
        const backups = await listFromS3('backups', true)
        const retentionMs = daysToMilliseconds(config.backup.retentionDays)
        const cutoffDate = new Date(Date.now() - retentionMs)
        await Promise.all(
          backups.map((b) => {
            if (b.updatedAt && b.updatedAt < cutoffDate) {
              return deleteFromS3(`backups/${b.name}`, true)
            }
          }),
        )
      }
    } catch (e: any) {
      backup = e.message
    }

    let logs = 'success'
    await cleanLogs().catch((e) => {
      logs = e.message
    })

    return {
      result: {
        backup,
        logs
      },
    }
  },
})
