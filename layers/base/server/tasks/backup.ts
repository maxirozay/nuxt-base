import { createReadStream } from 'fs'

export default defineTask({
  meta: {
    name: 'backup',
    description: 'Backup DB',
  },
  async run() {
    const timestamp = new Date().toISOString()
    try {
      const config = useRuntimeConfig()
      const agePublicKey = config.backup.agePublicKey
      const backupName = `backups/backup-${timestamp}.dump${agePublicKey ? '.age' : ''}`

      await createDatabaseBackup(backupName, config.db, config.backup.dumpArgs, agePublicKey)
      if (config.s3.privateBucket) {
        await uploadStreamToS3(
          backupName,
          createReadStream(backupName),
          'application/octet-stream',
          'private',
          true,
        )
      }
      await log('Backup created', { backupName }, 'backup task', 'info')

      return {
        result: {
          success: true,
        },
      }
    } catch (error: any) {
      await log(error.message, { stack: error.stack, cause: error.cause }, 'backup task', 'error')

      return {
        result: {
          success: false,
        },
      }
    }
  },
})
