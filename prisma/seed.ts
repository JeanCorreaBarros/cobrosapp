import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const usuario = process.env.ADMIN_USUARIO ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const nombre = process.env.ADMIN_NOMBRE ?? "Administrador";

  const existente = await prisma.usuario.findUnique({ where: { usuario } });

  if (existente) {
    console.log(`Usuario "${usuario}" ya existe, no se modifica.`);
  } else {
    await prisma.usuario.create({
      data: {
        usuario,
        nombre,
        passwordHash: await bcrypt.hash(password, 10),
        rol: Rol.ADMIN,
      },
    });
    console.log(`Admin creado -> usuario: ${usuario} / contraseña: ${password}`);
  }

  await prisma.configuracion.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  const zonas = ["Centro", "Norte", "Sur"];
  for (const nombre of zonas) {
    await prisma.zona.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log("Configuración y zonas base listas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
