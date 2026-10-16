# Verificación técnica

## Actualización: experiencia verificable, 16 de octubre de 2026

- 29 pruebas unitarias aprobadas, 7 suites, sin fallos.
- Flujo integral ampliado aprobado en PostgreSQL 18; 15 migraciones aplicadas desde cero en `academic_test_1792136765423_1f0bde`.
- Comprobados: calificaciones diferenciadas, restricciones de emisión, reevaluación tras corrección, copia fija, integridad, privacidad por defecto, publicación explícita, revocación y retirada de respaldo en matching/evidencia/pasaporte.
- Comprobación Chromium aprobada mediante `scripts/check-experience-ui.cjs`, con respuestas API controladas: siete campos obligatorios sin valores iniciales, envío independiente de notas, búsqueda, enlaces, revocación, privacidad y error de conexión. No sustituye un piloto humano ni una prueba del navegador contra todos los servicios reales.
- Typecheck, lint y compilación de API/web aprobados.
- Migración aplicada también a la base local `conekta_demo`; aplicación reiniciada en web 5174 y API 3001. No se publicaron estos cambios en GitHub durante esta revisión.

Detalles y límites en [Experiencia verificable](experiencia-verificable.md).

## Registro anterior

Fecha: 15 de octubre de 2026. Entorno: Windows, Node.js 22.22.0 y PostgreSQL 18 local temporal. Se utilizó el código de este workspace, sin atribuir un identificador de commit.

## Resultados observados

| Comprobación                   | Resultado                                                         |
| ------------------------------ | ----------------------------------------------------------------- |
| Pruebas unitarias              | 24 aprobadas, 0 fallidas, 6 suites.                               |
| Migraciones                    | Las 14 migraciones se aplicaron desde cero en un esquema aislado. |
| Prueba integral HTTP/WebSocket | 1 escenario integral aprobado; 0 fallos.                          |
| Typecheck                      | Aprobado, sin errores. |
| Lint                           | Aprobado en API y web, sin errores. |
| Compilación                    | API y web compiladas correctamente. |
| Recorrido visual en navegador  | No realizado.                                                     |
| Piloto con personas            | No realizado; protocolo y registro preparados.                    |

La ejecución integral aprobada utilizó `academic_test_1792118280601_ec19d0` sobre `127.0.0.1:55432`, en una instancia temporal distinta de la base del proyecto. El escenario está en `apps/api/test/core-flow.e2e.ts` y verifica registro, perfiles, vacante, matching, postulación, rechazo de duplicados, revisión, entrevista, selección, oferta, aceptación y contratación. También comprueba chat HTTP/WebSocket, señalización de llamada, restricciones de terceros y roles, experiencias, certificados, evidencia, pasaporte y desactivación de cuenta.

**Límites:** señalización WebRTC no demuestra transmisión de audio/video. La prueba no automatiza pantallas ni valida envío SMTP, almacenamiento S3 o Web Push: esos servicios se desactivan en el ejecutor académico. La ejecución en PostgreSQL 18 no sustituye una prueba específica de la imagen PostgreSQL 16 definida en Docker Compose.

## Reproducir el flujo integral

Con la base local configurada en `.env` disponible:

```powershell
npm run test:academic
```

Si se necesita otra instancia local, configurar `TEST_DATABASE_URL` solo en la terminal y ejecutar el mismo comando. No publicar credenciales en el informe. El script `scripts/run-academic-e2e.cjs`:

1. Rechaza producción y servidores que no sean locales.
2. Comprueba conexión antes de migrar.
3. Utiliza un nombre de esquema nuevo en cada ejecución.
4. Ejecuta `prisma migrate deploy` y el escenario integral.
5. Conserva el esquema aislado para inspección; no borra el esquema `public` ni ejecuta el seed sobre los datos de demostración.

El usuario de PostgreSQL necesita permiso para crear esquemas. Los esquemas de prueba conservados consumen espacio y se pueden retirar posteriormente de forma explícita.

Docker Desktop no expuso su motor durante esta revisión. Como alternativa, se inicializó un clúster temporal con los binarios PostgreSQL 18 ya instalados, en `%TEMP%/conekta-academic-pg-20261015`, enlazado únicamente a `127.0.0.1:55432`. La instancia quedó detenida al finalizar la verificación; se conservaron sus archivos. La autenticación local de esa instancia es solo para pruebas ficticias.

La compilación web requirió permitir el subproceso de esbuild fuera del entorno restringido, que inicialmente devolvió `spawn EPERM`. La repetición autorizada de `npm run build -w @conekta/web` terminó correctamente.

## Reproducir unitarias y calidad

```powershell
npm run test:unit
npm run typecheck
npm run lint
npm run build
```

El ejecutor estándar de pruebas presentó `spawn EPERM` bajo el entorno restringido. Las unitarias se ejecutaron en un solo proceso desde `apps/api`, con el mismo cargador TypeScript y los mismos archivos:

```powershell
node -r ts-node/register -e "const fs = require('node:fs'); for (const f of fs.readdirSync('./test').filter(f => f.endsWith('.spec.ts'))) require('./test/' + f);"
```

## Evidencia pendiente para la entrega

- Recorrido manual del navegador por cada rol, incluyendo filtros, mensajes de error, criterios sin definir y vista móvil.
- Sesiones reales del protocolo de usabilidad y resultados anónimos.
- Revisión de los pesos y del orden de recomendaciones con evaluadores humanos.
- Capturas de la demostración, fechadas y asociadas a requisitos.

Los resultados técnicos respaldan el comportamiento ejercitado por las pruebas. No demuestran todavía facilidad de uso ni impacto sobre contratación.
