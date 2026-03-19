import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

export async function createDatabaseBackup(
  backupName: string,
  dbUrl: string,
  dumpArgs: string = '--data-only -F c',
) {
  const args = [...dumpArgs.split(' '), dbUrl, '-f', backupName]

  await new Promise((resolve, reject) => {
    const dump: any = spawn(
      'pg_dump',
      args.filter((a) => a !== undefined),
    )
    dump.on('close', (code: number) => {
      if (code === 0) resolve(true)
      else reject(new Error('pg_dump failed'))
    })
    dump.on('error', reject)
  })
}

export async function cleanOldBackups() {
  const backupDir = path.resolve(process.cwd(), 'backups')
  const files = await fs.readdir(backupDir)
  const now = Date.now()
  const config = useRuntimeConfig()
  const retentionMs = daysToMilliseconds(config.backup.retentionDays)

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(backupDir, file)
      const stats = await fs.stat(filePath)
      if (now - stats.mtimeMs > retentionMs) {
        await fs.unlink(filePath) // Delete old backup
      }
    }),
  )
}
