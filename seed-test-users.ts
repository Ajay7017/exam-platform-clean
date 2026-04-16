// seed-test-users.ts
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Generating 100 Load Test Users...')
  
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set in your .env file!')
  }

  const rows: string[] = []

  for (let i = 1; i <= 100; i++) {
    const phone = `999000${i.toString().padStart(4, '0')}`
    const email = `loadtester${i}@mockzy.co.in`

    // 1. Upsert the user in the DB (don't create sessions table rows — jwt strategy ignores them)
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `Test Bot ${i}`,
        phone,
        role: 'student',
      },
    })

    // 2. Mint a real NextAuth JWE token using the same secret as your deployment
    const token = await encode({
      token: {
        id: user.id,
        sub: user.id,
        email: user.email,
        name: user.name,
        role: 'student',
        isBlocked: false,
        phone: user.phone,
      },
      secret,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    rows.push(token)
    if (i % 10 === 0) console.log(`  ✅ Created user ${i}/100`)
  }

  const csvContent = 'sessionToken\n' + rows.join('\n')
  fs.writeFileSync('load-test-users.csv', csvContent)

  console.log('✅ Done! 100 users created.')
  console.log('📄 Real JWE tokens saved to load-test-users.csv')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())