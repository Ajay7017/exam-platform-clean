// src/types/navigation.ts
import { LucideIcon } from 'lucide-react';

// Navigation item structure
export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon; // ✅ FIXED: Changed from 'any' to 'LucideIcon'
  badge?: string;
}

// Sidebar navigation group
export interface NavGroup {
  title?: string; // Made optional for groups without titles
  items: NavItem[];
}

// Footer column structure
export interface FooterColumn {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
}

// User info for navbar
export interface UserInfo {
  name: string;
  email: string;
  avatar?: string;
  role: 'student' | 'admin';
}