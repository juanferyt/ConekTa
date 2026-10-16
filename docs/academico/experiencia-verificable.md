# Experiencia verificable en ConekTa

Implementación del 16 de octubre de 2026. La verificación consiste en contrastar un código con el registro de ConekTa, su evidencia conservada y su estado actual. No certifica automáticamente que un trabajo ocurrió ni sustituye la revisión humana de la empresa.

## Flujo para demostrarlo

1. La empresa publica un reto; un candidato se postula, es aceptado y presenta su entrega.
2. La empresa revisa los enlaces y el trabajo. Califica por separado cumplimiento, calidad, responsabilidad, comunicación, trabajo en equipo, habilidades técnicas y resultado final. Cada criterio requiere un entero entre 1 y 5; no hay calificaciones preseleccionadas.
3. Selecciona solamente las competencias que pudo comprobar y escribe su evaluación. Se registra la cuenta evaluadora, la fecha y la huella de la versión de entrega revisada.
4. Para emitir, la empresa debe tener estado VERIFIED asignado por administración. Deben existir entrega y evaluación vigentes, además del nombre del candidato y de la empresa. Devolver la entrega para correcciones invalida la evaluación anterior.
5. Al completar se crea una copia fija de nombre del candidato, empresa emisora, cuenta evaluadora y emisora, proyecto, criterios y notas, competencias, fechas y datos de entrega. El certificado guarda un código único y una huella SHA-256 de esa copia.
6. **Los nuevos certificados nacen privados.** El candidato puede hacer pública la experiencia desde su sección de experiencias. La interfaz explica que se compartirán nombre, entrega, enlaces y calificaciones. Al ocultarla nuevamente, el enlace público devuelve 404 y deja de mostrar esos datos.
7. Cualquier persona puede consultar `/verify`, introducir el código o escanear el QR. No necesita cuenta. La pantalla muestra emisor, evidencia, las siete notas, fecha de consulta y estado vigente. Puede descargar la copia en JSON o imprimir el certificado vigente.
8. Un administrador puede revocar. La consulta pública conserva la trazabilidad y muestra REVOKED con su fecha. Se elimina el aporte al matching, al cálculo de evidencias y a las experiencias visibles en el pasaporte. La API registra emisión, evaluación y revocación en auditoría.

## Garantías implementadas

- La copia emitida no depende de cambios posteriores del perfil o de la oportunidad.
- La base de datos bloquea modificaciones del contenido, huella, código, fecha de emisión y asociación del certificado. También bloquea reactivar un certificado revocado. Las credenciales administrativas de la base siguen siendo parte de la confianza del sistema.
- La API recalcula el SHA-256 antes de presentar un registro como íntegro. El JSON usa claves ordenadas recursivamente para que el orden interno de PostgreSQL JSONB no altere el resultado.
- La evaluación se vincula a los datos y a la fecha de actualización de la entrega. Una revisión anterior no permite emitir sobre una entrega modificada.
- Las operaciones sobre una misma postulación bloquean su fila durante la transacción; una emisión o evaluación no puede continuar utilizando un estado anterior leído antes de otro cambio.
- Un certificado anterior a esta migración no recibe evidencia inventada: se identifica como LEGACY y no aporta respaldo verificable. No se reemite automáticamente.
- El endpoint envía `Cache-Control: no-store`; la pantalla consulta periódicamente y permite actualizar el estado. Un fallo de conexión se presenta como imposibilidad de verificar, no como certificado válido.

## Límites explícitos

El hash es una huella de integridad, **no una firma digital ni una acreditación externa**. La autoridad del registro es ConekTa. Un archivo JSON o PDF por sí solo no confirma vigencia: debe contrastarse con el registro actual. La revocación no borra copias previamente descargadas.

Se conservan los datos y enlaces de la entrega, no una copia de los sitios externos; su contenido puede cambiar. Las fechas mostradas son aceptación/finalización registradas. La duración en semanas es la prevista para el reto y no acredita horas trabajadas.

El QR usa el origen de la web que lo genera. Mientras el proyecto funcione en `localhost`, solo se verifica desde esa máquina. Para compartir certificados con personas externas se debe alojar la web y API en una dirección estable accesible y emitir/imprimir los enlaces desde allí. Subir el código a GitHub no publica el servicio de verificación.

## Instalación y comprobación

En una instalación existente, detener la API antes de regenerar Prisma en Windows:

```powershell
npm run db:generate
npx dotenv -e .env -- npm exec -w @conekta/api -- prisma migrate deploy
npm run dev
```

El comando de migraciones carga `DATABASE_URL` desde el `.env` raíz. La nueva migración se llama `20261016000000_verifiable_experience` y conserva certificados anteriores.

Comprobaciones automatizadas:

- `certificate-evidence.spec.ts`: huellas estables, cambios de contenido/entrega, registros anteriores, integridad inválida y ocultamiento.
- `core-flow.e2e.ts`: notas distintas, valor fuera de rango, emisor no verificado, corrección y reevaluación, copia fija, emisión repetida, bloqueo de cambios en base de datos, publicación/ocultamiento, permisos de revocación, bono y pasaporte después de revocar.
- `scripts/check-experience-ui.cjs`: Chromium comprueba los siete selectores vacíos y obligatorios, el cuerpo enviado, búsqueda por código, evidencia visible, revocación, privacidad y fallo de conexión. Utiliza respuestas API controladas; se complementa con la prueba integral contra PostgreSQL.

Para repetir la prueba visual, disponer de Playwright y Chromium, iniciar la web y ejecutar `node scripts/check-experience-ui.cjs`. Si se instalaron fuera del repositorio, `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH` indican sus rutas; `UI_URL` permite elegir otra URL web. No se añadió Playwright a las dependencias de ejecución del producto.
