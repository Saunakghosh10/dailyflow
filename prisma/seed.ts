import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Add any seed data if needed
  console.log('Database seeded...')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 