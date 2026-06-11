import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const dashboardRoutes = [
  '/dashboard',
  '/dashboard/planner',
  '/dashboard/projects',
  '/dashboard/locations',
  '/dashboard/calendar',
  '/dashboard/shots',
  '/dashboard/shot-board',
  '/dashboard/settings',
];

async function createTestSession(request: APIRequestContext) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `e2e-${unique}@shutterplan.ai`;
  const password = 'E2eTest123!';
  const response = await request.post('/api/auth/signup', {
    data: {
      email,
      password,
      name: 'E2E Tester',
    },
  });
  const body = (await response.json()) as {
    success?: boolean;
    data?: {
      token?: string;
    };
    error?: string;
  };

  expect(response.ok(), body.error).toBe(true);
  expect(body.success, body.error).toBe(true);
  expect(body.data?.token).toBeTruthy();

  return {
    email,
    password,
    token: body.data!.token!,
  };
}

async function seedAuth(page: Page, token: string) {
  await page.addInitScript(authToken => {
    window.localStorage.setItem('auth_token', authToken);
  }, token);
}

async function expectUsableViewport(page: Page) {
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const smallControls = [...document.querySelectorAll('button,input,select,textarea')]
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.textContent?.trim() ||
            element.getAttribute('aria-label') ||
            element.getAttribute('placeholder') ||
            element.tagName,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(control => control.width > 0 && control.height > 0 && (control.width < 40 || control.height < 40));

    return {
      hasHorizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
      smallControls,
    };
  });

  expect(result.hasHorizontalOverflow).toBe(false);
  expect(result.smallControls).toEqual([]);
}

test.describe('public entry points', () => {
  test('render without viewport regressions', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /open your workspace/i })).toBeVisible();
    await expectUsableViewport(page);

    await page.goto('/auth/signup');
    await expect(page.getByRole('heading', { name: /build your first shoot plan/i })).toBeVisible();
    await expectUsableViewport(page);
  });
});

test.describe('auth forms', () => {
  test('support signup and login through the UI', async ({ browser, page }) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const email = `e2e-ui-${unique}@shutterplan.ai`;
    const password = 'E2eTest123!';

    await page.goto('/auth/signup');
    await page.getByPlaceholder('Jordan Lee').fill('E2E UI Tester');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('At least 8 characters').fill(password);
    await page.getByPlaceholder('Re-enter your password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const loginContext = await browser.newContext();
    const loginPage = await loginContext.newPage();
    await loginPage.goto('/auth/login');
    await loginPage.getByPlaceholder('you@example.com').fill(email);
    await loginPage.getByPlaceholder('Enter your password').fill(password);
    await loginPage.getByRole('button', { name: 'Sign in' }).click();
    await expect(loginPage).toHaveURL(/\/dashboard$/);
    await loginContext.close();
  });
});

test.describe('authenticated dashboard smoke', () => {
  test('renders core dashboard routes without mobile or desktop layout regressions', async ({ page, request }) => {
    const session = await createTestSession(request);
    await seedAuth(page, session.token);

    for (const route of dashboardRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}$`));
      await expect(page.getByText('Studio Ops')).toBeVisible();
      await expectUsableViewport(page);
    }
  });

  test('supports project and shot creation from the dashboard', async ({ page, request }) => {
    const session = await createTestSession(request);
    await seedAuth(page, session.token);
    const unique = Date.now().toString();
    const projectTitle = `E2E Project ${unique}`;
    const shotTitle = `E2E Shot ${unique}`;

    await page.goto('/dashboard/projects');
    await page.getByPlaceholder('Project title').fill(projectTitle);
    await page.getByPlaceholder('Client, shoot type, goal, deliverables...').fill('Smoke test project for dashboard workflow.');
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByText(projectTitle)).toBeVisible();

    await page.goto('/dashboard/shots');
    await page.getByPlaceholder('Shot title').fill(shotTitle);
    await page.getByPlaceholder('Shot description').fill('Smoke test shot for dashboard workflow.');
    await page.getByRole('button', { name: 'Add Shot' }).click();
    await expect(page.getByText(shotTitle)).toBeVisible();
  });
});

test.describe('planner generation and client guide access', () => {
  test('generates a plan through the API and opens the shared client guide', async ({ page, request }) => {
    const session = await createTestSession(request);
    const authHeaders = {
      Authorization: `Bearer ${session.token}`,
    };

    const planResponse = await request.post('/api/ai/session-plan', {
      headers: authHeaders,
      data: {
        shootType: 'Family Session',
        subjectDetails: '4 people, one toddler',
        city: 'Magnolia, TX',
        duration: '45 minutes',
        mood: 'Warm, candid, natural',
        mustHaveShots: 'Whole family, parents together, toddler solo',
        constraints: 'Short walking distances and quick transitions',
        locationMode: 'use-provided',
        providedLocations: ['Magnolia Stroll', 'Unity Park'],
      },
    });
    const planBody = (await planResponse.json()) as {
      success?: boolean;
      data?: Record<string, unknown>;
      error?: string;
    };

    expect(planResponse.ok(), planBody.error).toBe(true);
    expect(planBody.success, planBody.error).toBe(true);
    expect(planBody.data?.projectTitle).toBeTruthy();

    const exportResponse = await request.post('/api/planner/export', {
      headers: authHeaders,
      data: {
        plan: planBody.data,
        planMetadata: {
          shootType: 'Family Session',
          city: 'Magnolia, TX',
        },
      },
    });
    const exportBody = (await exportResponse.json()) as {
      success?: boolean;
      shareToken?: string;
      error?: string;
    };

    expect(exportResponse.ok(), exportBody.error).toBe(true);
    expect(exportBody.success, exportBody.error).toBe(true);
    expect(exportBody.shareToken).toBeTruthy();

    await page.goto(`/plans/${exportBody.shareToken}`);
    await expect(page.getByText(String(planBody.data?.projectTitle))).toBeVisible();
    await expectUsableViewport(page);
  });
});
