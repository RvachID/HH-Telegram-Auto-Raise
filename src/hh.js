const config = require('./config');

const USERNAME_SELECTORS = [
    'input[name="username"]',
    'input[name="login"]',
    'input[data-qa="login-input-username"]',
    'input[autocomplete="username"]',
    'input[type="email"]',
    'input[type="text"]',
];

const PASSWORD_SELECTORS = [
    'input[name="password"]',
    'input[data-qa="login-input-password"]',
    'input[autocomplete="current-password"]',
    'input[type="password"]',
];

const SUBMIT_SELECTORS = [
    'button[data-qa="account-login-submit"]',
    'button[type="submit"]',
    'button:has-text("Войти")',
    'button:has-text("Продолжить")',
];

const RAISE_BUTTON_SELECTORS = [
    '[data-qa="resume__actions_raise"]',
    '[data-qa="resume__action_raise"]',
    'button:has-text("Поднять в поиске")',
    'button:has-text("Поднять резюме")',
    'button:has-text("Поднять страницу")',
    'a:has-text("Поднять в поиске")',
];

const CONFIRM_BUTTON_SELECTORS = [
    'button[data-qa="resume-raise-submit"]',
    'button:has-text("Поднять")',
];

async function findFirstExisting(root, selectors) {
    for (const selector of selectors) {
        const locator = root.locator(selector);

        if (await locator.count()) {
            return locator.first();
        }
    }

    return null;
}

async function isLoginPage(page) {
    const url = page.url();

    if (url.includes('/account/login')) {
        return true;
    }

    const loginForm = page.locator('form[action*="/account/login"]');
    return (await loginForm.count()) > 0;
}

async function ensureLoggedIn(page, hhConfig) {
    if (!(await isLoginPage(page))) {
        return { loggedIn: true, loginAttempted: false };
    }

    if (!hhConfig.USERNAME || !hhConfig.PASSWORD) {
        return { loggedIn: false, reason: 'missing-credentials' };
    }

    const username = await findFirstExisting(page, USERNAME_SELECTORS);
    const password = await findFirstExisting(page, PASSWORD_SELECTORS);
    const submit = await findFirstExisting(page, SUBMIT_SELECTORS);

    if (!username || !password || !submit) {
        return { loggedIn: false, reason: 'login-form-not-found' };
    }

    await username.fill(hhConfig.USERNAME);
    await password.fill(hhConfig.PASSWORD);

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: hhConfig.PAGE_TIMEOUT }).catch(() => {}),
        submit.click(),
    ]);

    await page.waitForLoadState('networkidle', { timeout: hhConfig.PAGE_TIMEOUT }).catch(() => {});

    const stillLogin = await isLoginPage(page);

    return stillLogin
        ? { loggedIn: false, reason: 'login-failed' }
        : { loggedIn: true, loginAttempted: true };
}

async function clickRaiseButton(page, hhConfig) {
    await page.waitForTimeout(1000);

    for (const selector of RAISE_BUTTON_SELECTORS) {
        const candidate = page.locator(selector).first();

        if (!(await candidate.count())) {
            continue;
        }

        if (await candidate.isDisabled().catch(() => false)) {
            continue;
        }

        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click();

        const dialog = page.locator('[role="dialog"]');

        if (await dialog.count()) {
            const confirm = await findFirstExisting(dialog, CONFIRM_BUTTON_SELECTORS);

            if (confirm) {
                await confirm.click();
            }
        }

        await page.waitForTimeout(hhConfig.POST_ACTION_WAIT);
        return { success: true };
    }

    return { success: false, reason: 'raise-button-not-found' };
}

async function raiseResumeViaHH(context, hhConfig = config.HH) {
    console.log('Запускаем резервное поднятие через hh.ru');

    const page = await context.newPage();

    try {
        await page.goto(hhConfig.RESUMES_URL, {
            waitUntil: 'domcontentloaded',
            timeout: hhConfig.PAGE_TIMEOUT,
        });

        await page.waitForLoadState('networkidle', { timeout: hhConfig.PAGE_TIMEOUT }).catch(() => {});

        const loginResult = await ensureLoggedIn(page, hhConfig);

        if (!loginResult.loggedIn) {
            const reason = loginResult.reason || 'unknown';
            console.warn(`Не удалось авторизоваться на hh.ru (${reason}).`);
            return { success: false, reason: `login-${reason}` };
        }

        const raiseResult = await clickRaiseButton(page, hhConfig);

        if (!raiseResult.success) {
            console.warn('Кнопка поднятия на hh.ru не найдена или недоступна.');
        } else {
            console.log('Резюме поднято через hh.ru (резервный сценарий).');
        }

        return raiseResult;
    } catch (error) {
        console.error('Ошибка при резервном сценарии hh.ru:', error.message);
        return { success: false, reason: error.message };
    } finally {
        await page.close();
    }
}

module.exports = {
    raiseResumeViaHH,
};
