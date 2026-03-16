const { chromium } = require('playwright');
const readline = require('readline');
const config = require('./config');

function askToContinue(message) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(`${message}\n(нажми Enter, когда всё будет готово)\n`, () => {
            rl.close();
            resolve();
        });
    });
}

(async () => {
    console.log('Режим подготовки storageState: сейчас откроется полноценный браузер Chromium.');
    console.log('Выполни ручной вход в Telegram Web и hh.ru, чтобы сохранить все сессии в одном файле.');

    const browser = await chromium.launch({ headless: false });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('1/2. Открываем Telegram Web...');
        await page.goto(`https://web.telegram.org/k/#@${config.BOT_USERNAME}`, {
            waitUntil: 'domcontentloaded',
        });

        await askToContinue('Авторизуйся в Telegram Web (если требуется) и убедись, что чат с hh-ботом доступен.');

        console.log('2/2. Переходим на hh.ru, чтобы зафиксировать сессию.');
        await page.goto(config.HH.RESUMES_URL, {
            waitUntil: 'domcontentloaded',
        });

        await askToContinue(
            'Полностью авторизуйся на hh.ru (включая SMS-подтверждение) и дождись загрузки твоего кабинета / кнопки "Поднять".'
        );

        await context.storageState({ path: config.STORAGE_PATH });
        console.log(`storageState сохранён: ${config.STORAGE_PATH}`);
    } catch (error) {
        console.error('Не удалось подготовить storageState:', error);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
