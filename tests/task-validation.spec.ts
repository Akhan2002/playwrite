import { test } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { ProjectPage } from './pages/project.page';
import scenarios from './data/tasks.json';

interface TaskScenario {
  testCase: string;
  project: string;
  task: string;
  column: string;
  tags: string[];
}

const taskScenarios: TaskScenario[] = scenarios;

test.describe('Task board validation', () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login();
  });

  for (const scenario of taskScenarios) {
    test(`${scenario.testCase}: "${scenario.task}" is in "${scenario.column}" on ${scenario.project}`, async ({
      page,
    }) => {
      const projectPage = new ProjectPage(page);

      await test.step(`Open project "${scenario.project}"`, async () => {
        await projectPage.navigateToProject(scenario.project);
      });

      await test.step(`Verify task is in column "${scenario.column}"`, async () => {
        await projectPage.verifyTaskInColumn(scenario.task, scenario.column);
      });

      await test.step(`Verify tags: ${scenario.tags.join(', ')}`, async () => {
        await projectPage.verifyTaskTags(scenario.task, scenario.column, scenario.tags);
      });
    });
  }
});
