// src/components/layout/Footer.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  GraduationCap,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  ArrowRight,
  Heart,
  ExternalLink,
  Shield,
  HelpCircle,
  BookOpen,
  Briefcase,
  Target,
  Zap,
  BarChart3,
  Award,
  Info
} from 'lucide-react'

// Import your UI Dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

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

// 1. CONTENT DICTIONARY: This holds the info for every popup
const popupContentMap: Record<string, { title: string; content: React.ReactNode }> = {
  // Company
  'About Us': {
    title: 'About Mockzy',
    content: <p className="space-y-4">Mockzy was founded with a single mission: to democratize high-quality test preparation. We leverage advanced analytics and expertly curated content to give every student a fair shot at top engineering and medical institutions. Our team consists of IIT and AIIMS alumni dedicated to your success.</p>
  },
  'How It Works': {
    title: 'How Mockzy Works',
    content: <p className="space-y-4">1. <b>Sign Up:</b> Create a free account.<br/>2. <b>Select Exam:</b> Choose JEE or NEET.<br/>3. <b>Practice:</b> Take chapter-wise or full-length mocks.<br/>4. <b>Analyze:</b> Review detailed solutions and identify weak points using our AI analytics.</p>
  },
  'Success Stories': {
    title: 'Student Success Stories',
    content: <p className="space-y-4">We are currently compiling success stories from our latest batch of top rankers! Check back soon to read how Mockzy students improved their scores by an average of 40% within 3 months of consistent practice.</p>
  },
  'Pricing': {
    title: 'Simple, Transparent Pricing',
    content: <p className="space-y-4">We believe in transparent pricing. Currently, basic chapter-wise practice is free. Premium mock tests with detailed analytics and All-India Rank prediction are available through affordable exam-specific passes. Create an account to view customized pricing for your target exam.</p>
  },
  'Blog': {
    title: 'Mockzy Blog',
    content: <p className="space-y-4">Our blog is currently under construction. Soon, you will find expert tips on time management, subject-wise strategy, and the latest NTA exam updates right here.</p>
  },
  'Careers': {
    title: 'Join the Mockzy Team',
    content: <p className="space-y-4">We are always looking for passionate educators, full-stack developers, and content creators. If you want to revolutionize EdTech, send your resume to <b>ajay.phogat@mockzy.co.in</b>.</p>
  },
  
  // Support
  'Help Center': {
    title: 'Help Center',
    content: <p className="space-y-4">Need assistance? You can reach out to our support team 24/7. Whether it is a technical issue, a doubt in a question, or a billing inquiry, we are here to help. Email us directly at support@mockzy.co.in.</p>
  },
  'Contact Us': {
    title: 'Contact Us',
    content: <p className="space-y-4"><b>Email:</b> ajay.phogat@mockzy.co.in<br/><b>Location:</b> Delhi, India<br/><br/>Our support hours are Monday to Saturday, 10:00 AM to 7:00 PM IST.</p>
  },
  'FAQs': {
    title: 'Frequently Asked Questions',
    content: <p className="space-y-4"><b>Q: Are the mock tests updated for 2026?</b><br/>A: Yes, all questions adhere strictly to the latest NTA syllabus.<br/><br/><b>Q: Can I take tests on mobile?</b><br/>A: Yes, Mockzy is fully responsive, though we recommend a desktop for full-length exams to simulate the real environment.</p>
  },
  'System Status': {
    title: 'System Status',
    content: <p className="space-y-4 flex items-center gap-2"><span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span> All systems are operational. Exam engines and analytics databases are running smoothly.</p>
  },
  'Report Issue': {
    title: 'Report an Issue',
    content: <p className="space-y-4">Found a bug or an error in a question? Please email the question ID or screenshot to support@mockzy.co.in. We reward students who find genuine errors in our content!</p>
  },
  'Community Forum': {
    title: 'Community Forum',
    content: <p className="space-y-4">Our community discord server is launching soon! You will be able to discuss questions, share strategies, and interact with rankers.</p>
  },

  // Legal
  'Privacy Policy': {
    title: 'Privacy Policy',
    content: <p className="space-y-4 text-sm text-gray-400">Your privacy is crucial to us. Mockzy collects minimal necessary data (name, email, test scores) to provide personalized analytics. We do not sell your personal data to third-party marketers. For full details or data deletion requests, please contact our administrative team.</p>
  },
  'Terms of Service': {
    title: 'Terms of Service',
    content: <p className="space-y-4 text-sm text-gray-400">By using Mockzy, you agree to engage in fair academic practices. The content provided is for personal preparation only and may not be redistributed or scraped. Mockzy reserves the right to suspend accounts utilizing automated bots or unauthorized sharing.</p>
  },
  'Refund Policy': {
    title: 'Refund Policy',
    content: <p className="space-y-4 text-sm text-gray-400">We offer a 3-day money-back guarantee on unused premium mock test packages. If you have attempted less than 2 premium tests and are unsatisfied, email us for a no-questions-asked refund.</p>
  },
  'Cookie Policy': {
    title: 'Cookie Policy',
    content: <p className="space-y-4 text-sm text-gray-400">Mockzy uses essential cookies to keep you logged in and track your test progress securely. We use anonymous analytics cookies to improve platform performance. You can manage your cookie preferences through your browser settings.</p>
  },
  'Academic Integrity': {
    title: 'Academic Integrity',
    content: <p className="space-y-4 text-sm text-gray-400">We simulate strict exam environments. Attempting to circumvent our anti-cheat mechanisms (tab switching, screenshots) will result in test invalidation. Practice honestly to ensure accurate rank predictions.</p>
  },
  'Disclaimer': {
    title: 'Disclaimer',
    content: <p className="space-y-4 text-sm text-gray-400">Mockzy is an independent test preparation platform and is not officially affiliated with NTA, IITs, or AIIMS. Ranks predicted by our AI are estimates based on historical data and do not guarantee actual exam performance.</p>
  }
}

const footerSections: FooterSection[] = [
  {
    title: 'Exams',
    icon: <BookOpen className="w-4 h-4" />,
    links: [
      { label: 'JEE Main Mocks', href: '/exams' },
      { label: 'JEE Advanced Mocks', href: '/exams' },
      { label: 'NEET UG Mocks', href: '/exams' },
      { label: 'Class 11th Practice', href: '/exams' },
      { label: 'Class 12th Practice', href: '/exams' },
      { label: 'All Mock Tests', href: '/exams' }
    ]
  },
  {
    title: 'Company',
    icon: <Briefcase className="w-4 h-4" />,
    links: [
      { label: 'About Us', href: '#' },
      { label: 'How It Works', href: '#' },
      { label: 'Success Stories', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' }
    ]
  },
  {
    title: 'Support',
    icon: <HelpCircle className="w-4 h-4" />,
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'Contact Us', href: '#' },
      { label: 'FAQs', href: '#' },
      { label: 'System Status', href: '#' },
      { label: 'Report Issue', href: '#' },
      { label: 'Community Forum', href: '#' }
    ]
  },
  {
    title: 'Legal',
    icon: <Shield className="w-4 h-4" />,
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Refund Policy', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'Academic Integrity', href: '#' },
      { label: 'Disclaimer', href: '#' }
    ]
  }
]

const socialLinks = [
  { icon: <Facebook className="w-5 h-5" />, href: '#', label: 'Facebook', color: 'hover:bg-blue-600' },
  { icon: <Twitter className="w-5 h-5" />, href: '#', label: 'Twitter', color: 'hover:bg-sky-500' },
  { icon: <Instagram className="w-5 h-5" />, href: '#', label: 'Instagram', color: 'hover:bg-pink-600' },
  { icon: <Linkedin className="w-5 h-5" />, href: '#', label: 'LinkedIn', color: 'hover:bg-blue-700' },
  { icon: <Youtube className="w-5 h-5" />, href: '#', label: 'YouTube', color: 'hover:bg-red-600' }
]

const contactInfo = [
  {
    icon: <Mail className="w-5 h-5" />,
    label: 'Email',
    value: 'ajay.phogat@mockzy.co.in',
    href: 'mailto:ajay.phogat@mockzy.co.in'
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    label: 'Address',
    value: 'Delhi, India',
    href: null
  }
]

const guarantees = [
  { icon: <Target className="w-8 h-8 mb-3" />, title: '100% NTA Aligned', desc: 'Latest exam patterns' },
  { icon: <Zap className="w-8 h-8 mb-3" />, title: 'Instant Results', desc: 'Zero waiting time' },
  { icon: <BarChart3 className="w-8 h-8 mb-3" />, title: 'Deep Analytics', desc: 'Weak-point tracking' },
  { icon: <Award className="w-8 h-8 mb-3" />, title: 'Rank Predictor', desc: 'Know where you stand' }
]

export function Footer() {
  // 2. DIALOG STATE
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogContent, setDialogContent] = useState({ title: '', content: <></> })

  // 3. HANDLER FUNCTION
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, label: string, href: string) => {
    // If the link label exists in our popup dictionary, open the dialog instead of routing
    if (popupContentMap[label]) {
      e.preventDefault()
      setDialogContent(popupContentMap[label])
      setIsDialogOpen(true)
    }
    // Otherwise, allow normal Next.js Link navigation (for Exam links)
  }

  return (
    <>
      <footer className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white overflow-hidden">
        
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '4rem 4rem'
            }}
          />
        </div>

        {/* Main footer content */}
        <div className="relative">
          
          {/* Platform Guarantees Bar */}
          <div className="border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {guarantees.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center group">
                    <div className="text-blue-400 group-hover:scale-110 group-hover:text-cyan-400 transition-all duration-300">
                      {item.icon}
                    </div>
                    <h4 className="text-lg font-bold text-gray-200 mb-1">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main footer sections */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8">
              
              {/* Brand column */}
              <div className="lg:col-span-2 space-y-6">
                <Link href="/" className="flex items-center gap-3 group">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg">
                      <GraduationCap className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <span className="text-2xl font-bold">Mockzy</span>
                </Link>

                <p className="text-gray-400 leading-relaxed text-sm pr-4">
                  Your trusted companion for JEE and NEET preparation. Practice with expert-curated mock tests, track your performance, and achieve your target rank.
                </p>

                <div className="space-y-3">
                  {contactInfo.map((contact, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm group">
                      <div className="text-blue-400 mt-0.5 group-hover:scale-110 transition-transform">
                        {contact.icon}
                      </div>
                      {contact.href ? (
                        <a href={contact.href} className="text-gray-400 hover:text-white transition-colors">
                          <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{contact.label}</span>
                          {contact.value}
                        </a>
                      ) : (
                        <div className="text-gray-400">
                          <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{contact.label}</span>
                          {contact.value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  {socialLinks.map((social, idx) => (
                    <a
                      key={idx}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-10 h-10 rounded-lg bg-gray-800/50 border border-gray-700 flex items-center justify-center text-gray-400 ${social.color} hover:text-white hover:border-transparent transition-all duration-300 hover:scale-110 hover:shadow-lg`}
                      aria-label={social.label}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>

              {/* Link sections */}
              {footerSections.map((section, idx) => (
                <div key={idx} className="space-y-5">
                  <div className="flex items-center gap-2 text-white font-semibold text-lg">
                    <div className="text-blue-400">
                      {section.icon}
                    </div>
                    <h3>{section.title}</h3>
                  </div>
                  <ul className="space-y-3">
                    {section.links.map((link, linkIdx) => (
                      <li key={linkIdx}>
                        {/* 4. UPDATED LINK WITH ONCLICK HANDLER */}
                        <Link
                          href={link.href}
                          onClick={(e) => handleLinkClick(e, link.label, link.href)}
                          className="text-gray-400 hover:text-blue-400 transition-colors text-sm flex items-center gap-2 group cursor-pointer"
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

          {/* Bottom bar */}
          <div className="border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-400 text-center md:text-left">
                  <p className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    <span>© 2026 Mockzy. All rights reserved.</span>
                    <span className="hidden md:inline text-gray-600">•</span>
                    <span className="flex items-center gap-1">
                      Made with <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" /> in India
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                  <span onClick={(e) => handleLinkClick(e as any, 'Privacy Policy', '#')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Privacy</span>
                  <span onClick={(e) => handleLinkClick(e as any, 'Terms of Service', '#')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">Terms</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 hover:scale-110 flex items-center justify-center group z-50 border border-blue-400/20"
          aria-label="Scroll to top"
        >
          <ArrowRight className="w-5 h-5 -rotate-90 group-hover:-translate-y-1 transition-transform" />
        </button>
      </footer>

      {/* 5. RENDER THE DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Info className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl text-gray-900 dark:text-white">
                {dialogContent.title}
              </DialogTitle>
            </div>
            <ScrollArea className="max-h-[60vh] pr-4">
              <DialogDescription className="text-gray-600 dark:text-gray-300 text-base leading-relaxed pt-2">
                {dialogContent.content}
              </DialogDescription>
            </ScrollArea>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}