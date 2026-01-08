import { pool } from './db.js'; 

async function DataBaseIndex() {
    try {
      const client = await pool.connect();
      
      console.log('Creating database indexes...');
      
      await client.query('CREATE INDEX IF NOT EXISTS idx_user_telegramid ON "User" ("telegramId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_server_ip ON "Server" ("ip")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_vpnkey_userid ON "VpnKey" ("userId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_vpnkey_serverid ON "VpnKey" ("serverId")');
      
      console.log('✅ Database indexes created successfully');
      
      client.release();
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }
  
  export default DataBaseIndex;