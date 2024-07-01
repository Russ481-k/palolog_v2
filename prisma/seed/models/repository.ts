import { prisma } from 'prisma/seed/utils';

export async function createRepositories() {
  console.log(`⏳ Seeding repositories`);

  let createdCounter = 0;
  const existingCount = await prisma.repository.count();

  if (
    !(await prisma.repository.findUnique({ where: { name: 'PaloLog [web]' } }))
  ) {
    await prisma.repository.create({
      data: {
        name: 'PaloLog [web]',
        link: 'https://github.com/BearStudio/start-ui-web',
        description: '🚀 PaloLog [web]',
      },
    });
    createdCounter += 1;
  }

  if (
    !(await prisma.repository.findUnique({
      where: { name: 'PaloLog [native]' },
    }))
  ) {
    await prisma.repository.create({
      data: {
        name: 'PaloLog [native]',
        link: 'https://github.com/BearStudio/start-ui-native',
        description: '🚀 PaloLog [native]',
      },
    });
    createdCounter += 1;
  }

  console.log(
    `✅ ${existingCount} existing repositories 👉 ${createdCounter} repositories created`
  );
}
