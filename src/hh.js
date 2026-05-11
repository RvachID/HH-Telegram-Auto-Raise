const config = require('./config');

const USERNAME_SELECTORS = [
    'input[name="username"]',
    'input[name="login"]',
    'input[data-qa="login-input-username"]',
    'input[data-qa="applicant-login-input-username"]',
    'input[autocomplete="username"]',
    'input[type="email"]',
    'input[type="text"]',
];

const PASSWORD_SELECTORS = [
    'input[name="password"]',
    'input[data-qa="login-input-password"]',
    'input[data-qa="applicant-login-input-password"]',
    'input[autocomplete="current-password"]',
    'input[type="password"]',
];

const SUBMIT_SELECTORS = [
    'button[data-qa="account-login-submit"]',
    'button[data-qa="submit-button"]',
    'button[type="submit"]',
    'button:has-text("Войти")',
    'button:has-text("Продолжить")',
    'button:has-text("Дальше")',
];

const PASSWORD_MODE_SELECTORS = [
    'button[data-qa="expand-login-by-password"]',
    'button:has-text("Войти с паролем")',
];

const LOGIN_MARKER_SELECTORS = [
    'a[data-qa="login"]',
    'a[data-qa="mainmenu_profile-link"]',
    'button[data-qa="expand-login-by-password"]',
    'button[data-qa="submit-button"]',
    'input[data-qa="applicant-login-input-password"]',
    'input[data-qa="magritte-phone-input-national-number-input"]',
    'input[data-qa="login-input-username"]',
    'input[data-qa="credential-type-PHONE checked"]',
    'input[data-qa="credential-type-EMAIL"]',
];

const AUTHENTICATED_MARKER_SELECTORS = [
    '[data-qa="resume-title"]',
    '[data-qa="resume__actions_raise"]',
    '[data-qa="resume__action_raise"]',
    '[data-qa="resume-list-item"]',
    '[data-qa="resume-block-title-position"]',
    '[data-qa="applicant-sidebar-menu"]',
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

const AUTH_RECOVERY_HINT = 'Требуется повторная авторизация hh.ru. Смотри README.md:89 и заново запусти `node src/prepareStorage.js`, затем повторно войди в hh.ru и сохрани новый storageState.json.';

async function findFirstVisible(root, selectors) {
    for (const selector of selectors) {
        const locator = root.locator(selector);
        const count = await locator.count();

        for (let index = 0; index < count; index += 1) {
            const candidate = locator.nth(index);

            if (await candidate.isVisible().catch(() => false)) {
                return candidate;
            }
        }
    }

    return null;
}

async function hasVisibleElement(root, selectors) {
    return !!(await findFirstVisible(root, selectors));
}

async function isAuthenticatedResumePage(page) {
    return hasVisibleElement(page, AUTHENTICATED_MARKER_SELECTORS);
}

async function isLoginPage(page) {
    const url = page.url();

    if (url.includes('/account/login')) {
        return true;
    }

    if (await isAuthenticatedResumePage(page)) {
        return false;
    }

    return hasVisibleElement(page, LOGIN_MARKER_SELECTORS);
}

async function switchToPasswordMode(page) {
    const passwordInput = await findFirstVisible(page, PASSWORD_SELECTORS);
    if (passwordInput) {
        return;
    }

    const passwordModeButton = await findFirstVisible(page, PASSWORD_MODE_SELECTORS);
    if (!passwordModeButton) {
        return;
    }

    await passwordModeButton.click();
    await page.waitForTimeout(1500);
}

async function fillUsernameIfNeeded(page, hhConfig) {
    const username = await findFirstVisible(page, USERNAME_SELECTORS);

    if (!username) {
        return { success: true, usernameUsed: false };
    }

    if (!hhConfig.USERNAME) {
        return { success: false, reason: 'missing-username' };
    }

    await username.fill(hhConfig.USERNAME);
    return { success: true, usernameUsed: true };
}

async function fillPassword(page, hhConfig) {
    const password = await findFirstVisible(page, PASSWORD_SELECTORS);

    if (!password) {
        return { success: false, reason: 'password-input-not-found' };
    }

    if (!hhConfig.PASSWORD) {
        return { success: false, reason: 'missing-password' };
    }

    await password.fill(hhConfig.PASSWORD);
    return { success: true };
}

function buildAuthFailureMessage(reason, url) {
    const suffix = url ? ` Текущий URL: ${url}.` : '';

    switch (reason) {
        case 'missing-password':
            return `${AUTH_RECOVERY_HINT} У fallback-сценария нет HH_PASSWORD, а hh.ru запросил пароль.${suffix}`;
        case 'missing-username':
            return `${AUTH_RECOVERY_HINT} У fallback-сценария нет HH_USERNAME/HH_LOGIN, а hh.ru запросил логин.${suffix}`;
        case 'password-input-not-found':
        case 'login-submit-not-found':
        case 'login-failed':
            return `${AUTH_RECOVERY_HINT} Автоматический вход в hh.ru не завершился успешно (${reason}).${suffix}`;
        default:
            return `${AUTH_RECOVERY_HINT} Причина: ${reason || 'unknown'}.${suffix}`;
    }
}

async function ensureLoggedIn(page, hhConfig) {
    await page.waitForTimeout(1000);

    if (!(await isLoginPage(page))) {
        return { loggedIn: true, loginAttempted: false };
    }

    console.warn(`hh.ru requires authentication at ${page.url()}`);

    await switchToPasswordMode(page);

    const usernameResult = await fillUsernameIfNeeded(page, hhConfig);
    if (!usernameResult.success) {
        return { loggedIn: false, reason: usernameResult.reason };
    }

    const passwordResult = await fillPassword(page, hhConfig);
    if (!passwordResult.success) {
        return { loggedIn: false, reason: passwordResult.reason };
    }

    const submit = await findFirstVisible(page, SUBMIT_SELECTORS);
    if (!submit) {
        return { loggedIn: false, reason: 'login-submit-not-found' };
    }

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: hhConfig.PAGE_TIMEOUT }).catch(() => {}),
        submit.click(),
    ]);

    await page.waitForLoadState('networkidle', { timeout: hhConfig.PAGE_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(1500);

    if (await isLoginPage(page)) {
        return { loggedIn: false, reason: 'login-failed' };
    }

    return { loggedIn: true, loginAttempted: true };
}

async function clickRaiseButton(page, hhConfig) {
    await page.waitForTimeout(1000);

    for (const selector of RAISE_BUTTON_SELECTORS) {
        const candidate = await findFirstVisible(page, [selector]);

        if (!candidate) {
            continue;
        }

        if (await candidate.isDisabled().catch(() => false)) {
            continue;
        }

        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click();

        const dialog = page.locator('[role="dialog"]');

        if (await dialog.count()) {
            const confirm = await findFirstVisible(dialog, CONFIRM_BUTTON_SELECTORS);

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
            console.warn(buildAuthFailureMessage(reason, page.url()));
            return { success: false, reason: `login-${reason}` };
        }

        const raiseResult = await clickRaiseButton(page, hhConfig);

        if (!raiseResult.success) {
            console.warn(`Кнопка поднятия на hh.ru не найдена или недоступна. URL: ${page.url()}`);
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
