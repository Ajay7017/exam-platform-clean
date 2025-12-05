// src/components/layout/Footer.tsx
import Link from 'next/link';
import { BookOpen, Facebook, Twitter, Instagram, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  const footerColumns = [
    {
      title: 'Product',
      links: [
        { label: 'Browse Exams', href: '/exams' },
        { label: 'Features', href: '/#features' },
        { label: 'Pricing', href: '/#pricing' },
        { label: 'How it Works', href: '/#how-it-works' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Careers', href: '/careers' },
        { label: 'Blog', href: '/blog' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Study Guides', href: '/guides' },
        { label: 'Community', href: '/community' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'Refund Policy', href: '/refunds' },
      ],
    },
  ];

  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand Column - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500 text-white">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-gray-900">ExamPro</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600 max-w-xs">
              Master your GATE & SSC exams with our comprehensive platform. 
              Practice with 200,000+ questions and achieve your dreams.
            </p>
            {/* Social Links */}
            <div className="mt-6 flex items-center gap-4">
              <Link
                href="https://facebook.com"
                target="_blank"
                className="text-gray-400 transition-colors hover:text-primary-500"
              >
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                className="text-gray-400 transition-colors hover:text-primary-500"
              >
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link
                href="https://instagram.com"
                target="_blank"
                className="text-gray-400 transition-colors hover:text-primary-500"
              >
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link
                href="https://linkedin.com"
                target="_blank"
                className="text-gray-400 transition-colors hover:text-primary-500"
              >
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>

          {/* Link Columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-gray-900">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 transition-colors hover:text-primary-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div className="text-center md:text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                Subscribe to our newsletter
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Get exam tips, study guides, and exclusive offers.
              </p>
            </div>
            <div className="flex w-full max-w-md gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600">
                <Mail className="h-4 w-4" />
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t pt-8 text-center text-sm text-gray-600">
          <p>
            © {new Date().getFullYear()} ExamPro. All rights reserved. Made with ❤️ in India.
          </p>
        </div>
      </div>
    </footer>
  );
}