/* eslint-disable prettier/prettier */
export default {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY || '',
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || '',
    baseUrl: process.env.PESAPAL_BASE_URL || '',
    smsUrl: process.env.SMS_URL || '',
    payment_callback: process.env.PAYMENT_CALLBACK || '',
    IPN_url: process.env.IPN_URL || '',
    currency: process.env.CURRENCY || '',
    merchant_type: process.env.MERCHANT_TYPE || '',

    mongodb_server: process.env.MONGODB_SERVER || '',
    main_server_url: process.env.MAIN_SERVER_URL || '',

    mailerID: process.env.GOOGLE_CLIENT_ID || '',
    mailerSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    mailerRedirect: process.env.GOOGLE_REDIRECT_URI || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    mailerEmail: process.env.MAILER_EMAIL || '',
    mailerPassword: process.env.MAILER_PASSWORD || '',

    loginPageURL: process.env.LOGIN_PAGE_URL || '',
    redisURL: process.env.REDIS_URL || '',

    adminName: process.env.ADMIN_NAME || '',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    controllerID: process.env.CONTROLLER_ID || '',

    decryptionSecretKey: process.env.DECRYPTION_SECRET_KEY || '',

    platformRevenueConstant: 400
}
