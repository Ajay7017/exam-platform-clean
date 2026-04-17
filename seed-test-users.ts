import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Generating 1,000 Load Test Users...')
  
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set in your .env file!')
  }

  const rows: string[] = []

  // Loop increased to 1,000
  for (let i = 1; i <= 1000; i++) {
    // Adjusted padding to '0000' to prevent phone number collisions
    const phone = `987000${i.toString().padStart(4, '0')}`
    const email = `stress-test-${i}@mockzy.co.in`

    // Upsert the user in the DB
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `Stress Bot ${i}`,
        phone,
        role: 'student',
      },
    })

    // Mint a real NextAuth JWE token
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
      maxAge: 30 * 24 * 60 * 60,
    })

    rows.push(token)
    if (i % 100 === 0) console.log(`  ✅ Created user ${i}/1000`)
  }

  const csvContent = 'sessionToken\n' + rows.join('\n')
  fs.writeFileSync('load-test-users.csv', csvContent)

  console.log('✅ Done! 1,000 users created.')
  console.log('📄 Real JWE tokens saved to load-test-users.csv')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())