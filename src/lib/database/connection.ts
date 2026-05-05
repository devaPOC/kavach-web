import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. Please check your .env.local file.');
}

// Create the connection
const connectionString = process.env.DATABASE_URL;

// Validate that the connection string looks like a Neon DB URL
if (!connectionString.includes('neon.tech') && !connectionString.includes('localhost')) {
  console.warn('DATABASE_URL does not appear to be a Neon DB connection string');
}

// Create postgres client with connection pooling optimized for Neon DB
const client = postgres(connectionString, {
  max: 1, // Neon DB works better with fewer connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 30, // Increased connection timeout for Neon DB
  ssl: connectionString.includes('neon.tech') ? 'require' : false, // SSL required for Neon, optional for localhost
  connection: {
    application_name: 'kavach-app'
  },
  // Add connection retry parameters
  max_lifetime: 60 * 30, // 30 minutes
  onnotice: () => { }, // Suppress notices in development
});

// Create drizzle instance
export const db = drizzle(client);

// Export the client for direct access if needed
export { client };
