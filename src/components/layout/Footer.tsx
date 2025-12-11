'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Send,
  CheckCircle2,
  ArrowRight,
  Heart,
  ExternalLink,
  FileText,
  Shield,
  HelpCircle,
  BookOpen,
  Users,
  Briefcase,
  MessageCircle
} from 'lucide-react'

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

interface FooterSection {
  title: string
  icon: React.ReactNode
  links: FooterLink[]
}

const footerSections: FooterSection[] = [
  {
    title: 'Exams',
    icon: <BookOpen className="w-4 h-4" />,
    links: [
      { label: 'GATE Exams', href: '/exams?category=engineering' },
      { label: 'SSC Exams', href: '/exams?category=government' },
      { label: 'JEE Preparation', href: '/exams?category=engineering' },
      { label: 'NEET Preparation', href: '/exams?category=medical' },
      { label: 'Banking Exams', href: '/exams?category=banking' },
      { label: 'All Exams', href: '/exams' }
    ]
  },
  {
    title: 'Company',
    icon: <Briefcase className="w-4 h-4" />,
    links: [
      { label: 'About Us', href: '/#about' },
      { label: 'How It Works', href: '/#features' },
      { label: 'Success Stories', href: '/#testimonials' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' }
    ]
  },
  {
    title: 'Support',
    icon: <HelpCircle className="w-4 h-4" />,
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQs', href: '/faq' },
      { label: 'System Status', href: '/status' },
      { label: 'Report Issue', href: '/report' },
      { label: 'Community Forum', href: '/forum' }
    ]
  },
  {
    title: 'Legal',
    icon: <Shield className="w-4 h-4" />,
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Refund Policy', href: '/refund' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Academic Integrity', href: '/integrity' },
      { label: 'Disclaimer', href: '/disclaimer' }
    ]
  }
]

const socialLinks = [
  { icon: <Facebook className="w-5 h-5" />, href: 'https://facebook.com/exampro', label: 'Facebook', color: 'hover:bg-blue-600' },
  { icon: <Twitter className="w-5 h-5" />, href: 'https://twitter.com/exampro', label: 'Twitter', color: 'hover:bg-sky-500' },
  { icon: <Instagram className="w-5 h-5" />, href: 'https://instagram.com/exampro', label: 'Instagram', color: 'hover:bg-pink-600' },
  { icon: <Linkedin className="w-5 h-5" />, href: 'https://linkedin.com/company/exampro', label: 'LinkedIn', color: 'hover:bg-blue-700' },
  { icon: <Youtube className="w-5 h-5" />, href: 'https://youtube.com/@exampro', label: 'YouTube', color: 'hover:bg-red-600' }
]

const contactInfo = [
  {
    icon: <Mail className="w-5 h-5" />,
    label: 'Email',
    value: 'support@exampro.com',
    href: 'mailto:support@exampro.com'
  },
  {
    icon: <Phone className="w-5 h-5" />,
    label: 'Phone',
    value: '+91 9876543210',
    href: 'tel:+919876543210'
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    label: 'Address',
    value: 'Delhi, India',
    href: null
  }
]

const stats = [
  { value: '50,000+', label: 'Active Students' },
  { value: '450+', label: 'Exams Available' },
  { value: '200K+', label: 'Questions' },
  { value: '98%', label: 'Success Rate' }
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleNewsletterSubmit = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
    
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitted(true)
    setIsSubmitting(false)
    setEmail('')
    
    // Reset after 3 seconds
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  return (
    <footer className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white overflow-hidden">
      
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '4rem 4rem'
          }}
        />
      </div>

      {/* Main footer content */}
      <div className="relative">
        
        {/* Stats bar */}
        <div className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center group">
                  <div className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2 group-hover:scale-110 transition-transform">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main footer sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8">
            
            {/* Brand column - spans 2 columns on large screens */}
            <div className="lg:col-span-2 space-y-6">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                    <GraduationCap className="h-7 w-7 text-white" />
                  </div>
                </div>
                <span className="text-2xl font-bold">ExamPro</span>
              </Link>

              {/* Tagline */}
              <p className="text-gray-400 leading-relaxed">
                Your trusted companion for exam success. Practice with AI-powered analytics, compete on leaderboards, and achieve your dreams.
              </p>

              {/* Contact info */}
              <div className="space-y-3">
                {contactInfo.map((contact, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm group">
                    <div className="text-blue-400 mt-0.5 group-hover:scale-110 transition-transform">
                      {contact.icon}
                    </div>
                    {contact.href ? (
                      <a 
                        href={contact.href}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="text-gray-500 block">{contact.label}</span>
                        {contact.value}
                      </a>
                    ) : (
                      <div className="text-gray-400">
                        <span className="text-gray-500 block">{contact.label}</span>
                        {contact.value}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Social links */}
              <div className="flex gap-3">
                {socialLinks.map((social, idx) => (
                  <a
                    key={idx}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 ${social.color} hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg`}
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Link sections */}
            {footerSections.map((section, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold text-lg">
                  <div className="text-blue-400">
                    {section.icon}
                  </div>
                  <h3>{section.title}</h3>
                </div>
                <ul className="space-y-3">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {link.label}
                        </span>
                        {link.external && (
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter section */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Stay Updated</h3>
                <p className="text-gray-400">
                  Subscribe to our newsletter for exam tips, updates, and exclusive offers
                </p>
              </div>

              {/* Newsletter form */}
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={isSubmitting || isSubmitted}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email.includes('@')) {
                        handleNewsletterSubmit(e)
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleNewsletterSubmit}
                  disabled={isSubmitting || isSubmitted || !email.includes('@')}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Subscribed!</span>
                    </>
                  ) : isSubmitting ? (
                    <span>Subscribing...</span>
                  ) : (
                    <>
                      <span>Subscribe</span>
                      <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                By subscribing, you agree to our Privacy Policy and consent to receive updates
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Copyright */}
              <div className="text-sm text-gray-400 text-center md:text-left">
                <p className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <span>© 2024 ExamPro. All rights reserved.</span>
                  <span className="hidden md:inline">•</span>
                  <span className="flex items-center gap-1">
                    Made with <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" /> in India
                  </span>
                </p>
              </div>

              {/* Bottom links */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms
                </Link>
                <Link href="/sitemap" className="text-gray-400 hover:text-white transition-colors">
                  Sitemap
                </Link>
                <Link href="/accessibility" className="text-gray-400 hover:text-white transition-colors">
                  Accessibility
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top button (optional - can be implemented later) */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group z-50"
        aria-label="Scroll to top"
      >
        <ArrowRight className="w-5 h-5 -rotate-90 group-hover:-translate-y-1 transition-transform" />
      </button>
    </footer>
  )
}