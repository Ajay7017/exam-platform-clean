// src/app/(marketing)/study-materials/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Download, 
  Search, 
  BookOpen, 
  Calculator, 
  Microscope, 
  Brain,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface StudyMaterial {
  id: string
  title: string
  description: string
  subject: string
  type: string
  link: string
  thumbnailUrl?: string | null
}

const categories = [
  { id: 'All', label: 'All Subjects', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'Physics', label: 'Physics', icon: <Brain className="w-4 h-4" /> },
  { id: 'Chemistry', label: 'Chemistry', icon: <Microscope className="w-4 h-4" /> },
  { id: 'Mathematics', label: 'Mathematics', icon: <Calculator className="w-4 h-4" /> },
  { id: 'Biology', label: 'Biology', icon: <FileText className="w-4 h-4" /> },
]

// UPDATED: 2 rows of 4 cards = 8 items per page
const ITEMS_PER_PAGE = 8 

export default function StudyMaterialsPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await fetch('/api/materials')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setMaterials(data.materials)
      } catch (error) {
        console.error('Error fetching materials:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMaterials()
  }, [])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, searchQuery])

  // Filter materials
  const filteredMaterials = materials.filter(material => {
    const matchesCategory = activeCategory === 'All' || material.subject === activeCategory
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          material.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Pagination Math
  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE)
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    // Smooth scroll back to the top of the grid
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
      
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
            Free <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Study Materials</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Download premium formula sheets, revision notes, and mind maps curated by top educators for JEE and NEET.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mt-8 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-4 rounded-full border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 focus:ring-0 transition-all shadow-sm"
              placeholder="Search for formulas, notes, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12"> {/* Increased max-width to accommodate 4 columns */}
        
        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Materials Grid - UPDATED to lg:grid-cols-4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedMaterials.map((material) => (
                <div 
                  key={material.id}
                  className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
                >
                  {/* Thumbnail Section */}
                  <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 relative overflow-hidden flex items-center justify-center border-b border-gray-200 dark:border-gray-800 shrink-0">
                    {material.thumbnailUrl ? (
                      <img 
                        src={material.thumbnailUrl} 
                        alt={material.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow"> {/* Slightly reduced padding for 4 cols */}
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {material.subject}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {material.type}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {material.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-5 flex-grow line-clamp-3">
                      {material.description}
                    </p>
                    
                    <a 
                      href={material.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all duration-300"
                    >
                      <Download className="w-4 h-4" />
                      Access
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredMaterials.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No materials found</h3>
                <p className="text-gray-500">Try adjusting your search or selecting a different subject.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      totalPages > 5 && 
                      pageNum !== 1 && 
                      pageNum !== totalPages && 
                      Math.abs(currentPage - pageNum) > 1
                    ) {
                      if (pageNum === 2 || pageNum === totalPages - 1) return <span key={idx} className="text-gray-400">...</span>;
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}