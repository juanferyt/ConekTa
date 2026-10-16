// Optional browser check. Supply PLAYWRIGHT_MODULE when Playwright is installed outside this repo.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.UI_URL || 'http://localhost:5174';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const criteria = [
      'compliance',
      'quality',
      'responsibility',
      'communication',
      'teamwork',
      'technicalSkills',
      'finalResult',
    ];
    const skill = { id: 'skill-1', name: 'React', type: 'TECHNICAL' };
    let posted;
    const application = {
      id: 'app-1',
      status: 'SUBMITTED',
      compatibilityScore: 75,
      candidate: { firstName: 'Ana', lastName: 'Prueba' },
      submission: {
        workDescription: 'Entrega documentada para la prueba de interfaz.',
        projectUrl: 'https://example.test/work',
      },
    };
    let mode = 'ACTIVE';
    const certificate = {
      code: 'CNK-EXP-1234567890ABCDEF',
      verification: 'VALID',
      status: 'ACTIVE',
      checkedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      candidate: 'Ana Prueba',
      company: 'Empresa de prueba',
      project: 'Proyecto de interfaz',
      description: 'Datos ficticios de prueba',
      startsAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationWeeks: 4,
      issuer: {
        companyId: 'company-1',
        evaluatedById: 'user-1',
        issuedById: 'user-1',
        verifiedAtIssue: true,
      },
      skills: [skill],
      evaluation: Object.fromEntries(criteria.map((key, index) => [key, (index % 5) + 1])),
      evaluatedAt: new Date().toISOString(),
      evidence: {
        workDescription: 'Entrega documentada',
        projectUrl: 'https://example.test/work',
        githubUrl: null,
        additionalLinks: [],
        submittedAt: new Date().toISOString(),
      },
      payloadHash: 'a'.repeat(64),
      snapshot: {},
    };
    await page.route(
      /http:\/\/localhost:\d+\/(auth\/|experiences\/|skills|verify\/)/,
      async (route) => {
        const path = new URL(route.request().url()).pathname;
        const respond = (body, status = 200) =>
          route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (path === '/auth/refresh')
          return respond({
            accessToken: 'ui-test',
            user: { id: 'user-1', email: 'ui@example.test', role: 'COMPANY', active: true },
          });
        if (path === '/skills') return respond([skill]);
        if (path.endsWith('/evaluation')) {
          posted = route.request().postDataJSON();
          application.evaluation = posted;
          return respond(posted, 201);
        }
        if (path === '/experiences/company/dashboard')
          return respond({
            published: 1,
            active: 1,
            participants: 1,
            pendingSubmissions: 1,
            completed: 0,
          });
        if (path === '/experiences/company')
          return respond([
            {
              id: 'experience-1',
              title: 'Reto de prueba UI',
              professionalArea: 'Sistemas',
              estimatedDurationWeeks: 4,
              status: 'IN_PROGRESS',
              _count: { applications: 1 },
              skills: [{ skillId: skill.id, skill }],
              applications: [application],
            },
          ]);
        if (path.startsWith('/verify/')) {
          if (mode === 'OFFLINE') return route.abort('failed');
          if (mode === 'PRIVATE') return respond({ message: 'Certificado no público' }, 404);
          return respond({
            ...certificate,
            status: mode,
            revokedAt: mode === 'REVOKED' ? new Date().toISOString() : null,
          });
        }
        return respond({});
      },
    );
    await page.goto(`${origin}/company/experiences`);
    await page.getByRole('button', { name: /Reto de prueba UI/ }).click();
    await page.getByRole('button', { name: 'Evaluar entrega', exact: true }).click();
    const selects = page.locator('select');
    assert.equal(await selects.count(), 7);
    assert.equal(
      await page.getByRole('button', { name: 'Guardar evaluación', exact: true }).isDisabled(),
      true,
    );
    for (let i = 0; i < 7; i++) {
      assert.equal(await selects.nth(i).inputValue(), '');
      await selects.nth(i).selectOption(String((i % 5) + 1));
    }
    await page
      .getByPlaceholder('Comentario de evaluación')
      .fill('Revisé todos los entregables y registré cada criterio por separado.');
    await page.getByLabel('React', { exact: true }).check();
    await page.getByRole('button', { name: 'Guardar evaluación', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Cambio guardado correctamente' }).waitFor();
    criteria.forEach((key, i) => assert.equal(posted[key], (i % 5) + 1));
    console.log(
      'PASS: siete calificaciones vacías, obligatorias e independientes enviadas correctamente.',
    );
    await page.goto(`${origin}/verify`);
    await page.getByLabel('Código del certificado').fill(certificate.code.toLowerCase());
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await page.getByRole('heading', { name: 'Registro vigente · integridad comprobada' }).waitFor();
    assert.ok(await page.getByRole('link', { name: 'https://example.test/work' }).isVisible());
    assert.equal(
      await page.getByRole('button', { name: 'Imprimir / guardar PDF' }).isDisabled(),
      false,
    );
    mode = 'REVOKED';
    await page.getByRole('button', { name: 'Actualizar estado' }).click();
    await page.getByRole('heading', { name: /CERTIFICADO REVOCADO/ }).waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Imprimir / guardar PDF' }).isDisabled(),
      true,
    );
    console.log(
      'PASS: consulta por código, evidencia visible y revocación actualizada sin presentar vigencia.',
    );
    mode = 'PRIVATE';
    await page.getByRole('button', { name: 'Actualizar estado' }).click();
    await page.getByRole('heading', { name: 'Certificado no encontrado o no público' }).waitFor();
    assert.equal(await page.getByText('Ana Prueba', { exact: true }).count(), 0);
    mode = 'OFFLINE';
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.getByRole('heading', { name: 'No se pudo comprobar la vigencia' }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: privacidad, fallo de conexión y ausencia de errores JavaScript.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
