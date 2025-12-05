// src/app/(student)/purchases/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, XCircle, Clock, Download } from 'lucide-react'

export const metadata: Metadata = {
  title: 'My Purchases',
  description: 'View your purchase history'
}

export default async function PurchasesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  // Fetch user's purchases
  const purchases = await prisma.purchase.findMany({
    where: { userId: session.user.id },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnail: true,
          subject: {
            select: { name: true }
          }
        }
      },
      payment: true
    },
    orderBy: { purchasedAt: 'desc' }
  })

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Purchases</h1>
        <p className="text-gray-600 mt-2">View all your exam purchases and payment history</p>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
              <Download className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No purchases yet</h3>
            <p className="text-gray-600 mb-6">Start exploring our exams and make your first purchase!</p>
            <a
              href="/exams"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse Exams
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            // --- FIX START ---
            // If this purchase is not for an exam (e.g. it's for a bundle/subscription), skip it.
            // This tells TypeScript that 'purchase.exam' is definitely not null below.
            if (!purchase.exam) return null
            // --- FIX END ---

            return (
              <div
                key={purchase.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-6">
                  {/* Exam Thumbnail */}
                  {purchase.exam.thumbnail && (
                    <div className="flex-shrink-0">
                      <img
                        src={purchase.exam.thumbnail}
                        alt={purchase.exam.title}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Purchase Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {purchase.exam.title}
                        </h3>
                        {purchase.exam.subject && (
                          <p className="text-sm text-gray-500">{purchase.exam.subject.name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {/* Price stored in paise */}
                          ₹{(purchase.price / 100).toFixed(2)}
                        </div>
                        <StatusBadge status={purchase.status} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Purchase Date:</span>
                        <p className="font-medium text-gray-900">
                           {/* Handle potentially null purchasedAt */}
                           {purchase.purchasedAt 
                            ? formatDistanceToNow(new Date(purchase.purchasedAt), { addSuffix: true })
                            : 'Just now'}
                        </p>
                      </div>
                      {purchase.validUntil && (
                        <div>
                          <span className="text-gray-500">Valid Until:</span>
                          <p className="font-medium text-gray-900">
                            {new Date(purchase.validUntil).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {purchase.payment && (
                        <>
                          <div>
                            <span className="text-gray-500">Payment ID:</span>
                            <p className="font-mono text-xs text-gray-900">
                              {purchase.payment.razorpayPaymentId || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment Method:</span>
                            <p className="font-medium text-gray-900 capitalize">
                              {purchase.payment.method || 'Online'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {purchase.status === 'active' && (
                      <a
                        href={`/exam/${purchase.exam.slug}/start`}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Start Exam
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-gray-100 text-gray-800 border-gray-200',
  }

  const icons = {
    active: <CheckCircle2 className="h-4 w-4" />,
    pending: <Clock className="h-4 w-4" />,
    failed: <XCircle className="h-4 w-4" />,
    expired: <XCircle className="h-4 w-4" />,
  }

  const style = styles[status as keyof typeof styles] || styles.pending
  const icon = icons[status as keyof typeof icons] || icons.pending

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${style}`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}