async function openBotMenu(page) {
    const menuToggle = page.locator('button.toggle-reply-markup');
    await menuToggle.first().waitFor({ timeout: 10000 });
    await menuToggle.first().hover();

    const keyboard = page.locator('div.reply-keyboard.active');
    await keyboard.waitFor({ timeout: 5000 });

    return keyboard;
}

async function clickMenuItem(page, text) {
    const keyboard = page.locator('div.reply-keyboard.active');
    const item = keyboard.locator(`text=${text}`);

    if (await item.count() === 0) {
        return false;
    }

    await item.first().click();
    return true;
}

async function ensureMainMenu(page) {
    await openBotMenu(page);

    const keyboard = page.locator('div.reply-keyboard.active');

    const backToStart = keyboard.locator('text=В начало');

    if (await backToStart.count() > 0) {
        console.log('Обнаружено меню навигации, нажимаем "В начало"');
        await backToStart.first().click();
        await page.waitForTimeout(4000);

        // после возврата меню нужно открыть заново
        await openBotMenu(page);
    }
}


module.exports = {
    openBotMenu,
    clickMenuItem,
    ensureMainMenu,
};

