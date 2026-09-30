import { expect, type Locator, type Page } from '@playwright/test';

export const DEFAULT_CREDENTIALS = {
  username: process.env.TEST_USERNAME ?? 'admin',
  password: process.env.TEST_PASSWORD ?? 'password123',
};

export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    // Fields are matched by label or placeholder so minor copy changes do not break login.
    this.usernameInput = page.getByLabel(/username/i).or(page.getByPlaceholder(/username/i)).first();
    this.passwordInput = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)).first();
    this.submitButton = page.getByRole('button', { name: /sign in|log in|login/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async login(
    username: string = DEFAULT_CREDENTIALS.username,
    password: string = DEFAULT_CREDENTIALS.password,
  ): Promise<void> {
    await this.goto();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();

    // Login succeeded once the form is gone; the board itself is checked by ProjectPage.
    await expect(this.passwordInput).toBeHidden();
  }
}
