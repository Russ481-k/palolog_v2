import { emphasis, prisma } from 'prisma/seed/utils';

export async function createMenus() {
  console.log(`⏳ Seeding menus`);

  if (!(await prisma.menu.findUnique({ where: { name: 'TRAFFIC' } }))) {
    await prisma.menu.create({
      data: {
        name: 'TRAFFIC',
      },
    });
  }

  if (!(await prisma.menu.findUnique({ where: { name: 'THREAT' } }))) {
    await prisma.menu.create({
      data: {
        name: 'THREAT',
      },
    });
  }

  if (!(await prisma.menu.findUnique({ where: { name: 'SYSTEM' } }))) {
    await prisma.menu.create({
      data: {
        name: 'SYSTEM',
      },
    });
  }

  console.log(`👉 Admin connect with: ${emphasis('admin')}`);
}
