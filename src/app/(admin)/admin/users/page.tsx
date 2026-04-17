// src/app/(admin)/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, UserPlus, Edit, Trash2, Mail, Calendar, Loader2, X, Sparkles, ShieldCheck, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  examsTaken: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSystemCleanup = async () => {
    if (!confirm("Wipe all 'Stress Bots' and test accounts?")) return;
    setIsCleaning(true);
    try {
      const res = await fetch('/api/admin/users/cleanup', { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Cleanup successful');
      fetchUsers();
    } catch { toast.error('Cleanup failed'); } finally { setIsCleaning(false); }
  };

  // NEW FEATURE: Bulk Role Update
  const handleBulkRoleUpdate = async (newRole: string) => {
    setIsBulkActionLoading(true);
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedUserIds), role: newRole }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Updated ${selectedUserIds.size} users to ${newRole}`);
      setSelectedUserIds(new Set());
      fetchUsers();
    } catch { toast.error('Failed to update roles'); } finally { setIsBulkActionLoading(false); }
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleBulkDelete = async () => {
    const idsArray = Array.from(selectedUserIds);
    setIsBulkActionLoading(true);
    let deletedCount = 0;
    const chunkSize = 50;

    try {
      for (let i = 0; i < idsArray.length; i += chunkSize) {
        const chunk = idsArray.slice(i, i + chunkSize);
        const res = await fetch('/api/admin/users/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk }),
        });
        if (!res.ok) throw new Error();
        deletedCount += chunk.length;
        if (idsArray.length > chunkSize) toast.info(`Deleting batch... ${deletedCount}/${idsArray.length}`);
      }
      toast.success(`Deleted ${deletedCount} users`);
      setSelectedUserIds(new Set());
      setBulkDeleteDialogOpen(false);
      fetchUsers();
    } catch { toast.error('Partial failure during batch delete'); } finally { setIsBulkActionLoading(false); }
  };

  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-500">Manage {users.length} registered students and admins.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSystemCleanup} disabled={isCleaning} className="text-amber-600 border-amber-200 hover:bg-amber-50">
            {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Cleanup Bots
          </Button>
          <Button className="bg-blue-600"><UserPlus className="mr-2 h-4 w-4" />Add User</Button>
        </div>
      </div>

      {/* NEW: Filter Bar */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Students Only</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Sticky Action Bar */}
      {selectedUserIds.size > 0 && (
        <div className="sticky top-4 z-20 flex items-center gap-3 bg-white border border-blue-200 shadow-xl rounded-xl px-5 py-4 animate-in slide-in-from-top-4">
          <Badge className="bg-blue-600 text-white px-3 py-1">{selectedUserIds.size} Selected</Badge>
          <div className="h-4 w-px bg-gray-200 mx-2" />
          
          {/* MORE FEATURE: Bulk Role Actions */}
          <Button size="sm" variant="outline" onClick={() => handleBulkRoleUpdate('admin')} disabled={isBulkActionLoading}>
            <ShieldCheck className="w-4 h-4 mr-1 text-red-500" /> Make Admin
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkRoleUpdate('student')} disabled={isBulkActionLoading}>
            <UserCircle className="w-4 h-4 mr-1 text-blue-500" /> Make Student
          </Button>
          
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteDialogOpen(true)} disabled={isBulkActionLoading}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete Batch
          </Button>
          
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedUserIds(new Set())}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="w-12">
                <input type="checkbox" className="rounded border-gray-300" checked={isAllSelected} onChange={() => isAllSelected ? setSelectedUserIds(new Set()) : setSelectedUserIds(new Set(filteredUsers.map(u => u.id)))} />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Exams</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className={selectedUserIds.has(user.id) ? 'bg-blue-50/40' : ''}>
                <TableCell><input type="checkbox" className="rounded border-gray-300" checked={selectedUserIds.has(user.id)} onChange={() => { const s = new Set(selectedUserIds); s.has(user.id) ? s.delete(user.id) : s.add(user.id); setSelectedUserIds(s); }} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarFallback>{user.name?.[0].toUpperCase()}</AvatarFallback></Avatar>
                    <div className="flex flex-col text-sm"><span className="font-semibold">{user.name}</span><span className="text-gray-400 text-xs">{user.id.slice(-6)}</span></div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                <TableCell><Badge variant="secondary" className={user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>{user.role}</Badge></TableCell>
                <TableCell className="text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="font-bold">{user.examsTaken}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedUserIds(new Set([user.id])); setBulkDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedUserIds.size} User(s)?</AlertDialogTitle>
            <AlertDialogDescription>This wipes all attempts and data. Cannot be reversed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkActionLoading} className="bg-red-600">{isBulkActionLoading ? 'Processing...' : 'Confirm Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}