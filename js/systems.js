/**
 * Game Systems Module
 * Power, cooling, client management, random events
 */

const Systems = {
    
    /**
     * Power management
     */
    power: {
        update() {
            // Calculate power usage from clients
            let usage = 0;
            Game.clients.forEach(client => {
                usage += (client.racks || 10) * 0.25; // 0.25 MW per rack
            });
            
            // Base load for infrastructure
            usage += 0.5;
            
            Game.powerUsed = usage;
            
            // Check overload
            if (Game.powerUsed > Game.powerMax) {
                this.overload();
            }
            
            UI.updateResources();
        },
        
        overload() {
            UI.log('⚠️ POWER OVERLOAD! Shutting down non-critical systems!', 'critical');
            AudioController.critical();
            
            // Penalty
            Game.uptime -= 0.5;
            Game.reputation -= 5;
            
            // Auto-shed load
            Game.powerUsed = Game.powerMax * 0.95;
            
            // Message
            Game.addMessage({
                id: Date.now(),
                from: 'FACILITIES ALERT',
                subject: 'CRITICAL: Power Overload Event',
                body: 'Power consumption exceeded capacity. Emergency load shedding activated.\n\nSome client services may be degraded. Immediate action required.',
                urgent: true,
                read: false
            });
        },
        
        upgrade() {
            const cost = 25000; // $25k for 5MW more
            
            if (Game.money < cost) {
                UI.showModal('Error', `Need $${cost} for power upgrade!`, '<button class="btn" onclick="UI.closeModal()">OK</button>');
                return false;
            }
            
            Game.money -= cost;
            Game.powerMax += 5;
            
            UI.log(`🔌 Power upgraded! +5MW capacity ($${cost})`, 'success');
            AudioController.success();
            UI.updateResources();
            Game.save();
            
            return true;
        }
    },
    
    /**
     * Cooling management
     */
    cooling: {
        update() {
            // Cooling degrades over time if not maintained
            if (Math.random() < 0.02) {
                Game.coolingHealth -= 1;
            }
            
            // Check for failures
            if (Game.coolingHealth < 50 && Math.random() < 0.1) {
                this.failure();
            }
            
            // Update UI
            const coolText = document.getElementById('cool-text');
            if (coolText) {
                if (Game.coolingHealth > 80) {
                    coolText.textContent = 'OK';
                    coolText.style.color = 'var(--accent)';
                } else if (Game.coolingHealth > 50) {
                    coolText.textContent = 'WARNING';
                    coolText.style.color = 'var(--warning)';
                } else {
                    coolText.textContent = 'CRITICAL';
                    coolText.style.color = 'var(--error)';
                }
            }
            
            const coolBar = document.getElementById('cool-bar');
            if (coolBar) {
                coolBar.style.width = `${Game.coolingHealth}%`;
            }
        },
        
        failure() {
            UI.log('❄️ COOLING FAILURE! Temperatures rising!', 'critical');
            AudioController.critical();
            
            // Create ticket
            Game.tickets.push({
                id: Date.now(),
                title: 'CRITICAL: AC Unit Failure',
                desc: 'Primary cooling unit has failed. Temperatures rising in all rows.',
                priority: 'P1',
                timeRemaining: 240,
                affectedClients: Game.clients.length,
                penalty: 8000,
                assigned: null,
                resolved: false
            });
            
            UI.updateTicketBadge();
            UI.renderTickets();
        },
        
        maintain() {
            const cost = 5000;
            
            if (Game.money < cost) {
                UI.showModal('Error', `Need $${cost} for maintenance!`, '<button class="btn" onclick="UI.closeModal()">OK</button>');
                return false;
            }
            
            Game.money -= cost;
            Game.coolingHealth = Math.min(100, Game.coolingHealth + 30);
            
            UI.log(`❄️ Cooling maintained! Health restored to ${Game.coolingHealth}%`, 'success');
            AudioController.success();
            Game.save();
            
            return true;
        }
    },
    
    /**
     * Client management
     */
    clients: {
        update() {
            Game.clients.forEach(client => {
                // Satisfaction changes based on uptime
                if (Game.uptime >= client.sla) {
                    client.satisfaction = Math.min(100, client.satisfaction + 0.5);
                } else {
                    client.satisfaction -= 2;
                }
                
                // Check for churn risk
                if (client.satisfaction < 30) {
                    this.churnRisk(client);
                }
                
                // Contract renewal (after 30 days)
                if (Game.day % 30 === 0 && Game.day > 0) {
                    this.renewal(client);
                }
            });
            
            // Remove churned clients
            Game.clients = Game.clients.filter(c => c.satisfaction > 0);
        },
        
        churnRisk(client) {
            if (Math.random() < 0.1) {
                UI.log(`⚠️ ${client.name} threatening to leave! Satisfaction: ${client.satisfaction}%`, 'warning');
                AudioController.alert();
            }
        },
        
        renewal(client) {
            const roll = Math.random();
            const renewalChance = client.satisfaction / 100;
            
            if (roll > renewalChance) {
                // They leave
                UI.log(`💔 ${client.name} didn't renew! Lost $${client.monthlyRevenue}/mo`, 'critical');
                Game.reputation -= 5;
                client.satisfaction = 0; // Will be removed
                AudioController.error();
            } else {
                UI.log(`✅ ${client.name} renewed contract! +$${client.monthlyRevenue}/mo`, 'success');
                client.satisfaction = Math.min(100, client.satisfaction + 10);
            }
        }
    },
    
    /**
     * Random events
     */
    events: {
        list: [
            {
                id: 'disk_failure',
                title: 'Disk Failure',
                message: 'Server DC1-R12 disk showing SMART errors.',
                probability: 0.05,
                action: () => {
                    Game.tickets.push({
                        id: Date.now(),
                        title: 'Disk Failure - DC1-R12',
                        desc: 'Hard drive showing predictive failure signs.',
                        priority: 'P2',
                        timeRemaining: 600,
                        affectedClients: 1,
                        penalty: 1000,
                        assigned: null,
                        resolved: false
                    });
                    UI.updateTicketBadge();
                    UI.log('Disk failure on DC1-R12. Ticket created.', 'warning');
                }
            },
            {
                id: 'vendor_sale',
                title: 'Vendor Sale',
                message: 'Dell offering 20% off servers this week.',
                probability: 0.03,
                action: () => {
                    Game.addMessage({
                        id: Date.now(),
                        from: 'sales@dell.com',
                        subject: 'Flash Sale: 20% Off Servers',
                        body: 'This week only: All PowerEdge servers 20% off.\n\nR740: $8,000 → $6,400\nR750: $12,000 → $9,600\n\nDeal expires in 3 days.',
                        urgent: false,
                        read: false,
                        actions: [
                            { text: 'Order R740 ($6,400)', action: 'Systems.events.buyServer(6400)' },
                            { text: 'Ignore', action: '' }
                        ]
                    });
                    UI.log('Vendor sale: Dell servers 20% off', 'info');
                }
            },
            {
                id: 'power_spike',
                title: 'Power Fluctuation',
                message: 'Brief voltage spike detected.',
                probability: 0.04,
                action: () => {
                    if (Math.random() < 0.3) {
                        UI.log('Power spike caused equipment damage!', 'critical');
                        Game.money -= 2000;
                        Game.uptime -= 0.1;
                    } else {
                        UI.log('Power spike detected. UPS handled it.', 'info');
                    }
                }
            },
            {
                id: 'employee_sick',
                title: 'Staff Sick Day',
                message: 'One NOC tech called in sick.',
                probability: 0.06,
                action: () => {
                    Game.staff.noc.count = Math.max(0, Game.staff.noc.count - 1);
                    UI.log('NOC tech sick. Short staffed today.', 'warning');
                    
                    // Restore after 8 hours
                    setTimeout(() => {
                        Game.staff.noc.count++;
                        UI.log('NOC tech returned to duty.', 'success');
                    }, 8000);
                }
            },
            {
                id: 'network_issue',
                title: 'Network Latency',
                message: 'Increased latency to upstream provider.',
                probability: 0.04,
                action: () => {
                    UI.log('Network latency spike. Investigating...', 'warning');
                    Game.uptime -= 0.05;
                    
                    // Auto-resolve
                    setTimeout(() => {
                        UI.log('Network latency resolved.', 'success');
                    }, 5000);
                }
            },
            {
                id: 'competitor_poach',
                title: 'Competitor Activity',
                message: 'Competitor trying to poach your clients.',
                probability: 0.02,
                action: () => {
                    UI.log('Competitor offering lower prices to your clients!', 'warning');
                    Game.clients.forEach(c => c.satisfaction -= 5);
                }
            }
        ],
        
        trigger() {
            this.list.forEach(event => {
                if (Math.random() < event.probability) {
                    event.action();
                }
            });
        },
        
        buyServer(cost) {
            if (Game.money < cost) {
                UI.showModal('Error', 'Insufficient funds!', '<button class="btn" onclick="UI.closeModal()">OK</button>');
                return;
            }
            
            Game.money -= cost;
            Game.spaceUsed += 1;
            UI.log('New server installed!', 'success');
            AudioController.success();
            UI.updateResources();
            Game.save();
        }
    },
    
    /**
     * Update all systems (called every tick)
     */
    update() {
        this.power.update();
        this.cooling.update();
        this.clients.update();
        
        // Random events
        if (Math.random() < 0.1) {
            this.events.trigger();
        }
        
        // Save periodically
        if (Game.minute === 0) {
            Game.save();
        }
    }
};
