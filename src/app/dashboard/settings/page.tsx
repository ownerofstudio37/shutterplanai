'use client';

import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Settings</h3>
        <p className="text-sm text-gray-600">
          Account and workspace settings will be added in the next iteration.
        </p>
      </Card>
    </div>
  );
}
