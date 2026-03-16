const { chromium } = require('playwright');
const fs = require('fs');
const config = require('./config');
const {
    openBotMenu,
    clickMenuItem,
    ensureMainMenu,
    waitForBotReply,
} = require('./telegram');
const { raiseResumeViaHH } = require('./hh');

(async () => {
    const browser = await chromium.launch({ headless: true });

    try {
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
            return;
        }

        // --- Основной сценарий ---
        await page.waitForTimeout(config.TIMEOUTS.PAGE_LOAD);

        console.log('Проверяем, не находимся ли мы в режиме навигации');
        await ensureMainMenu(page);

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

            const reply = await waitForBotReply(page, config.TIMEOUTS.BOT_REPLY);

            if (reply.received) {
                const preview = reply.payload?.text ? ` (${reply.payload.text.slice(0, 80)})` : '';
                console.log(`Ответ бота получен${preview}`);
            } else {
                console.warn('Ответ бота не пришёл за отведённое время, запускаем резервный сценарий через hh.ru');
                const fallbackResult = await raiseResumeViaHH(context, config.HH);

                if (!fallbackResult.success) {
                    console.warn(`Резервное поднятие через hh.ru завершилось с ошибкой: ${fallbackResult.reason || 'неизвестно'}`);
                }
            }
        } else {
            console.log('Кнопки "Поднять" нет — либо уже поднято, либо не требуется');
        }

        console.log('Сценарий завершён');

        try {
            await context.storageState({ path: config.STORAGE_PATH });
        } catch (error) {
            console.warn(`Не удалось обновить storageState: ${error.message}`);
        }
    } catch (error) {
        console.error('Сценарий завершился с ошибкой:', error);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
