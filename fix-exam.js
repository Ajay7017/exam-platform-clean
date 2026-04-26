const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fix() {
  const examId = 'cmoaaq1k30003i6041ahepgs5'
  
  // Get current question IDs in exam
  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId },
    select: { questionId: true },
    orderBy: { sequence: 'asc' }
  })
  
  const currentIds = examQuestions.map(eq => eq.questionId)
  console.log('Current count:', currentIds.length)

  // Get all Zoology questions from DB
  const zoologyQuestions = await prisma.question.findMany({
    where: {
      topic: {
        subject: { name: 'Zoology' }
      }
    },
    select: { 
      id: true, 
      statement: true,
      topic: { select: { name: true } }
    }
  })

  console.log('Total Zoology questions in DB:', zoologyQuestions.length)

  // Find which Zoology questions are NOT in the exam
  // but were likely supposed to be (we need to find the missing one)
  const zoologyInExam = currentIds.filter(id => 
    zoologyQuestions.find(q => q.id === id)
  )
  
  console.log('Zoology questions currently in exam:', zoologyInExam.length)
  console.log('Should be 42, currently', zoologyInExam.length)
}

fix().finally(() => prisma.$disconnect())