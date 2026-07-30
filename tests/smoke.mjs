import puppeteer from 'puppeteer-core'

const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:4173'
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle0' })

  await page.waitForSelector('.login-card')
  await page.click('.login-button')
  await page.waitForSelector('.dashboard-content')

  const heading = await page.$eval('.page-heading h1', (node) => node.textContent)
  if (!heading?.includes('Good afternoon')) throw new Error('Dashboard did not load after sign in')

  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('nav button')]
    const inventory = buttons.find((button) => button.textContent?.includes('Inventory'))
    if (!(inventory instanceof HTMLElement)) throw new Error('Inventory navigation is missing')
    inventory.click()
  })
  await page.waitForSelector('.data-table')

  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('.heading-actions button')]
    const add = buttons.find((button) => button.textContent?.includes('Add stock item'))
    if (!(add instanceof HTMLElement)) throw new Error('Add stock item action is missing')
    add.click()
  })
  await page.waitForSelector('.modal')
  await page.type('input[name="name"]', 'Smoke Test Profile')
  await page.type('input[name="customer"]', 'Aluminium profile')
  await page.type('input[name="value"]', '250 m')
  await page.$eval('input[type="date"]', (input) => {
    input.value = '2026-08-15'
  })
  await page.click('.modal-actions .primary-button')
  await page.waitForSelector('.toast')

  const bodyText = await page.$eval('body', (node) => node.textContent)
  if (!bodyText?.includes('Smoke Test Profile')) throw new Error('Created inventory record was not rendered')

  await page.screenshot({ path: '/tmp/aluprime-dashboard.png', fullPage: true })

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.reload({ waitUntil: 'networkidle0' })
  const menuVisible = await page.$eval('.menu-button', (button) => getComputedStyle(button).display !== 'none')
  if (!menuVisible) throw new Error('Mobile navigation trigger is not visible')
  await page.click('.menu-button')
  await page.waitForSelector('.sidebar.mobile-open')

  console.log('Smoke test passed: login, navigation, record creation, persistence, and mobile UI')
} finally {
  await browser.close()
}
