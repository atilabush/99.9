/**
 * UI Controller
 * Handles all DOM updates and user interface
 */

const UI = {
    currentView: 'dashboard',
    
    /**
     * Initialize UI
     */
    init() {
        this.setupEventListeners();
        this.updateTime();
        this.updateResources();
    },
    
    /**
     * Setup keyboard shortcuts and event listeners
     */
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                if (this.currentView === 'settings') {
                    this.switchView('dashboard');
                }
            }
            if (e.key === ' ') {
                e.preventDefault();
                Game.paused = !Game.paused;
                this.log(Game.paused ? 'GAME PAUSED' : 'GAME RESUMED', 'warning');
            }
        });
    },
    
    /**
     * Switch between views
     */
    switchView(viewName) {
        console.log(`[DEBUG] switchView called: ${viewName}`);
        this.currentView = viewName;
        
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.module-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        
        // Show selected view
        const viewEl = document.getElementById(`view-${viewName}`);
        if (viewEl) {
            viewEl.classList.add('active');
            console.log(`[DEBUG] Activated view: view-${viewName}`);
        } else {
            console.error(`[DEBUG] View not found: view-${viewName}`);
        }
        
        // Highlight desktop nav button
        const navBtn = document.querySelector(`.module-btn[data-view="${viewName}"]`);
        if (navBtn) navBtn.classList.add('active');
        
        // Highlight mobile nav button
        const mobileNavBtn = document.querySelector(`.mobile-nav-btn[data-view="${viewName}"]`);
        if (mobileNavBtn) mobileNavBtn.classList.add('active');
        
        // Update header
        const titleEl = document.getElementById('view-title');
        if (titleEl) titleEl.textContent = `// ${viewName.toUpperCase()}`;
        
        AudioController.beep();
        
        // Refresh view content
        this.refreshView(viewName);
    },
    
    /**
     * Refresh view content
     */
    refreshView(viewName) {
        switch(viewName) {
            case 'messages':
                this.renderMessages();
                break;
            case 'tickets':
                this.renderTickets();
                break;
            case 'personnel':
                this.renderStaff();
                break;
            case 'clients':
                this.renderClients();
                break;
        }
    },
    
    /**
     * Update time display
     */
    updateTime() {
        const timeEl = document.getElementById('game-time');
        const dayEl = document.getElementById('day-display');
        
        if (timeEl) {
            timeEl.textContent = `${String(Game.hour).padStart(2, '0')}:${String(Game.minute).padStart(2, '0')}`;
        }
        if (dayEl) {
            dayEl.textContent = Game.day;
        }
    },
    
    /**
     * Update resource displays
     */
    updateResources() {
        // Money
        const fundsEl = document.getElementById('funds-display');
        if (fundsEl) {
            fundsEl.textContent = `$${(Game.money / 1000).toFixed(1)}k`;
        }
        
        // Reputation
        const repEl = document.getElementById('rep-display');
        if (repEl) {
            repEl.textContent = Game.reputation;
            repEl.className = 'value ' + (Game.reputation < 30 ? 'critical' : Game.reputation < 50 ? 'warning' : '');
        }
        
        // Uptime
        const uptimeEl = document.getElementById('uptime-display');
        if (uptimeEl) {
            uptimeEl.textContent = `${Game.uptime.toFixed(2)}%`;
        }
        
        // Power
        const pwrText = document.getElementById('pwr-text');
        const pwrBar = document.getElementById('pwr-bar');
        if (pwrText && pwrBar) {
            pwrText.textContent = `${Game.powerUsed}/${Game.powerMax}MW`;
            pwrBar.style.width = `${(Game.powerUsed / Game.powerMax) * 100}%`;
        }
        
        // Dashboard stats
        const dashMoney = document.getElementById('dash-money');
        const dashClients = document.getElementById('dash-clients');
        if (dashMoney) dashMoney.textContent = `$${(Game.money / 1000).toFixed(0)}k`;
        if (dashClients) dashClients.textContent = Game.clients.length;
    },
    
    /**
     * Update message badge (desktop + mobile)
     */
    updateMessageBadge() {
        const unread = Game.messages.filter(m => !m.read).length;
        
        // Desktop badge
        const badge = document.getElementById('msg-badge');
        if (badge) {
            badge.style.display = unread > 0 ? 'inline' : 'none';
            badge.textContent = unread;
        }
        
        // Mobile badge
        const mobileBadge = document.getElementById('mobile-msg-badge');
        if (mobileBadge) {
            mobileBadge.style.display = unread > 0 ? 'inline' : 'none';
            mobileBadge.textContent = unread;
        }
    },
    
    /**
     * Update ticket badge (desktop + mobile)
     */
    updateTicketBadge() {
        const active = Game.tickets.filter(t => !t.resolved).length;
        
        // Desktop badge
        const badge = document.getElementById('ticket-badge');
        if (badge) {
            badge.style.display = active > 0 ? 'inline' : 'none';
            badge.textContent = active;
        }
        
        // Mobile badge
        const mobileBadge = document.getElementById('mobile-ticket-badge');
        if (mobileBadge) {
            mobileBadge.style.display = active > 0 ? 'inline' : 'none';
            mobileBadge.textContent = active;
        }
    },
    
    /**
     * Render messages list
     */
    renderMessages() {
        console.log(`[DEBUG] renderMessages called, messages count: ${Game.messages.length}`);
        const container = document.getElementById('message-list');
        if (!container) {
            console.error('[DEBUG] message-list container not found');
            return;
        }
        
        if (Game.messages.length === 0) {
            console.log('[DEBUG] No messages to render');
            container.innerHTML = '<p style="color: #505060; text-align: center; margin-top: 20px;">No messages</p>';
            return;
        }
        
        container.innerHTML = Game.messages.map(msg => `
            <div class="email-item ${msg.read ? 'read' : ''} ${msg.urgent ? 'critical' : ''}" onclick="UI.readMessage(${msg.id})">
                <div class="email-sender">${msg.from}</div>
                <div class="email-subject">${msg.subject}</div>
                ${!msg.read ? '<span style="color: var(--warning); font-size: 10px;">[UNREAD]</span>' : ''}
            </div>
        `).join('');
        
        this.updateMessageBadge();
    },
    
    /**
     * Read a message
     */
    readMessage(id) {
        const msg = Game.messages.find(m => m.id === id);
        if (!msg) return;
        
        msg.read = true;
        this.updateMessageBadge();
        this.renderMessages(); // CRITICAL FIX: Re-render list to show read status
        
        // Show in modal
        this.showModal(msg.subject, `
            <div style="margin-bottom: 15px; color: var(--accent-dim);">From: ${msg.from}</div>
            <div style="white-space: pre-line; line-height: 1.6;">${msg.body}</div>
        `, `
            <button class="btn" onclick="UI.closeModal()">Close</button>
            ${msg.actions ? msg.actions.map(a => `<button class="btn ${a.type || ''}" onclick="${a.action}; UI.closeModal();">${a.text}</button>`).join('') : ''}
        `);
        
        AudioController.beep();
        
        // Save game
        Game.save();
    },
    
    /**
     * Render tickets list
     */
    renderTickets() {
        const container = document.getElementById('ticket-list');
        if (!container) return;
        
        const active = Game.tickets.filter(t => !t.resolved);
        
        if (active.length === 0) {
            container.innerHTML = '<p style="color: #505060; text-align: center; margin-top: 20px;">No active tickets</p>';
            return;
        }
        
        container.innerHTML = active.map(ticket => `
            <div class="ticket-item ${ticket.priority === 'P1' ? 'critical' : ''}" onclick="UI.viewTicket(${ticket.id})">
                <div class="ticket-priority">${ticket.priority} | #${String(ticket.id).padStart(3, '0')}</div>
                <div class="ticket-title">${ticket.title}</div>
                ${ticket.timeRemaining ? `<div class="ticket-timer">⏱️ ${Math.floor(ticket.timeRemaining / 60)}:${String(ticket.timeRemaining % 60).padStart(2, '0')} remaining</div>` : ''}
                ${ticket.assigned ? `<div style="font-size: 10px; color: var(--accent); margin-top: 4px;">Assigned: ${ticket.assigned.toUpperCase()}</div>` : ''}
            </div>
        `).join('');
    },
    
    /**
     * View ticket details
     */
    viewTicket(id) {
        const ticket = Game.tickets.find(t => t.id === id);
        if (!ticket || ticket.resolved) return;
        
        this.showModal(`TICKET #${String(id).padStart(3, '0')}: ${ticket.title}`, `
            <div style="margin-bottom: 15px;">
                <span style="color: ${ticket.priority === 'P1' ? 'var(--error)' : 'var(--warning)'};">${ticket.priority}</span>
                ${ticket.timeRemaining ? `<span style="color: var(--error); margin-left: 15px;">⏱️ ${Math.floor(ticket.timeRemaining / 60)}:${String(ticket.timeRemaining % 60).padStart(2, '0')}</span>` : ''}
            </div>
            <div style="white-space: pre-line; line-height: 1.6; margin-bottom: 15px;">${ticket.desc}</div>
            <div style="color: var(--accent-dim); font-size: 11px;">
                Affected: ${ticket.affectedClients} clients, ${ticket.affectedServers || 'unknown'} servers<br>
                SLA Breach Cost: $${ticket.penalty || '5000'}
            </div>
        `, `
            ${!ticket.assigned ? `
                <button class="btn" onclick="Story.assignTicket(${id}, 'noc')">Assign to NOC (50%)</button>
                <button class="btn" onclick="Story.assignTicket(${id}, 'l2')">Assign to L2 (80%)</button>
                <button class="btn warning" onclick="Story.assignTicket(${id}, 'vendor')">Call Vendor ($2000)</button>
            ` : '<button class="btn" onclick="UI.closeModal()">In Progress...</button>'}
        `);
    },
    
    /**
     * Render staff list
     */
    renderStaff() {
        const container = document.getElementById('staff-list');
        if (!container) return;
        
        const roles = {
            noc: { name: 'NOC Technicians', icon: '👁️' },
            l2: { name: 'L2 Support', icon: '🔧' },
            l3: { name: 'L3 Engineers', icon: '⚙️' },
            sales: { name: 'Sales Team', icon: '💼' },
            facilities: { name: 'Facilities', icon: '🔨' }
        };
        
        container.innerHTML = Object.entries(Game.staff).map(([key, data]) => {
            const role = roles[key];
            return `
                <div style="margin: 10px 0; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-bright);">${role.icon} ${role.name}</span>
                        <span style="color: ${data.count >= data.max ? 'var(--error)' : 'var(--accent)'};">${data.count}/${data.max}</span>
                    </div>
                    <div style="font-size: 10px; color: #606070; margin-top: 5px;">
                        $${(data.salary / 1000).toFixed(0)}k/yr • Mood: ${data.mood}%
                    </div>
                </div>
            `;
        }).join('') + `
            <button class="btn" style="width: 100%; margin-top: 15px;" onclick="Story.showHiring()">+ Hire Staff</button>
        `;
    },
    
    /**
     * Render clients list
     */
    renderClients() {
        const container = document.getElementById('client-list');
        if (!container) return;
        
        if (Game.clients.length === 0) {
            container.innerHTML = '<p style="color: #505060; text-align: center; margin-top: 20px;">No active clients</p>';
            return;
        }
        
        container.innerHTML = Game.clients.map(client => `
            <div style="margin: 10px 0; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border);">
                <div style="color: var(--text-bright);">${client.name}</div>
                <div style="font-size: 10px; color: #606070; margin-top: 5px;">
                    $${(client.monthlyRevenue / 1000).toFixed(0)}k/mo • ${client.sla}% SLA
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Add log entry
     */
    log(message, type = 'info') {
        const log = document.getElementById('activity-log');
        if (!log) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `<span class="log-time">[${Game.getTimestamp()}]</span>${message}`;
        
        log.insertBefore(entry, log.firstChild);
        
        // Keep only last 50
        while (log.children.length > 50) {
            log.removeChild(log.lastChild);
        }
        
        // Also add to dashboard alerts
        const alertLog = document.getElementById('alert-log');
        if (alertLog && type !== 'info') {
            const alertEntry = document.createElement('div');
            alertEntry.className = `log-entry ${type}`;
            alertEntry.innerHTML = `<span class="log-time">[${Game.getTimestamp()}]</span>${message}`;
            alertLog.insertBefore(alertEntry, alertLog.firstChild);
        }
    },
    
    /**
     * Show modal
     */
    showModal(title, body, actions = '') {
        const modal = document.getElementById('modal');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        const actionsEl = document.getElementById('modal-actions');
        
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.innerHTML = body;
        if (actionsEl) actionsEl.innerHTML = actions;
        
        if (modal) modal.classList.add('active');
    },
    
    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) modal.classList.remove('active');
    },
    
    /**
     * Show game over
     */
    showGameOver(reason) {
        this.showModal('GAME OVER', `
            <div style="color: var(--error); font-size: 18px; text-align: center; margin-bottom: 20px;">💀</div>
            <div style="text-align: center; margin-bottom: 20px;">${reason}</div>
            <div style="text-align: center; color: #606060;">You survived ${Game.day} days</div>
        `, `
            <button class="btn" onclick="location.reload()">Try Again</button>
        `);
        AudioController.critical();
    },
    
    /**
     * Show game win
     */
    showGameWin(reason) {
        this.showModal('VICTORY!', `
            <div style="color: var(--accent); font-size: 18px; text-align: center; margin-bottom: 20px;">🏆</div>
            <div style="text-align: center; margin-bottom: 20px;">${reason}</div>
            <div style="text-align: center; color: #606060;">Achieved in ${Game.day} days</div>
        `, `
            <button class="btn" onclick="location.reload()">Play Again</button>
        `);
        AudioController.success();
    },
    
    /**
     * Full UI refresh
     */
    refresh() {
        this.updateTime();
        this.updateResources();
        this.updateMessageBadge();
        this.updateTicketBadge();
        this.refreshView(this.currentView);
    }
};
