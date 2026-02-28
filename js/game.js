/**
 * Game State & Core Engine
 * Manages all game data and logic
 */

const Game = {
    // Company info
    companyName: null,
    
    // Game time
    day: 1,
    hour: 9,
    minute: 0,
    paused: false,
    gameInterval: null,
    
    // Resources
    money: 100000,
    reputation: 50,
    uptime: 100,
    powerUsed: 0,
    powerMax: 5,
    coolingHealth: 100,
    spaceUsed: 0,
    spaceMax: 100,
    
    // Collections
    messages: [],
    tickets: [],
    clients: [],
    staff: {
        noc: { count: 2, max: 5, salary: 45000, skill: 0.5, mood: 80 },
        l2: { count: 1, max: 3, salary: 65000, skill: 0.8, mood: 85 },
        l3: { count: 0, max: 2, salary: 95000, skill: 0.95, mood: 90 },
        sales: { count: 1, max: 3, salary: 50000, skill: 0.7, mood: 75 },
        facilities: { count: 1, max: 3, salary: 40000, skill: 0.6, mood: 80 }
    },
    
    // Story progression
    storyStage: 'start',
    ticketTimer: null,
    nextEventTime: null,
    
    /**
     * Initialize new game
     */
    initNewGame(companyName) {
        this.companyName = companyName;
        this.day = 1;
        this.hour = 9;
        this.minute = 0;
        this.money = 100000;
        this.reputation = 50;
        this.uptime = 100;
        this.storyStage = 'start';
        
        // Reset collections
        this.messages = [];
        this.tickets = [];
        this.clients = [];
        
        // Reset staff
        this.staff = {
            noc: { count: 2, max: 5, salary: 45000, skill: 0.5, mood: 80 },
            l2: { count: 1, max: 3, salary: 65000, skill: 0.8, mood: 85 },
            l3: { count: 0, max: 2, salary: 95000, skill: 0.95, mood: 90 },
            sales: { count: 1, max: 3, salary: 50000, skill: 0.7, mood: 75 },
            facilities: { count: 1, max: 3, salary: 40000, skill: 0.6, mood: 80 }
        };
        
        // Add starting messages
        this.addStartingMessages();
        console.log(`[DEBUG] Starting messages added: ${this.messages.length} messages`);
        
        // Schedule first events
        this.scheduleEvents();
        
        console.log(`New game initialized: ${companyName}`);
    },
    
    /**
     * Load saved game
     */
    loadGame(data) {
        Object.assign(this, data);
        console.log(`Game loaded: ${this.companyName}, Day ${this.day}`);
    },
    
    /**
     * Get current state for saving
     */
    getSaveData() {
        return {
            companyName: this.companyName,
            day: this.day,
            hour: this.hour,
            minute: this.minute,
            money: this.money,
            reputation: this.reputation,
            uptime: this.uptime,
            powerUsed: this.powerUsed,
            powerMax: this.powerMax,
            coolingHealth: this.coolingHealth,
            spaceUsed: this.spaceUsed,
            spaceMax: this.spaceMax,
            messages: this.messages,
            tickets: this.tickets,
            clients: this.clients,
            staff: this.staff,
            storyStage: this.storyStage
        };
    },
    
    /**
     * Add starting messages
     */
    addStartingMessages() {
        this.addMessage({
            id: 1,
            from: 'CEO@board.com',
            subject: 'Welcome - Urgent',
            body: `Welcome to ${this.companyName}, your new datacenter operation.\n\nYour predecessor... left. We had 3 outages last month. Our reputation is at 50%.\n\nMISSION: Get us to 99.9% uptime within 90 days.\n\nYou have $100k budget. 2 NOC techs and 1 L2 on duty. One AC unit is making weird noises.\n\nDon't disappoint us.`,
            urgent: true,
            read: false
        });
        
        this.addMessage({
            id: 2,
            from: 'NOC Lead',
            subject: 'Shift Status',
            body: '2 NOC techs on duty. Power at 40% capacity. That AC unit in Row 3 is definitely making a grinding noise.\n\nOtherwise quiet... too quiet.',
            urgent: false,
            read: false
        });
    },
    
    /**
     * Schedule story events
     */
    scheduleEvents() {
        // First P1 ticket after 30 seconds
        setTimeout(() => this.spawnFirstTicket(), 30000);
    },
    
    /**
     * Add a message
     */
    addMessage(message) {
        message.id = message.id || Date.now();
        message.timestamp = this.getTimestamp();
        this.messages.unshift(message);
        console.log(`[DEBUG] Message added from ${message.from}, total: ${this.messages.length}`);
        
        // Notify UI
        if (window.UI) {
            UI.updateMessageBadge();
        }
    },
    
    /**
     * Get formatted timestamp
     */
    getTimestamp() {
        return `Day ${this.day} ${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
    },
    
    /**
     * Start game loop
     */
    start() {
        if (this.gameInterval) return;
        
        this.gameInterval = setInterval(() => {
            if (this.paused) return;
            
            this.tick();
        }, 2000); // 2 seconds = 10 game minutes
    },
    
    /**
     * Stop game loop
     */
    stop() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
    },
    
    /**
     * Process one tick
     */
    tick() {
        this.minute += 10;
        
        if (this.minute >= 60) {
            this.minute = 0;
            this.hour++;
            this.hourlyEvents();
        }
        
        if (this.hour >= 24) {
            this.hour = 0;
            this.day++;
            this.dailyEvents();
        }
        
        // Update systems (power, cooling, clients, random events)
        if (window.Systems) {
            Systems.update();
        }
        
        // Update UI
        if (window.UI) {
            UI.updateTime();
        }
    },
    
    /**
     * Hourly events
     */
    hourlyEvents() {
        // Process ticket timers
        this.tickets.forEach(ticket => {
            if (ticket.timeRemaining > 0 && !ticket.resolved) {
                ticket.timeRemaining--;
                
                if (ticket.timeRemaining <= 0) {
                    this.ticketFailed(ticket);
                }
            }
        });
        
        // Staff mood fluctuations
        Object.keys(this.staff).forEach(role => {
            if (Math.random() < 0.1) {
                const change = Math.random() > 0.5 ? 1 : -1;
                this.staff[role].mood = Math.max(0, Math.min(100, 
                    this.staff[role].mood + change));
            }
        });
    },
    
    /**
     * Daily events
     */
    dailyEvents() {
        // Pay salaries
        let totalSalary = 0;
        Object.values(this.staff).forEach(s => {
            totalSalary += (s.count * s.salary) / 365;
        });
        this.money -= Math.floor(totalSalary);
        
        // Client revenue
        let dailyRevenue = 0;
        this.clients.forEach(client => {
            dailyRevenue += client.monthlyRevenue / 30;
        });
        this.money += Math.floor(dailyRevenue);
        
        // Log
        this.log(`Day ${this.day} - Salaries: -$${Math.floor(totalSalary)}, Revenue: +$${Math.floor(dailyRevenue)}`);
        
        // Check end conditions
        this.checkEndConditions();
        
        // Save game
        this.save();
    },
    
    /**
     * Log an event
     */
    log(message, type = 'info') {
        if (window.UI) {
            UI.log(message, type);
        }
    },
    
    /**
     * Save game to database
     */
    save() {
        if (this.companyName && window.Database) {
            Database.saveCompany(this.companyName, this.getSaveData());
        }
    },
    
    /**
     * Check win/lose conditions
     */
    checkEndConditions() {
        // Lose: Bankruptcy
        if (this.money < -50000) {
            this.triggerGameOver('Bankrupt! The bank seized your assets.');
        }
        
        // Lose: Reputation
        if (this.reputation <= 0) {
            this.triggerGameOver('Fired! The board lost confidence in your leadership.');
        }
        
        // Win: 90 days at 99.9% uptime
        if (this.day >= 90 && this.uptime >= 99.9) {
            this.triggerGameWin('Perfect! 90 days at 99.9% uptime!');
        }
        
        // Win: $1M monthly revenue
        const monthlyRevenue = this.clients.reduce((sum, c) => sum + c.monthlyRevenue, 0);
        if (monthlyRevenue >= 1000000) {
            this.triggerGameWin('Champion! $1M monthly revenue achieved!');
        }
    },
    
    triggerGameOver(reason) {
        this.stop();
        if (window.UI) {
            UI.showGameOver(reason);
        }
    },
    
    triggerGameWin(reason) {
        this.stop();
        if (window.UI) {
            UI.showGameWin(reason);
        }
    },
    
    // Story events implemented in story.js
    spawnFirstTicket() {},
    ticketFailed() {},
    randomEvent() {}
};
