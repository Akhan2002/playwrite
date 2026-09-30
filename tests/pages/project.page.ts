import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Every column that can appear on a board. A column is located as "the element that
 * contains this column's header and none of the other headers", so this list only needs
 * to include the columns that really exist on the board. Add any new column name here.
 */
export const BOARD_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'] as const;

export class ProjectPage {
  constructor(private readonly page: Page) {}

  // ---------- Project navigation ----------

  async navigateToProject(projectName: string): Promise<void> {
    // Sidebar entries are buttons whose accessible name starts with the project name.
    await this.page.getByRole('navigation').getByRole('button', { name: projectName }).click();

    // The selected project is shown as the <h1> in the page header (the sidebar uses <h2>).
    await expect(
      this.page.getByRole('banner').getByRole('heading', { level: 1, name: projectName, exact: true }),
    ).toBeVisible();
  }

  // ---------- Columns ----------

  /** Matches a column header such as "To Do", "To Do 3" or "To Do (3)". */
  private columnHeader(columnName: string): Locator {
    const pattern = new RegExp(`^\\s*${escapeRegExp(columnName)}\\s*(\\(?\\d+\\)?)?\\s*$`, 'i');
    return this.page.getByText(pattern);
  }

  /**
   * The column container is the outermost element holding this column's header and none
   * of the other column headers. Every ancestor above it holds other headers too, so
   * `.first()` (document order = outermost first) resolves to exactly the column.
   */
  getColumn(columnName: string): Locator {
    const otherHeaders = BOARD_COLUMNS.filter((name) => name !== columnName)
      .map((name) => this.columnHeader(name))
      .reduce((all, header) => all.or(header));

    return this.page
      .locator('*')
      .filter({ has: this.columnHeader(columnName) })
      .filter({ hasNot: otherHeaders })
      .first();
  }

  // ---------- Tasks ----------

  private taskTitle(scope: Locator, taskName: string): Locator {
    return scope.getByText(taskName, { exact: true });
  }

  /**
   * Returns the card of `taskName` inside `columnName`.
   *
   * A card is defined structurally, so it doesn't depend on CSS class names: it is the
   * outermost element inside the column that contains this task's title and no other
   * task title. A "task title" is any element with the same tag and class as this title,
   * e.g. every <h3 class="font-medium ..."> on the board. Anything inside that region
   * belongs to this task and to no other.
   */
  async getTask(taskName: string, columnName: string): Promise<Locator> {
    const column = this.getColumn(columnName);
    const title = this.taskTitle(column, taskName);
    await expect(title, `"${taskName}" should appear exactly once in "${columnName}"`).toHaveCount(1);

    const { tag, cls } = await title.evaluate((el) => ({
      tag: el.localName,
      cls: el.getAttribute('class'),
    }));
    const sameKind = cls ? `${tag}[@class=${xpathLiteral(cls)}]` : tag;
    const thisTitle = `${sameKind}[normalize-space(.)=${xpathLiteral(taskName)}]`;

    return column.locator(`xpath=.//*[.//${thisTitle}][count(.//${sameKind})=1]`).first();
  }

  // ---------- Assertions ----------

  async verifyTaskInColumn(taskName: string, columnName: string): Promise<void> {
    const column = this.getColumn(columnName);
    await expect(column, `column "${columnName}" should be on the board`).toBeVisible();
    await expect(
      this.taskTitle(column, taskName),
      `"${taskName}" should be inside the "${columnName}" column`,
    ).toBeVisible();
  }

  async verifyTaskTags(taskName: string, columnName: string, expectedTags: string[]): Promise<void> {
    const card = await this.getTask(taskName, columnName);
    await expect(card, `card for "${taskName}"`).toBeVisible();

    for (const tag of expectedTags) {
      // Each tag is its own element, so an exact match avoids e.g. "Design" matching a title.
      await expect(
        card.getByText(tag, { exact: true }),
        `"${taskName}" should have the "${tag}" tag`,
      ).toBeVisible();
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Quotes a string for use inside an XPath expression, even when it contains quotes. */
function xpathLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat('${value.split("'").join(`', "'", '`)}')`;
}
