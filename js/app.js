/**
 * Main Application
 * Initializes all modules and starts the game
 */

const App = {
    
    /**
     * Initialize application
     */
    async init() {
        console.log('99.9 v0.3 initializing...');
        
        // Initialize database
        await Database.init();
        
        // Initialize audio
        AudioController.init();
        
        // Initialize UI
        UI.init();
        
        // Landing page is shown by default in HTML
        // User clicks "START OPERATIONS" to call showAuth()
        
        console.log('Ready - landing page active');
    },
    
    /**
     * Show auth screen (called from landing page button)
     */
    showAuth() {
        document.getElementById('landing-screen').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
        this.loadExistingCompanies();
    },
    
    /**
     * Load existing companies list
     */
    loadExistingCompanies() {
        const companies = Database.getAllCompanies();
        const container = document.getElementById('existing-companies');
        
        if (companies.length > 0 && container) {
            container.style.display = 'block';
            container.innerHTML = '<label style="color: var(--accent-dim); font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 10px;">Continue Existing:</label>';
            
            companies.forEach(company => {
                const item = document.createElement('div');
                item.className = 'company-item';
                item.onclick = () => this.loadGame(company.name);
                item.innerHTML = `
                    <span class="company-name">${company.name}</span>
                    <span class="company-date">${new Date(company.last_played).toLocaleDateString()}</span>
                `;
                container.appendChild(item);
            });
        }
    },
    
    /**
     * Back to landing
     */
    showLanding() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('landing-screen').style.display = 'flex';
    },
    
    /**
     * Create new company (called from landing page)
     */
    createCompany() {
        const input = document.getElementById('company-name-input');
        const errorDiv = document.getElementById('company-error');
        const name = input.value.trim();
        
        // Validation
        if (!name) {
            errorDiv.textContent = 'Please enter a company name';
            errorDiv.style.display = 'block';
            AudioController.error();
            return;
        }
        
        if (name.length < 2) {
            errorDiv.textContent = 'Name too short (min 2 characters)';
            errorDiv.style.display = 'block';
            AudioController.error();
            return;
        }
        
        if (Database.companyExists(name)) {
            errorDiv.textContent = 'Company name already exists';
            errorDiv.style.display = 'block';
            AudioController.error();
            return;
        }
        
        // Create game state
        Game.initNewGame(name);
        Database.createCompany(name, Game.getSaveData());
        
        // Success
        AudioController.success();
        this.showBootSequence(name);
    },
    
    /**
     * Load existing game
     */
    loadGame(name) {
        const data = Database.loadCompany(name);
        if (!data) {
            AudioController.error();
            return;
        }
        
        Game.loadGame(data);
        Game.companyName = name;
        AudioController.success();
        this.showBootSequence(name);
    },
    
    /**
     * Show boot sequence
     */
    showBootSequence(companyName) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('boot-screen').style.display = 'block';
        
        const content = document.getElementById('boot-content');
        content.innerHTML = '';
        
        const lines = [
            { text: `99.9 // TERMINAL v0.3 [${companyName.toUpperCase()}]`, type: 'info' },
            { text: 'Copyright (c) 2026 Datacenter Operations Inc.', type: 'info' },
            { text: '', type: '' },
            { text: 'Initializing kernel...', type: '' },
            { text: '[OK] Memory check: 64TB addressable', type: 'ok' },
            { text: '[OK] Storage array: ONLINE', type: 'ok' },
            { text: '[OK] Database: SQLite v3.39 connected', type: 'ok' },
            { text: '[OK] Audio subsystem: Web Audio API', type: 'ok' },
            { text: '', type: '' },
            { text: 'Loading subsystems...', type: '' },
            { text: '[OK] Power management', type: 'ok' },
            { text: '[OK] Cooling control', type: 'ok' },
            { text: '[OK] Ticketing system', type: 'ok' },
            { text: '[OK] Personnel database', type: 'ok' },
            { text: '[OK] Client management', type: 'ok' },
            { text: '', type: '' },
            { text: `Authenticating: ${companyName}...`, type: '' },
            { text: '[OK] Session granted', type: 'ok' },
            { text: '', type: '' },
            { text: 'WARNING: Previous manager status: TERMINATED', type: 'warn' },
            { text: 'MISSION: Achieve 99.9% uptime within 90 days', type: 'warn' },
            { text: '', type: '' },
            { text: 'Loading interface...', type: 'info' }
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            if (i >= lines.length) {
                clearInterval(interval);
                setTimeout(() => this.startGame(), 500);
                return;
            }
            
            const line = lines[i];
            const div = document.createElement('div');
            div.className = `boot-line boot-${line.type}`;
            div.textContent = line.text;
            content.appendChild(div);
            
            // Scroll to bottom
            content.scrollTop = content.scrollHeight;
            
            // Audio feedback
            if (line.type === 'ok') {
                AudioController.beep();
            } else if (line.type === 'warn') {
                AudioController.beep(600, 0.1);
            }
            
            i++;
        }, 100);
    },
    
    /**
     * Start the game
     */
    startGame() {
        document.getElementById('boot-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'grid';
        
        // Update company display
        document.getElementById('company-display').textContent = Game.companyName;
        
        // Start game systems
        Game.start();
        
        // Full UI refresh
        UI.refresh();
        
        // Schedule story events
        setTimeout(() => Story.spawnFirstTicket(), 30000); // First ticket in 30 seconds
        
        console.log('Game started successfully');
    },
    
    /**
     * Save game
     */
    save() {
        if (Game.companyName) {
            Database.saveCompany(Game.companyName, Game.getSaveData());
            UI.log('Game saved', 'success');
        }
    },
    
    /**
     * Toggle settings
     */
    toggleSettings() {
        if (UI.currentView === 'settings') {
            UI.switchView('dashboard');
        } else {
            UI.switchView('settings');
        }
    },
    
    /**
     * Toggle audio setting
     */
    toggleAudio() {
        const enabled = AudioController.toggle();
        const btn = document.getElementById('snd-btn');
        if (btn) {
            btn.textContent = enabled ? 'ON' : 'OFF';
            btn.classList.toggle('active', enabled);
        }
    },
    
    /**
     * Toggle visual effects
     */
    toggleVisual(effect) {
        document.body.classList.toggle(effect);
        const btn = event.target;
        const isActive = document.body.classList.contains(effect);
        btn.textContent = isActive ? 'ON' : 'OFF';
        btn.classList.toggle('active', isActive);
    }
};

// Expose to window for onclick handlers
window.App = App;
window.Game = Game;
window.UI = UI;
window.Story = Story;
window.Systems = Systems;
window.Database = Database;
window.AudioController = AudioController;

// Global navigation functions for HTML onclick
window.showAuth = () => App.showAuth();
window.showLanding = () => App.showLanding();
window.startGame = () => App.createCompany();
window.loadExistingCompanies = () => App.loadExistingCompanies();
window.switchView = (view) => UI.switchView(view);

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
