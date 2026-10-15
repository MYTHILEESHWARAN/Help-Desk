// Global test setup — runs before all test files
// Sets test environment variables so they don't depend on a .env file
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_at_least_32_characters_long";
process.env.SEED_PASSWORD = "TestPassword1!";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.EMBEDDINGS_PROVIDER = "none";
process.env.SLA_URGENT_HOURS = "4";
process.env.SLA_HIGH_HOURS = "8";
process.env.SLA_MEDIUM_HOURS = "24";
process.env.SLA_LOW_HOURS = "72";
