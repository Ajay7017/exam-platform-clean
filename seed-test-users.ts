// seed-test-users.ts
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Generating 100 Load Test Users...')
  const tokens: string[] = []

  for (let i = 1; i <= 100; i++) {
    // Generate a secure, fake session token
    const sessionToken = randomBytes(32).toString('hex')
    // Generate a unique 10-digit phone number: 9990000001, 9990000002...
    const phone = `999000${i.toString().padStart(4, '0')}`

    try {
      await prisma.user.create({
        data: {
          email: `loadtester${i}@mockzy.co.in`,
          name: `Test Bot ${i}`,
          phone: phone,
          role: 'student',
          // Create the associated NextAuth session instantly
          sessions: {
            create: {
              sessionToken: sessionToken,
              expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
            }
          }
        }
      })
      tokens.push(sessionToken)
    } catch (e) {
      console.error(`Failed to create user ${i}`, e)
    }
  }

  // Write all generated tokens to a CSV file for k6 to consume
  const csvContent = 'sessionToken\n' + tokens.join('\n')
  fs.writeFileSync('load-test-users.csv', csvContent)
  
  console.log('✅ Created 100 users!')
  console.log('📄 Saved session tokens to load-test-users.csv')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())