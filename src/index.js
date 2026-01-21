const { chromium } = require('playwright');
const fs = require('fs');
const config = require('./config');
const { openBotMenu, clickMenuItem } = require('./telegram');

(async () => {
    const browser = await chromium.launch({ headless: false });

    const hasSession = fs.existsSync(config.STORAGE_PATH);

    const context = hasSession
        ? await browser.newContext({ storageState: config.STORAGE_PATH })
        : await browser.newContext();

    const page = await context.newPage();

    console.log('Открываем Telegram Web');
    await page.goto(`https://web.telegram.org/k/#@${config.BOT_USERNAME}`);

    // --- Первый логин ---
    if (!hasSession && config.FIRST_LOGIN_WAIT) {
        console.log('Ожидание первой авторизации в Telegram (2 минуты)');
        await page.waitForTimeout(config.TIMEOUTS.LOGIN_WAIT);

        console.log('Сохраняем сессию Telegram');
        await page.context().storageState({ path: config.STORAGE_PATH });

        console.log('Первая авторизация завершена, завершаем сценарий');
        await browser.close();
        return;
    }

    // --- Основной сценарий ---
    await page.waitForTimeout(config.TIMEOUTS.PAGE_LOAD);

    console.log('Открываем меню → Личный кабинет');
    await openBotMenu(page);
    await clickMenuItem(page, 'Личный кабинет');
    await page.waitForTimeout(config.TIMEOUTS.AFTER_CABINET);

    console.log('Открываем меню → Поднять резюме в поиске');
    await openBotMenu(page);
    await clickMenuItem(page, 'Поднять резюме в поиске');
    await page.waitForTimeout(config.TIMEOUTS.AFTER_RAISE);

    console.log('Повторно открываем меню для проверки кнопки "Поднять"');
    await openBotMenu(page);

    const confirmed = await clickMenuItem(page, 'Поднять');

    if (confirmed) {
        console.log('Кнопка "Поднять" найдена и нажата');
        await page.waitForTimeout(config.TIMEOUTS.AFTER_CONFIRM);
    } else {
        console.log('Кнопки "Поднять" нет — либо уже поднято, либо не требуется');
    }

    console.log('Сценарий завершён');
    await browser.close();
})();
