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

async function waitForBotReply(page, timeoutMs) {
    const waitTimeout = typeof timeoutMs === 'number' ? timeoutMs : 120000;

    try {
        const result = await page.evaluate(
            ({ timeout }) =>
                new Promise((resolve) => {
                    const containerSelectors = [
                        '[data-testid="message-list"]',
                        'div.message-list',
                        'div.MessageList',
                        'section[data-testid="chat"]',
                        'section[aria-label*="сообщения"]',
                        'section[aria-label*="messages"]',
                    ];

                    const messageSelectors = [
                        '[data-mid]',
                        '[data-message-id]',
                        'div.message',
                        'div.Message',
                    ];

                    const isIncoming = (element) => {
                        if (!(element instanceof HTMLElement)) {
                            return null;
                        }

                        const node = element.closest('[data-mid]') || element.closest('[data-message-id]') || element;

                        if (!(node instanceof HTMLElement)) {
                            return null;
                        }

                        const dataset = node.dataset || {};

                        if (
                            dataset.out === 'true' ||
                            dataset.own === 'true' ||
                            node.classList.contains('own') ||
                            node.classList.contains('is-outgoing')
                        ) {
                            return null;
                        }

                        const id = dataset.mid || dataset.messageId || node.getAttribute('data-mid') || node.getAttribute('data-message-id');
                        const text = node.innerText ? node.innerText.trim() : '';

                        if (!id && !text) {
                            return null;
                        }

                        return {
                            id: id || text,
                            text,
                        };
                    };

                    let container = null;

                    for (const selector of containerSelectors) {
                        const candidate = document.querySelector(selector);

                        if (candidate) {
                            container = candidate;
                            break;
                        }
                    }

                    if (!container) {
                        resolve({ success: false, reason: 'container-not-found' });
                        return;
                    }

                    const captureLastIncoming = () => {
                        for (const selector of messageSelectors) {
                            const nodes = container.querySelectorAll(selector);

                            if (!nodes.length) {
                                continue;
                            }

                            for (let i = nodes.length - 1; i >= 0; i -= 1) {
                                const incoming = isIncoming(nodes[i]);

                                if (incoming) {
                                    return incoming;
                                }
                            }
                        }

                        return null;
                    };

                    const initial = captureLastIncoming();

                    const observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            for (const node of mutation.addedNodes) {
                                const incoming = isIncoming(node) || isIncoming(node.parentElement || null);

                                if (incoming && (!initial || incoming.id !== initial.id)) {
                                    observer.disconnect();
                                    resolve({ success: true, payload: incoming });
                                    return;
                                }
                            }
                        }

                        const current = captureLastIncoming();

                        if (current && (!initial || current.id !== initial.id)) {
                            observer.disconnect();
                            resolve({ success: true, payload: current });
                        }
                    });

                    observer.observe(container, { childList: true, subtree: true });

                    setTimeout(() => {
                        observer.disconnect();
                        resolve({ success: false, reason: 'timeout' });
                    }, timeout);
                }),
            { timeout: waitTimeout }
        );

        if (result && result.success) {
            return { received: true, payload: result.payload || null };
        }

        return { received: false, reason: result ? result.reason : 'unknown' };
    } catch (error) {
        return { received: false, reason: error.message };
    }
}


module.exports = {
    openBotMenu,
    clickMenuItem,
    ensureMainMenu,
    waitForBotReply,
};

