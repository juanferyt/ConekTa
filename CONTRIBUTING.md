# Trabajo en equipo

## Ejecutar el proyecto

1. Clona el repositorio y entra en su carpeta.
2. Copia `.env.example` como `.env`; cada integrante conserva su propia configuración local.
3. Sigue el inicio rápido del [README](README.md) para instalar dependencias, iniciar servicios y aplicar migraciones.
4. Para datos ficticios, configura las variables `DEMO_*` y ejecuta `npm run db:seed:demo` según el README.

La configuración local, contraseñas, bases de datos, `node_modules` y archivos compilados no se comparten en Git. Sí se comparten las migraciones, `package-lock.json` y los archivos `.env.example` sin secretos reales.

## Proponer cambios

```bash
git switch main
git pull --ff-only
git switch -c mejora/descripcion-breve
```

Realiza un cambio concreto, revisa `git diff` y ejecuta los controles correspondientes:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

Para cambios en la API que afecten el flujo completo, con PostgreSQL local disponible ejecuta `npm run test:academic`. Este comando utiliza un esquema nuevo y aislado.

```bash
git add ruta/del/archivo
git commit -m "Describe el cambio realizado"
git push -u origin mejora/descripcion-breve
```

Abre un pull request hacia `main`, explica qué cambia y qué verificaste, y pide revisión a un compañero. Si cambia el comportamiento, actualiza también los requisitos o el documento académico correspondiente.

## Documentación académica

El [expediente académico](docs/academico/README.md) contiene requisitos, diagramas, matching y evaluación. Los resultados de usuarios deben provenir de sesiones reales y registrarse sin datos personales identificables.
