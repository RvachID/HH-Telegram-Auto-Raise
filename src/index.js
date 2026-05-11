const { chromium } = require('playwright');
const fs = require('fs');
const config = require('./config');
const {
    openBotMenu,
    clickMenuItem,
    ensureMainMenu,
    waitForBotReply,
    isSuspendedReply,
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

        const runFallbackViaHH = async (reason) => {
            console.warn(`${reason} Falling back to hh.ru.`);

            const fallbackResult = await raiseResumeViaHH(context, config.HH);

            if (!fallbackResult.success) {
                console.warn(`Fallback via hh.ru failed: ${fallbackResult.reason || 'unknown'}`);
                return false;
            }

            console.log('Fallback via hh.ru finished successfully.');
            return true;
        };

        console.log('Opening Telegram Web');
        await page.goto(`https://web.telegram.org/k/#@${config.BOT_USERNAME}`);

        // First Telegram login flow.
        if (!hasSession && config.FIRST_LOGIN_WAIT) {
            console.log('Waiting for the initial Telegram login to complete');
            await page.waitForTimeout(config.TIMEOUTS.LOGIN_WAIT);

            console.log('Saving Telegram session');
            await page.context().storageState({ path: config.STORAGE_PATH });

            console.log('Initial login finished, stopping current run');
            return;
        }

        await page.waitForTimeout(config.TIMEOUTS.PAGE_LOAD);

        try {
            console.log('Ensuring the bot is on the main menu');
            await ensureMainMenu(page);

            console.log('Opening menu -> Personal account');
            await openBotMenu(page);
            await clickMenuItem(page, 'Личный кабинет');
            await page.waitForTimeout(config.TIMEOUTS.AFTER_CABINET);

            console.log('Opening menu -> Raise resume');
            await openBotMenu(page);
            await clickMenuItem(page, 'Поднять резюме в поиске');
            await page.waitForTimeout(config.TIMEOUTS.AFTER_RAISE);

            console.log('Reopening menu to check the confirm button');
            await openBotMenu(page);

            const confirmed = await clickMenuItem(page, 'Поднять');

            if (confirmed) {
                console.log('Confirm button was found and clicked');
                await page.waitForTimeout(config.TIMEOUTS.AFTER_CONFIRM);

                const reply = await waitForBotReply(page, config.TIMEOUTS.BOT_REPLY);

                if (reply.received) {
                    const replyText = reply.payload?.text || '';
                    const preview = replyText ? ` (${replyText.slice(0, 80)})` : '';
                    console.log(`Bot reply received${preview}`);

                    if (isSuspendedReply(replyText)) {
                        await runFallbackViaHH('Bot returned "Sorry, operation has been temporarily suspended".');
                    }
                } else {
                    await runFallbackViaHH('Bot reply did not arrive within the expected timeout.');
                }
            } else {
                console.log('Telegram confirm button is missing, switching to hh.ru directly');
                const fallbackResult = await raiseResumeViaHH(context, config.HH);

                if (!fallbackResult.success) {
                    console.warn(`Direct hh.ru fallback failed: ${fallbackResult.reason || 'unknown'}`);
                } else {
                    console.log('Fallback via hh.ru finished successfully because Telegram did not show the confirm button.');
                }
            }
        } catch (telegramError) {
            console.warn(`Telegram flow failed before completion: ${telegramError.message}`);
            await runFallbackViaHH('Telegram UI automation failed.');
        }

        console.log('Scenario finished');

        try {
            await context.storageState({ path: config.STORAGE_PATH });
        } catch (error) {
            console.warn(`Failed to refresh storageState: ${error.message}`);
        }
    } catch (error) {
        console.error('Scenario failed with an error:', error);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
