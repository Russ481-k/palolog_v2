import { prisma } from 'prisma/seed/utils';

export async function createProjects() {
  console.log(`⏳ Seeding projects`);

  if (!(await prisma.project.findUnique({ where: { name: 'My Project' } }))) {
    await prisma.project.create({
      data: {
        name: 'My Project',
        description: 'This is a project created with the seed command',
      },
    });
  }
}
