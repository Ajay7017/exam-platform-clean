import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Get admin emails from environment
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

  if (adminEmails.length === 0) {
    console.log('⚠️  No admin emails found in ADMIN_EMAILS environment variable')
    console.log('   Add your email to .env.local: ADMIN_EMAILS="your-email@gmail.com"')
    return
  }

  // Create admin users (will only work after they sign in with Google first)
  for (const email of adminEmails) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Update existing user to admin
      await prisma.user.update({
        where: { email },
        data: { role: 'admin' },
      })
      console.log(`✅ Updated ${email} to admin`)
    } else {
      console.log(`ℹ️  ${email} not found - they need to sign in with Google first`)
    }
  }

  // Create sample subjects
  const subjects = [
    {
      name: 'Computer Science',
      slug: 'computer-science',
      description: 'Programming, algorithms, data structures, and computer fundamentals',
      isActive: true,
    },
    {
      name: 'Mathematics',
      slug: 'mathematics',
      description: 'Algebra, calculus, geometry, and statistics',
      isActive: true,
    },
    {
      name: 'Physics',
      slug: 'physics',
      description: 'Mechanics, thermodynamics, electromagnetism, and modern physics',
      isActive: true,
    },
  ]

  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { slug: subject.slug },
      update: {},
      create: subject,
    })
    console.log(`✅ Created subject: ${subject.name}`)
  }

  // Create sample topics for Computer Science
  const csSubject = await prisma.subject.findUnique({
    where: { slug: 'computer-science' },
  })

  if (csSubject) {
    const topics = [
      { name: 'Data Structures', slug: 'data-structures', sequence: 1 },
      { name: 'Algorithms', slug: 'algorithms', sequence: 2 },
      { name: 'Operating Systems', slug: 'operating-systems', sequence: 3 },
      { name: 'Database Management', slug: 'database-management', sequence: 4 },
      { name: 'Computer Networks', slug: 'computer-networks', sequence: 5 },
    ]

    for (const topic of topics) {
      await prisma.topic.upsert({
        where: {
          subjectId_name: {
            subjectId: csSubject.id,
            name: topic.name,
          },
        },
        update: {},
        create: {
          ...topic,
          subjectId: csSubject.id,
          isActive: true,
        },
      })
      console.log(`✅ Created topic: ${topic.name}`)
    }
  }

  console.log('✨ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })