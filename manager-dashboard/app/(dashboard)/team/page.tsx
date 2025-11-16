'use client';

/**
 * Team List Page
 *
 * Displays list of all team members with search/filter capabilities
 * Uses Tremor Table for clean, simple design
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getUsersList } from '@/lib/api';
import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Title,
  TextInput,
  Button,
  Badge,
  Flex,
} from '@tremor/react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';

// Role badge color mapping
const ROLE_COLORS = {
  rep: 'blue',
  area_manager: 'green',
  zonal_head: 'orange',
  national_head: 'purple',
  admin: 'gray',
} as const;

// Role display names
const ROLE_NAMES = {
  rep: 'Sales Rep',
  area_manager: 'Area Manager',
  zonal_head: 'Zonal Head',
  national_head: 'National Head',
  admin: 'Admin',
} as const;

export default function TeamPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch users list
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsersList({}),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter users based on search and status
  const filteredUsers = data?.users?.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery) ||
      user.territory?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-[#393735] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Title className="text-2xl font-bold text-[#C9A961] mb-1">Team Members</Title>
              <p className="text-gray-400 text-sm">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'member' : 'members'}
                {statusFilter !== 'all' && ` (${statusFilter})`}
              </p>
            </div>
            <Button
              icon={PlusIcon}
              onClick={() => router.push('/team/add')}
              className="bg-[#C9A961] hover:bg-[#D4AF37]"
            >
              Add User
            </Button>
          </Flex>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          {/* Search and Filters */}
          <div className="mb-6">
            <Flex className="gap-4" flexDirection="col" alignItems="stretch">
              {/* Search Bar */}
              <TextInput
                icon={MagnifyingGlassIcon}
                placeholder="Search by name, phone, or territory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />

              {/* Status Filter Pills */}
              <Flex className="gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === 'all'
                      ? 'bg-[#C9A961] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === 'active'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === 'inactive'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Inactive
                </button>
              </Flex>
            </Flex>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A961] mx-auto mb-4" />
              <p className="text-gray-600">Loading team members...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800 font-medium">Failed to load team members</p>
              <p className="text-red-600 text-sm mt-1">{error.toString()}</p>
            </div>
          )}

          {/* Table */}
          {!isLoading && !error && (
            <>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No team members found</p>
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                      <TableHeaderCell>Phone</TableHeaderCell>
                      <TableHeaderCell>Territory</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Created</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        onClick={() => router.push(`/team/${user.id}`)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <Badge color={ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}>
                            {ROLE_NAMES[user.role as keyof typeof ROLE_NAMES] || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>{user.territory || '-'}</TableCell>
                        <TableCell>
                          <Badge color={user.isActive ? 'green' : 'red'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {/* TODO: Format createdAt timestamp */}
                          -
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
