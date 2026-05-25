export default () => ({
    PORT: process.env.PORT || 3001,
    DATABASE_URL: process.env.DB_URL,
    EMAIL: process.env.EMAIL,
    PASS: process.env.PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET:process.env.JWT_REFRESH_SECRET,
    BEARER: process.env.BEARER,
})