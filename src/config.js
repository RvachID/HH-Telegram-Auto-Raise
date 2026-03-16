const env = process.env;

const TELEGRAM_REPLY_WAIT = Number(env.TELEGRAM_REPLY_WAIT || 120000);

const HH_CONFIG = {
    RESUMES_URL: env.HH_RESUMES_URL || 'https://hh.ru/applicant/resumes',
    LOGIN_URL: env.HH_LOGIN_URL || 'https://hh.ru/account/login?backurl=%2Fapplicant%2Fresumes',
    USERNAME: env.HH_USERNAME || env.HH_LOGIN || '',
    PASSWORD: env.HH_PASSWORD || '',
    PAGE_TIMEOUT: Number(env.HH_PAGE_TIMEOUT || 60000),
    POST_ACTION_WAIT: Number(env.HH_POST_ACTION_WAIT || 4000),
};

module.exports = {
    BOT_USERNAME: 'hh_rabota_bot',
    STORAGE_PATH: './storageState.json',

    TIMEOUTS: {
        PAGE_LOAD: 5000,
        AFTER_CABINET: 7000,
        AFTER_RAISE: 5000,
        AFTER_CONFIRM: 8000,
        LOGIN_WAIT: 120000, // 2 минуты
        BOT_REPLY: TELEGRAM_REPLY_WAIT,
    },

    FIRST_LOGIN_WAIT: true,

    HH: HH_CONFIG,
};
