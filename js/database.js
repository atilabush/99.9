/**
 * Database Module
 * SQLite wrapper for game state persistence
 */

const Database = {
    db: null,
    SQL: null,

    /**
     * Initialize SQLite database
     */
    async init() {
        try {
            this.SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            this.db = new this.SQL.Database();
            
            // Create tables
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS companies (
                    name TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_played DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            console.log('Database initialized');
            return true;
        } catch (e) {
            console.error('Database init failed:', e);
            return false;
        }
    },

    /**
     * Check if company name exists
     */
    companyExists(name) {
        try {
            const stmt = this.db.prepare("SELECT COUNT(*) as count FROM companies WHERE name = ?");
            stmt.bind([name]);
            stmt.step();
            const result = stmt.getAsObject();
            stmt.free();
            return result.count > 0;
        } catch (e) {
            console.error('Exists check failed:', e);
            return false;
        }
    },

    /**
     * Create new company
     */
    createCompany(name, initialData) {
        try {
            if (this.companyExists(name)) {
                return { success: false, error: 'Company name already exists' };
            }

            const data = JSON.stringify(initialData);
            this.db.run(
                "INSERT INTO companies (name, data) VALUES (?, ?)",
                [name, data]
            );

            return { success: true };
        } catch (e) {
            console.error('Create company failed:', e);
            return { success: false, error: e.message };
        }
    },

    /**
     * Load company data
     */
    loadCompany(name) {
        try {
            const stmt = this.db.prepare("SELECT data FROM companies WHERE name = ?");
            stmt.bind([name]);
            
            if (stmt.step()) {
                const result = stmt.getAsObject();
                stmt.free();
                
                // Update last played
                this.db.run(
                    "UPDATE companies SET last_played = CURRENT_TIMESTAMP WHERE name = ?",
                    [name]
                );
                
                return JSON.parse(result.data);
            }
            
            stmt.free();
            return null;
        } catch (e) {
            console.error('Load company failed:', e);
            return null;
        }
    },

    /**
     * Save company data
     */
    saveCompany(name, data) {
        try {
            const jsonData = JSON.stringify(data);
            this.db.run(
                "UPDATE companies SET data = ?, last_played = CURRENT_TIMESTAMP WHERE name = ?",
                [jsonData, name]
            );
            return true;
        } catch (e) {
            console.error('Save company failed:', e);
            return false;
        }
    },

    /**
     * Get list of all companies
     */
    getAllCompanies() {
        try {
            const stmt = this.db.prepare(
                "SELECT name, created_at, last_played FROM companies ORDER BY last_played DESC LIMIT 10"
            );
            const companies = [];
            
            while (stmt.step()) {
                companies.push(stmt.getAsObject());
            }
            
            stmt.free();
            return companies;
        } catch (e) {
            console.error('Get companies failed:', e);
            return [];
        }
    },

    /**
     * Export database to Uint8Array (for saving to file)
     */
    export() {
        try {
            return this.db.export();
        } catch (e) {
            console.error('Export failed:', e);
            return null;
        }
    },

    /**
     * Import database from Uint8Array
     */
    import(data) {
        try {
            this.db = new this.SQL.Database(data);
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }
};
