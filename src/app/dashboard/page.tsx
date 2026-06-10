'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">12</div>
            <p className="text-gray-600 mt-2">Active Projects</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600">48</div>
            <p className="text-gray-600 mt-2">Total Shots Planned</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600">8</div>
            <p className="text-gray-600 mt-2">Completed Projects</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
          <div className="space-y-3">
            {[
              { name: 'Summer Campaign 2024', date: 'Jun 10, 2024' },
              { name: 'Wedding Photography', date: 'May 28, 2024' },
              { name: 'Product Shoot', date: 'May 15, 2024' },
            ].map((project, idx) => (
              <div key={idx} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                <span className="text-gray-700">{project.name}</span>
                <span className="text-sm text-gray-500">{project.date}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/projects">
            <Button variant="ghost" className="mt-4 w-full">
              View All Projects →
            </Button>
          </Link>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/projects/new">
              <Button variant="primary" className="w-full text-left">
                ✨ Create New Project
              </Button>
            </Link>
            <Link href="/dashboard/shots/new">
              <Button variant="secondary" className="w-full text-left">
                📸 Plan New Shot
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="secondary" className="w-full text-left">
                ⚙️ Settings
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Shoots</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 font-semibold">Project</th>
                <th className="text-left py-2 px-4 font-semibold">Date</th>
                <th className="text-left py-2 px-4 font-semibold">Shots</th>
                <th className="text-left py-2 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Summer Campaign</td>
                <td className="py-3 px-4">Jun 15, 2024</td>
                <td className="py-3 px-4">12</td>
                <td className="py-3 px-4">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Planning
                  </span>
                </td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Product Photos</td>
                <td className="py-3 px-4">Jun 12, 2024</td>
                <td className="py-3 px-4">8</td>
                <td className="py-3 px-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    In Progress
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
