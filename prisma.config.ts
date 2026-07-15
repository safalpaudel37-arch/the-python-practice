import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Next.js keeps secrets in .env.local; the Prisma CLI only auto-loads via this file.
config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DB_URL!,
  },
})
