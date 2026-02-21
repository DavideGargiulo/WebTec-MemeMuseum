import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:4200');
});

test.describe('Authentication', () => {
  test('Should be able to navigate to login and authenticate successfully', async ({ page }) => {
    await page.getByRole('link', { name: 'Accedi / Registrati' }).click();
    await expect(page).toHaveURL('http://localhost:4200/login');
    await page.getByLabel('Indirizzo Email').fill('gargiulodavide0@gmail.com');
    await page.getByLabel('Password').fill('password123');
    const loginResponsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/login') && response.status() === 200
    );
    await page.getByRole('button', { name: 'Sign in' }).click();
    await loginResponsePromise;
    await expect(page).toHaveURL('http://localhost:4200/');
    const toast = page.locator('p.text-sm', { hasText: 'Login effettuato con successo!' });
    await expect(toast).toBeVisible();
    await expect(page.locator('header').getByText('Davideh')).toBeVisible();
    await expect(page.getByText('Accedi')).not.toBeVisible();
    const userStorage = await page.evaluate(() => window.localStorage.getItem('meme_user'));
    expect(userStorage).toBeTruthy();
    expect(userStorage).toContain('gargiulodavide0@gmail.com');
  });

  test('Should not allow user to login with incorrect credentials', async ({ page }) => {
    await page.getByRole('link', { name: 'Accedi / Registrati' }).click();
    await expect(page).toHaveURL('http://localhost:4200/login');
    await page.getByLabel('Indirizzo Email').fill('gargiulodavide0@gmail.com');
    await page.getByLabel('Password').fill('password_sbagliata');
    const loginResponsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/login') && response.status() === 401
    );
    await page.getByRole('button', { name: 'Sign in' }).click();
    await loginResponsePromise;
    await expect(page).toHaveURL('http://localhost:4200/login');
    const toast = page.locator('p.text-sm', { hasText: 'Login fallito: Credenziali errate' });
    await expect(toast).toBeVisible();
  });
});

test.describe('Meme of the Day', () => {
  test('Should navigate to Meme of the Day, and if present, open it and verify details', async ({ page }) => {
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/memes/meme-of-the-day') && response.request().method() === 'GET'
    );
    await page.getByRole('link', { name: 'Meme del Giorno' }).click();
    await expect(page).toHaveURL('http://localhost:4200/meme-of-the-day');
    const response = await responsePromise;
    const json = await response.json();
    if (json.data && json.data !== null) {
      await expect(page.locator('h2', { hasText: json.data.title })).toBeVisible();
      const vediCommentaBtn = page.getByRole('button', { name: /Vedi e Commenta/i });
      await expect(vediCommentaBtn).toBeVisible();
      await vediCommentaBtn.click();
      await expect(page).toHaveURL(`http://localhost:4200/viewmeme/${json.data.id}`);
      await expect(page.locator('h1', { hasText: json.data.title })).toBeVisible();
      await expect(page.locator('p', { hasText: json.data.description })).toBeVisible();
      const memeImage = page.getByRole('img', { name: json.data.title });
      await expect(memeImage).toBeVisible();
      if (json.data.tags && json.data.tags.length > 0) {
        for (const tag of json.data.tags) {
          await expect(page.getByText(`#${tag.name}`)).toBeVisible();
        }
      }
    } else {
      await expect(page.getByRole('heading', { name: 'Nessun meme oggi!' })).toBeVisible();
      await expect(page.getByText('La giornata è appena iniziata')).toBeVisible();
      await expect(page.getByRole('button', { name: /Vedi e Commenta/i })).not.toBeVisible();
    }
  });
});

test.describe('Voting System', () => {
  test('Should not allow upvoting or downvoting from the home page Meme Card', async ({ page }) => {
    await page.goto('http://localhost:4200/');
    const firstCard = page.locator('app-meme-card').first();
    await expect(firstCard).toBeVisible();
    const toast = page.locator('p.text-sm', { hasText: 'Devi essere loggato per votare un meme' });
    const upvoteIcon = firstCard.locator('lucide-icon').first();
    await upvoteIcon.click();
    await expect(toast).toBeVisible();
    await expect(toast).not.toBeVisible();
    const downvoteIcon = firstCard.locator('lucide-icon').nth(1);
    await downvoteIcon.click();
    await expect(toast).toBeVisible();
    await expect(page).toHaveURL('http://localhost:4200/');
  });

  test('Should navigate to view-meme and block guest from upvoting and downvoting', async ({ page }) => {
    const firstCard = page.locator('app-meme-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.locator('.cursor-pointer').first().click();
    await expect(page).toHaveURL(/.*\/viewmeme\/.+/);
    await expect(page.locator('app-view-meme h1')).toBeVisible();
    const toast = page.locator('p.text-sm', { hasText: 'Devi accedere per poter votare un meme!' });
    const upvoteButton = page.locator('app-view-meme button').first();
    await upvoteButton.click();
    await expect(toast).toBeVisible();
    await expect(toast).not.toBeVisible();
    const downvoteButton = page.locator('app-view-meme button').nth(1);
    await downvoteButton.click();
    await expect(toast).toBeVisible();
  });
});

test.describe('Search Functionality - Parameterized & Dynamic', () => {
  const TAG_CASES = ['doggo', 'asdasdasd'] as const;

  for (const tag of TAG_CASES) {
    test(`Should search by tag ONLY: "${tag}" and handle results dynamically`, async ({ page }) => {
      const searchResponsePromise = page.waitForResponse(response => 
        response.url().includes('/api/memes/search') && response.request().method() === 'GET'
      );
      const searchInput = page.getByPlaceholder('Cerca per tag...');
      await searchInput.fill(tag);
      await searchInput.press('Enter');
      await expect(page).toHaveURL(new RegExp(`.*\/search\\?tags=${tag}`));
      await expect(page.locator('h1', { hasText: 'Risultati di ricerca' })).toBeVisible();
      await expect(page.getByText(`#${tag}`)).toBeVisible();
      const response = await searchResponsePromise;
      const json = await response.json();

      if (json.data && json.data.length > 0) {
        const firstMemeData = json.data[0];
        const firstCard = page.locator('app-meme-card').first();
        await expect(firstCard).toBeVisible();
        await firstCard.locator('.cursor-pointer').first().click();
        await expect(page).toHaveURL(new RegExp(`.*\/viewmeme\/${firstMemeData.id}`));
        await expect(page.locator('app-view-meme h1', { hasText: firstMemeData.title })).toBeVisible();
        await expect(page.getByText(firstMemeData.user.username).first()).toBeVisible();
      } else {
        await expect(page.locator('h2', { hasText: 'Nessun meme trovato' })).toBeVisible();
        await expect(page.getByText('Non abbiamo trovato nessun meme corrispondente')).toBeVisible();
        const homeButton = page.getByRole('button', { name: 'Torna alla Home' });
        await expect(homeButton).toBeVisible();
        await homeButton.click();
        await expect(page).toHaveURL('http://localhost:4200/');
      }
    });
  }

  const DATE_CASES = ['2026-02-20', '2000-01-01'] as const;

  for (const date of DATE_CASES) {
    test(`Should search by date ONLY: "${date}" and handle results dynamically`, async ({ page }) => {
      const searchResponsePromise = page.waitForResponse(response => 
        response.url().includes('/api/memes/search') && response.request().method() === 'GET'
      );
      const dateInput = page.locator('input[type="date"]');
      await dateInput.fill(date); 
      await expect(page).toHaveURL(new RegExp(`.*\/search\\?startDate=${date}&endDate=${date}`));
      await expect(page.locator('h1', { hasText: 'Risultati di ricerca' })).toBeVisible();
      await expect(page.getByText('Data:')).toBeVisible();
      const response = await searchResponsePromise;
      const json = await response.json();
      if (json.data && json.data.length > 0) {
        const firstMemeData = json.data[0];
        const firstCard = page.locator('app-meme-card').first();
        await expect(firstCard).toBeVisible();
        await firstCard.locator('.cursor-pointer').first().click();
        await expect(page).toHaveURL(new RegExp(`.*\/viewmeme\/${firstMemeData.id}`));
        await expect(page.locator('app-view-meme h1', { hasText: firstMemeData.title })).toBeVisible();
        await expect(page.getByText(firstMemeData.user.username).first()).toBeVisible();
      } else {
        await expect(page.locator('h2', { hasText: 'Nessun meme trovato' })).toBeVisible();
        await expect(page.getByText('Non abbiamo trovato nessun meme corrispondente')).toBeVisible();
        const homeButton = page.getByRole('button', { name: 'Torna alla Home' });
        await expect(homeButton).toBeVisible();
        await homeButton.click();
        await expect(page).toHaveURL('http://localhost:4200/');
      }
    });
  }

  const COMBINED_CASES = [
    { tag: 'doggo', date: '2026-02-20' },
    { tag: 'gatti', date: '2000-01-01' }
  ];

  for (const scenario of COMBINED_CASES) {
    test(`Should search by BOTH tag "${scenario.tag}" and date "${scenario.date}"`, async ({ page }) => {
      const searchResponsePromise = page.waitForResponse(response => 
        response.url().includes('/api/memes/search') && response.request().method() === 'GET'
      );
      const searchInput = page.getByPlaceholder('Cerca per tag...');
      await searchInput.fill(scenario.tag);
      const dateInput = page.locator('input[type="date"]');
      await dateInput.fill(scenario.date);
      await expect(page).toHaveURL(new RegExp(`.*\/search\\?tags=${scenario.tag}&startDate=${scenario.date}&endDate=${scenario.date}`));
      await expect(page.locator('h1', { hasText: 'Risultati di ricerca' })).toBeVisible();
      await expect(page.getByText(`#${scenario.tag}`)).toBeVisible();
      await expect(page.getByText('Data:')).toBeVisible();
      const response = await searchResponsePromise;
      const json = await response.json();
      if (json.data && json.data.length > 0) {
        const firstMemeData = json.data[0];
        const firstCard = page.locator('app-meme-card').first();
        await expect(firstCard).toBeVisible();
        await firstCard.locator('.cursor-pointer').first().click();
        await expect(page).toHaveURL(new RegExp(`.*\/viewmeme\/${firstMemeData.id}`));
        await expect(page.locator('app-view-meme h1', { hasText: firstMemeData.title })).toBeVisible();
        await expect(page.getByText(firstMemeData.user.username).first()).toBeVisible();
      } else {
        await expect(page.locator('h2', { hasText: 'Nessun meme trovato' })).toBeVisible();
        await expect(page.getByText('Non abbiamo trovato nessun meme corrispondente')).toBeVisible();
        const homeButton = page.getByRole('button', { name: 'Torna alla Home' });
        await expect(homeButton).toBeVisible();
        await homeButton.click();
        await expect(page).toHaveURL('http://localhost:4200/');
      }
    });
  }
});