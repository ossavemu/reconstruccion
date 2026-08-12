import { test, expect, type Page } from "@playwright/test";

const REGISTERED_EMAIL = "oscarvelez1112@gmail.com";
const UNREGISTERED_EMAIL = "noregistrado@e2e-prueba.test";
const VOTE_DAY = "2026-08-20";

test.describe.configure({ mode: "serial" });

async function openCalendar(page: Page) {
  await page.goto("/votar");
  await expect(page.locator(".cell.day")).toHaveCount(12);
}

test("la landing carga con la idea y la reunion", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Orientación técnica");
  await expect(page.locator(".hero a[href='/reconstruccion']")).toBeVisible();
  await expect(page.locator(".hero a[href='/votar']")).toBeVisible();
  await expect(page.locator("#idea")).toBeVisible();
  await expect(page.locator("#reunion")).toBeVisible();
});

test("una persona puede registrarse en modo reconstruccion", async ({ page }) => {
  await page.goto("/reconstruccion");
  await page.fill("#nombre", "Oscar Vélez");
  await page.fill("#email", REGISTERED_EMAIL);
  await page.click("#submit-btn");
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result h3")).toHaveText("Registro confirmado");
  await expect(page.locator("#result a[href='/votar']")).toBeVisible();
});

test("el calendario muestra solo dias habiles del 13 al 28 de agosto", async ({ page }) => {
  await openCalendar(page);
  const fechas = await page
    .locator(".cell.day")
    .evaluateAll((cells) => cells.map((c) => (c as HTMLElement).dataset.fecha));
  expect(fechas[0]).toBe("2026-08-13");
  expect(fechas[fechas.length - 1]).toBe("2026-08-28");
  for (const fecha of fechas) {
    const day = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    expect(day).toBeGreaterThan(0);
    expect(day).toBeLessThan(6);
  }
});

test("no se puede votar sin escoger dia", async ({ page }) => {
  await openCalendar(page);
  await page.fill("#email", REGISTERED_EMAIL);
  await page.click("#submit-btn");
  await expect(page.locator("#error")).toContainText("Seleccione primero un día");
});

test("no se puede votar sin escoger franja", async ({ page }) => {
  await openCalendar(page);
  await page.click(`.cell.day[data-fecha='${VOTE_DAY}']`);
  await expect(page.locator("#selected-day")).toHaveClass(/picked/);
  await page.fill("#email", REGISTERED_EMAIL);
  await page.click("#submit-btn");
  await expect(page.locator("#error")).toContainText("Seleccione la franja horaria");
});

test("un correo registrado puede votar y el conteo publico se actualiza", async ({ page }) => {
  await openCalendar(page);
  await page.click(`.cell.day[data-fecha='${VOTE_DAY}']`);
  await expect(page.locator("#selected-day")).toContainText("20 de agosto");
  await page.click(".slot[data-franja='manana']");
  await page.fill("#email", REGISTERED_EMAIL);
  await page.click("#submit-btn");
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result-message")).toContainText("20 de agosto");
  await expect(
    page.locator(`.cell.day[data-fecha='${VOTE_DAY}'] .day-votes`),
  ).toHaveText("1");
  await expect(page.locator("#tally-summary")).toContainText("1 persona");
});

test("el mismo correo no puede votar dos veces", async ({ page }) => {
  await openCalendar(page);
  await page.click(`.cell.day[data-fecha='${VOTE_DAY}']`);
  await page.click(".slot[data-franja='tarde']");
  await page.fill("#email", REGISTERED_EMAIL);
  await page.click("#submit-btn");
  await expect(page.locator("#error")).toContainText("ya registro un voto");
});

test("un correo no registrado no puede votar", async ({ page }) => {
  await openCalendar(page);
  await page.click(`.cell.day[data-fecha='${VOTE_DAY}']`);
  await page.click(".slot[data-franja='manana']");
  await page.fill("#email", UNREGISTERED_EMAIL);
  await page.click("#submit-btn");
  await expect(page.locator("#error")).toContainText("no esta registrado");
});

test("la votacion funciona en pantalla de celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCalendar(page);
  await expect(page.locator(".month-grid")).toBeVisible();
  await expect(page.locator("#vote-form")).toBeVisible();
  const gridBox = await page.locator(".month-grid").boundingBox();
  expect(gridBox && gridBox.width).toBeLessThanOrEqual(390);
});
