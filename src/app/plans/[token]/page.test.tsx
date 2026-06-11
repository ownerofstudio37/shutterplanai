/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'abc123' }),
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('shared plan page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shared plan snapshot from API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          plan_data: {
            projectTitle: 'Engagement Sunset Plan',
            creativeDirection: 'Warm cinematic storytelling',
            locationSuggestions: [{ name: 'Lake Pier', whyItWorks: 'Open sunset view' }],
            shotList: [{ title: 'Wide Hero', description: 'Couple at edge of pier', location: 'Lake Pier' }],
          },
          metadata: {
            shootType: 'Engagement Session',
            city: 'Dallas, TX',
          },
        }),
      })
    );

    const SharedPlanPage = (await import('./page')).default;
    render(<SharedPlanPage />);

    await waitFor(() => {
      expect(screen.getByText('Engagement Sunset Plan')).toBeInTheDocument();
    });

    expect(screen.getByText('Warm cinematic storytelling')).toBeInTheDocument();
    expect(screen.getByText('Wide Hero')).toBeInTheDocument();
    expect(screen.getAllByText('Lake Pier').length).toBeGreaterThanOrEqual(1);
  });
});
