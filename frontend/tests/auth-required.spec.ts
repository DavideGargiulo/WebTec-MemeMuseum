import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:4200/login');
  await page.getByLabel('Indirizzo Email').fill('gargiulodavide0@gmail.com');
  await page.getByLabel('Password').fill('password123');
  const loginResponsePromise = page.waitForResponse(response => 
    response.url().includes('/api/auth/login') && response.status() === 200
  );
  await page.getByRole('button', { name: 'Sign in' }).click();
  await loginResponsePromise;
  await expect(page).toHaveURL('http://localhost:4200/');
});

test.describe('Voting System', () => {
  test('Should dynamically calculate and allow toggle of Upvotes and Downvotes on a meme', async ({ page }) => {
    const cards = page.locator('app-meme-card');
    await page.waitForLoadState('networkidle');

    const count = await cards.count();
    if (count === 0) {
      console.log('Nessun meme presente nel DB in Home, test saltato con successo.');
      return; 
    }
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();
    const upvoteIcon = firstCard.locator('lucide-icon.w-5').first();
    const downvoteIcon = firstCard.locator('lucide-icon.w-5').nth(1);
    const scoreElement = firstCard.locator('span.min-w-\\[20px\\]');
    
    const initialScoreText = await scoreElement.textContent();
    const initialScore = parseInt(initialScoreText?.trim() || '0');
    const isInitiallyUpvoted = await upvoteIcon.evaluate(el => el.classList.contains('text-accent'));
    const isInitiallyDownvoted = await downvoteIcon.evaluate(el => el.classList.contains('text-red-500'));

    const voteResponse1 = page.waitForResponse(res => res.url().includes('/vote') && res.request().method() === 'POST');
    await upvoteIcon.click();
    await voteResponse1;

    let expectedScoreAfterUpvote = initialScore;
    let expectedUpvotedState = true;
    let expectedDownvotedState = false;

    if (isInitiallyUpvoted) {
      expectedScoreAfterUpvote -= 1;
      expectedUpvotedState = false;
    } else if (isInitiallyDownvoted) {
      expectedScoreAfterUpvote += 2;
    } else {
      expectedScoreAfterUpvote += 1;
    }

    await expect(scoreElement).toHaveText(expectedScoreAfterUpvote.toString());
    
    await expect(async () => {
      const upvoted = await upvoteIcon.evaluate(el => el.classList.contains('text-accent'));
      expect(upvoted).toBe(expectedUpvotedState);
    }).toPass({ timeout: 5000 });

    await expect(async () => {
      const downvoted = await downvoteIcon.evaluate(el => el.classList.contains('text-red-500'));
      expect(downvoted).toBe(expectedDownvotedState);
    }).toPass({ timeout: 5000 });
    
    const voteResponse2 = page.waitForResponse(res => res.url().includes('/vote') && res.request().method() === 'POST');
    await downvoteIcon.click();
    await voteResponse2;

    let expectedScoreAfterDownvote = expectedScoreAfterUpvote;
    let expectedUpvotedState2 = false;
    let expectedDownvotedState2 = true;

    if (expectedDownvotedState) {
      expectedScoreAfterDownvote += 1; 
      expectedDownvotedState2 = false;
    } else if (expectedUpvotedState) {
      expectedScoreAfterDownvote -= 2;
    } else {
      expectedScoreAfterDownvote -= 1;
    }

    // Asserzioni Finali
    await expect(scoreElement).toHaveText(expectedScoreAfterDownvote.toString());
    
    await expect(async () => {
      const downvoted = await downvoteIcon.evaluate(el => el.classList.contains('text-red-500'));
      expect(downvoted).toBe(expectedDownvotedState2);
    }).toPass({ timeout: 5000 });

    await expect(async () => {
      const upvoted = await upvoteIcon.evaluate(el => el.classList.contains('text-accent'));
      expect(upvoted).toBe(expectedUpvotedState2);
    }).toPass({ timeout: 5000 });

  });
});

test.describe('Commenting System', () => {
  test('Should handle the complete commenting flow dynamically', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const cards = page.locator('app-meme-card');
    if (await cards.count() === 0) {
      console.log('Nessun meme presente nel DB. Test saltato.');
      return; 
    }
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();
    await firstCard.locator('.cursor-pointer').first().click();
    await expect(page).toHaveURL(/.*\/viewmeme\/.+/);
    const commentHeader = page.locator('h2', { hasText: 'Commenti' });
    const commentInput = page.getByPlaceholder('Scrivi un commento...');
    const sendButton = commentInput.locator('..').locator('button');
    await expect(commentHeader).toBeVisible();
    const headerText = await commentHeader.textContent();
    const initialCommentCount = parseInt(headerText?.match(/\((\d+)\)/)?.[1] || '0');
    await expect(sendButton).toBeDisabled();
    await commentInput.fill('    ');
    await expect(sendButton).toBeDisabled();
    const uniqueCommentText = `Test E2E Comment ${Date.now()}`;
    await commentInput.fill(uniqueCommentText);
    await expect(sendButton).toBeEnabled();
    const commentPostPromise = page.waitForResponse(response => 
      response.url().includes('/comments') && response.request().method() === 'POST'
    );
    await sendButton.click();
    await expect(sendButton).toBeDisabled();
    await commentPostPromise;
    const toast = page.locator('p.text-sm', { hasText: 'Commento aggiunto con successo!' });
    await expect(toast).toBeVisible();
    await expect(commentInput).toHaveValue('');
    const expectedNewCount = initialCommentCount + 1;
    await expect(commentHeader).toHaveText(`Commenti (${expectedNewCount})`);
    const firstRenderedComment = page.locator('app-view-meme p.text-xs.md\\:text-sm').first();
    await expect(firstRenderedComment).toHaveText(uniqueCommentText);
    await expect(toast).not.toBeVisible();
  });
});