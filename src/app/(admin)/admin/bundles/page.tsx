'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import {
  Plus, Search, Edit, Trash2, Users, Loader2,
  LayoutGrid, List, Package, Globe, EyeOff,
  Layers, IndianRupee, ChevronRight,
} from 'lucide-react'

// ── types ──────────────────────────────────────────────────────────────────

interface Bundle {
  id: string
  name: string
  slug: string
  description: string | null
  thumbnail: string | null
  price: number
  discount: number
  finalPrice: number
  totalMarketValue: number
  savings: number
  validityDays: number
  isActive: boolean
  totalExams: number
  totalPurchases: number
  examTitles: string[]
  createdAt: string
}

interface Stats {
  total: number
  active: number
  inactive: number
  totalPurchases: number
}

interface PurchaseRecord {
  purchaseId:  string
  purchasedAt: string
  validUntil:  string | null
  price:       number
  user: {
    id:    string
    name:  string
    email: string
    phone: string | null
    image: string | null
  }
  payment: {
    amount:            number
    razorpayPaymentId: string | null
    paidAt:            string | null
    method:            string | null
  } | null
}

// ── helpers ────────────────────────────────────────────────────────────────

const BUNDLE_GRADIENTS = [
  'from-violet-500 to-purple-700', 'from-blue-500 to-cyan-700',
  'from-emerald-500 to-teal-700',  'from-orange-500 to-amber-700',
  'from-pink-500 to-rose-700',     'from-indigo-500 to-blue-700',
]

function getBundleGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return BUNDLE_GRADIENTS[Math.abs(hash) % BUNDLE_GRADIENTS.length]
}

function getOptimizedThumbnail(url: string): string {
  if (!url || !url.includes('cloudinary.com')) return url
  return url.replace('/upload/', '/upload/c_fill,w_800,h_450,q_auto,f_auto/')
}

function formatPrice(paise: number) {
  return `₹${(paise / 100).toFixed(0)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Purchases Drawer ───────────────────────────────────────────────────────

function PurchasesDrawer({
  bundle, open, onClose,
}: {
  bundle: Bundle | null
  open: boolean
  onClose: () => void
}) {
  const [purchases, setPurchases]   = useState<PurchaseRecord[]>([])
  const [loading, setLoading]       = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (!open || !bundle) return
    setPurchases([])
    setLoading(true)

    fetch(`/api/admin/bundles/${bundle.id}/purchases`)
      .then(r => r.json())
      .then(data => {
        setPurchases(data.purchases ?? [])
        setTotalCount(data.pagination?.total ?? 0)
      })
      .catch(() => toast.error('Failed to load purchases'))
      .finally(() => setLoading(false))
  }, [open, bundle])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Purchases — {bundle?.name}
          </SheetTitle>
          <SheetDescription>
            {totalCount} completed purchase{totalCount !== 1 ? 's' : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Users className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No completed purchases yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map(p => (
                <div key={p.purchaseId}
                  className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    {/* User info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        {p.user.image
                          ? <img src={p.user.image} className="w-9 h-9 rounded-full object-cover" alt="" />
                          : <span className="text-sm font-bold text-indigo-600">
                              {p.user.name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{p.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{p.user.email}</p>
                        {p.user.phone && (
                          <p className="text-xs text-gray-400">{p.user.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-600">{formatPrice(p.price)}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.purchasedAt)}</p>
                    </div>
                  </div>

                  {/* Payment details */}
                  {p.payment && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1">
                      {p.payment.razorpayPaymentId && (
                        <span className="text-xs text-gray-400">
                          ID: <span className="font-mono text-gray-600">{p.payment.razorpayPaymentId}</span>
                        </span>
                      )}
                      {p.payment.method && (
                        <span className="text-xs text-gray-400 capitalize">
                          Via: <span className="text-gray-600">{p.payment.method}</span>
                        </span>
                      )}
                      {p.validUntil && (
                        <span className="text-xs text-gray-400">
                          Valid until: <span className="text-gray-600">{formatDate(p.validUntil)}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── main component ─────────────────────────────────────────────────────────

export default function AdminBundlesPage() {
  const router = useRouter()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [stats, setStats]     = useState<Stats>({ total: 0, active: 0, inactive: 0, totalPurchases: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery]   = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bundleViewMode') as 'grid' | 'list') || 'grid'
    }
    return 'grid'
  })

  const [togglingId, setTogglingId]         = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bundleToDelete, setBundleToDelete]     = useState<Bundle | null>(null)
  const [deleting, setDeleting]                 = useState(false)

  // ── purchases drawer state ──
  const [drawerBundle, setDrawerBundle] = useState<Bundle | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)

  const openPurchasesDrawer = (bundle: Bundle) => {
    setDrawerBundle(bundle)
    setDrawerOpen(true)
  }

  useEffect(() => { fetchBundles() }, [])
  useEffect(() => { localStorage.setItem('bundleViewMode', viewMode) }, [viewMode])

  const fetchBundles = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/bundles')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const arr: Bundle[] = data.bundles || []
      setBundles(arr)
      setStats({
        total:          arr.length,
        active:         arr.filter(b => b.isActive).length,
        inactive:       arr.filter(b => !b.isActive).length,
        totalPurchases: arr.reduce((s, b) => s + b.totalPurchases, 0),
      })
    } catch {
      toast.error('Failed to load bundles')
    } finally {
      setLoading(false)
    }
  }

  const filteredBundles = bundles.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active'   && b.isActive) ||
      (statusFilter === 'inactive' && !b.isActive)
    return matchSearch && matchStatus
  })

  const handleToggleActive = async (bundle: Bundle) => {
    setTogglingId(bundle.id)
    try {
      const res = await fetch(`/api/admin/bundles/${bundle.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !bundle.isActive }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setBundles(prev => prev.map(b => b.id === bundle.id ? { ...b, isActive: !b.isActive } : b))
      setStats(prev => ({
        ...prev,
        active:   bundle.isActive ? prev.active - 1 : prev.active + 1,
        inactive: bundle.isActive ? prev.inactive + 1 : prev.inactive - 1,
      }))
      toast.success(bundle.isActive ? 'Bundle deactivated' : 'Bundle activated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bundle')
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = (bundle: Bundle) => { setBundleToDelete(bundle); setDeleteDialogOpen(true) }

  const handleDelete = async () => {
    if (!bundleToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success('Bundle deleted successfully')
      setDeleteDialogOpen(false)
      setBundleToDelete(null)
      fetchBundles()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bundle')
    } finally {
      setDeleting(false)
    }
  }

  // ── sub-components ─────────────────────────────────────────────────────

  function BundleCardHeader({ bundle }: { bundle: Bundle }) {
    const gradient = getBundleGradient(bundle.name)
    return (
      <div
        className={`relative w-full rounded-t-lg overflow-hidden ${!bundle.thumbnail ? `bg-gradient-to-br ${gradient}` : ''}`}
        style={{ aspectRatio: '16/9' }}
      >
        {bundle.thumbnail ? (
          <img src={getOptimizedThumbnail(bundle.thumbnail)} alt={bundle.name} className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Package className="h-7 w-7 text-white" />
              </div>
              <span className="text-white/80 text-xs font-medium tracking-wide uppercase">Test Bundle</span>
            </div>
          </>
        )}
        <div className="absolute top-3 left-3">
          <Badge className={bundle.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
            {bundle.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {bundle.discount > 0 && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-orange-100 text-orange-700">{bundle.discount}% OFF</Badge>
          </div>
        )}
      </div>
    )
  }

  function BundleCard({ bundle }: { bundle: Bundle }) {
    const toggling = togglingId === bundle.id
    return (
      <Card className="hover:shadow-lg transition-shadow overflow-hidden">
        <CardContent className="p-0">
          <BundleCardHeader bundle={bundle} />
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 truncate mb-1" title={bundle.name}>
              {bundle.name}
            </h3>
            {bundle.description && (
              <p className="text-sm text-gray-500 mb-2 line-clamp-2">{bundle.description}</p>
            )}

            <div className="flex items-center gap-1.5 mb-3">
              <Layers className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm text-gray-600 font-medium">{bundle.totalExams} Exams</span>
            </div>
            {bundle.examTitles.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {bundle.examTitles.slice(0, 2).map((t, i) => (
                  <span key={i} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 truncate max-w-[120px]">
                    {t}
                  </span>
                ))}
                {bundle.examTitles.length > 2 && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                    +{bundle.examTitles.length - 2} more
                  </span>
                )}
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-gray-900">{formatPrice(bundle.finalPrice)}</span>
                {bundle.discount > 0 && (
                  <span className="text-sm text-gray-400 line-through">{formatPrice(bundle.price)}</span>
                )}
              </div>
              {bundle.savings > 0 && (
                <span className="text-xs text-green-600 font-medium">
                  Saves {formatPrice(bundle.savings)} vs individual
                </span>
              )}
            </div>

            {/* Purchases — now clickable */}
            <button
              onClick={() => openPurchasesDrawer(bundle)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4 group transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium">{bundle.totalPurchases} purchases</span>
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1"
                onClick={() => router.push(`/admin/bundles/${bundle.id}/edit`)}>
                <Edit className="h-3 w-3 mr-1" />Edit
              </Button>
              <Button
                variant="outline" size="sm" disabled={toggling}
                onClick={() => handleToggleActive(bundle)}
                className={bundle.isActive
                  ? 'text-orange-600 border-orange-300 hover:bg-orange-50'
                  : 'text-green-600 border-green-300 hover:bg-green-50'}
              >
                {toggling
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : bundle.isActive
                    ? <><EyeOff className="h-3 w-3 mr-1" />Deactivate</>
                    : <><Globe className="h-3 w-3 mr-1" />Activate</>
                }
              </Button>
              <Button variant="outline" size="sm" onClick={() => confirmDelete(bundle)}>
                <Trash2 className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bundle Management</h1>
          <p className="mt-1 text-gray-600">Manage test series bundles ({stats.total} total)</p>
        </div>
        <Button onClick={() => router.push('/admin/bundles/new')}>
          <Plus className="mr-2 h-4 w-4" />Create New Bundle
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Bundles',    value: stats.total,          icon: Package,       color: 'bg-purple-100 text-purple-600' },
          { label: 'Active',           value: stats.active,         icon: Globe,         color: 'bg-green-100 text-green-600' },
          { label: 'Inactive',         value: stats.inactive,       icon: EyeOff,        color: 'bg-gray-100 text-gray-600' },
          { label: 'Total Purchases',  value: stats.totalPurchases, icon: Users,         color: 'bg-blue-100 text-blue-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search bundles..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 border rounded-md p-1 h-10 self-start">
              <button onClick={() => setViewMode('grid')}
                className={`px-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`px-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredBundles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No bundles found</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {bundles.length === 0 ? 'Create your first bundle to get started' : 'Try adjusting your filters'}
            </p>
            {bundles.length === 0 && (
              <Button onClick={() => router.push('/admin/bundles/new')}>
                <Plus className="mr-2 h-4 w-4" />Create First Bundle
              </Button>
            )}
          </CardContent>
        </Card>

      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBundles.map(bundle => <BundleCard key={bundle.id} bundle={bundle} />)}
        </div>

      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bundle</TableHead>
                  <TableHead>Exams</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Savings</TableHead>
                  <TableHead>Purchases</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBundles.map(bundle => {
                  const toggling = togglingId === bundle.id
                  return (
                    <TableRow key={bundle.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[200px]" title={bundle.name}>{bundle.name}</p>
                          {bundle.description && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{bundle.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium">{bundle.totalExams}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{formatPrice(bundle.finalPrice)}</span>
                          {bundle.discount > 0 && (
                            <span className="ml-1 text-xs text-gray-400 line-through">{formatPrice(bundle.price)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {bundle.discount > 0
                          ? <Badge className="bg-orange-100 text-orange-700">{bundle.discount}% OFF</Badge>
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        {bundle.savings > 0
                          ? <span className="text-green-600 text-sm font-medium">{formatPrice(bundle.savings)}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                      </TableCell>
                      {/* Purchases column — clickable in list view too */}
                      <TableCell>
                        <button
                          onClick={() => openPurchasesDrawer(bundle)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm group transition-colors"
                        >
                          {bundle.totalPurchases}
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge className={bundle.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                          {bundle.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon"
                            onClick={() => router.push(`/admin/bundles/${bundle.id}/edit`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" disabled={toggling}
                            onClick={() => handleToggleActive(bundle)}
                            title={bundle.isActive ? 'Deactivate' : 'Activate'}>
                            {toggling
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : bundle.isActive
                                ? <EyeOff className="h-4 w-4 text-orange-500" />
                                : <Globe className="h-4 w-4 text-green-600" />
                            }
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(bundle)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{bundleToDelete?.name}&quot;</strong>?
              This action cannot be undone. Bundles with existing purchases cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purchases Drawer */}
      <PurchasesDrawer
        bundle={drawerBundle}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

    </div>
  )
}