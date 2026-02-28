/**
 * Story & Events Module
 * Handles all gameplay events, tickets, and story progression
 */

const Story = {
    
    /**
     * Spawn the first P1 ticket (router overheating)
     */
    spawnFirstTicket() {
        if (Game.storyStage !== 'start') return;
        Game.storyStage = 'first_ticket';
        
        const ticket = {
            id: 1,
            title: 'CRITICAL: Core Router Overheating',
            desc: 'DC1-R01 temperature at 85°C (threshold: 75°C).\n\nFan failure suspected. Immediate action required or automatic thermal shutdown will occur.',
            priority: 'P1',
            timeRemaining: 300, // 5 minutes
            affectedClients: 3,
            affectedServers: 150,
            penalty: 5000,
            assigned: null,
            resolved: false
        };
        
        Game.tickets.push(ticket);
        
        // Alert message
        Game.addMessage({
            id: Date.now(),
            from: 'MONITORING ALERT',
            subject: 'P1 TICKET CREATED #001 - IMMEDIATE ACTION',
            body: `AUTOMATED CRITICAL ALERT:\n\nRouter DC1-R01 OVERHEATING\n- Temperature: 85°C (CRITICAL)\n- Status: Above 75°C threshold\n- Impact: 150 servers, 3 clients\n- Auto-shutdown in: 5 minutes\n\nASSIGN TECHNICIAN NOW!`,
            urgent: true,
            read: false
        });
        
        // Start countdown
        AudioController.critical();
        UI.log('🚨 P1 TICKET #001: Router overheating! 5 min to failure!', 'critical');
        UI.updateTicketBadge();
        UI.renderTickets();
    },
    
    /**
     * Assign ticket to team
     */
    assignTicket(ticketId, assignee) {
        const ticket = Game.tickets.find(t => t.id === ticketId);
        if (!ticket || ticket.resolved) return;
        
        // Check if staff available
        if (assignee !== 'vendor' && Game.staff[assignee].count === 0) {
            UI.showModal('Error', 'No staff available in this role!', '<button class="btn" onclick="UI.closeModal()">OK</button>');
            AudioController.error();
            return;
        }
        
        ticket.assigned = assignee;
        
        let successChance, cost, timeReduction, skillText;
        
        switch(assignee) {
            case 'noc':
                successChance = Game.staff.noc.skill;
                cost = 0;
                timeReduction = 120; // 2 min
                skillText = 'NOC Techs (50% base skill)';
                break;
            case 'l2':
                successChance = Game.staff.l2.skill;
                cost = 0;
                timeReduction = 180; // 3 min
                skillText = 'L2 Support (80% base skill)';
                break;
            case 'vendor':
                successChance = 1.0;
                cost = 2000;
                timeReduction = 60; // 1 min
                skillText = 'Vendor Support (100%, $2000)';
                break;
        }
        
        // Apply cost
        Game.money -= cost;
        
        // Reduce timer
        ticket.timeRemaining = Math.max(0, ticket.timeRemaining - timeReduction);
        
        UI.log(`Ticket #${ticketId} assigned to ${assignee.toUpperCase()}. Resolving...`, 'info');
        UI.closeModal();
        UI.updateResources();
        UI.renderTickets();
        
        // Simulate resolution time
        setTimeout(() => {
            if (ticket.resolved) return; // Already handled
            
            const roll = Math.random();
            const success = roll < successChance;
            
            if (success) {
                this.resolveTicket(ticket, assignee);
            } else {
                // Failed - reset assignment, keep timer running
                ticket.assigned = null;
                UI.log(`${assignee.toUpperCase()} failed to resolve! Roll again or try different team.`, 'warning');
                AudioController.error();
                UI.renderTickets();
            }
        }, 2000);
    },
    
    /**
     * Resolve a ticket successfully
     */
    resolveTicket(ticket, method) {
        ticket.resolved = true;
        
        // Rewards
        Game.reputation += 10;
        UI.log(`✅ TICKET #${ticket.id} RESOLVED via ${method.toUpperCase()}! Reputation +10`, 'success');
        AudioController.success();
        
        // CEO message
        Game.addMessage({
            id: Date.now(),
            from: 'CEO@board.com',
            subject: 'Crisis Averted - Good Work',
            body: `The router is stabilized and temperatures are back to normal.\n\nThat was close. Our clients didn't notice... this time.\n\nReputation is recovering. Keep monitoring that AC unit.`,
            urgent: false,
            read: false
        });
        
        // UI Updates - CRITICAL FIX
        UI.updateTicketBadge();
        UI.renderTickets();
        UI.updateResources();
        UI.updateMessageBadge();
        
        // Save game
        Game.save();
        
        // Schedule next event
        setTimeout(() => this.spawnClientOffer(), 10000);
    },
    
    /**
     * Ticket failed (timer ran out)
     */
    ticketFailed(ticket) {
        ticket.resolved = true;
        
        // Penalties
        Game.reputation -= 15;
        Game.money -= ticket.penalty;
        Game.uptime -= 2.5;
        
        UI.log(`💥 TICKET #${ticket.id} FAILED! Router down! Rep -15, $${ticket.penalty} penalty`, 'critical');
        AudioController.critical();
        
        // Angry CEO message
        Game.addMessage({
            id: Date.now(),
            from: 'CEO@board.com',
            subject: 'RE: The Outage',
            body: `That router failure just cost us $${ticket.penalty} in SLA penalties and 3 angry clients.\n\nThis is your ONE warning. Next time, act faster or escalate immediately.\n\nThe board is watching.`,
            urgent: true,
            read: false
        });
        
        // Still give them the client opportunity
        setTimeout(() => this.spawnClientOffer(), 15000);
        UI.updateTicketBadge();
        UI.updateResources();
    },
    
    /**
     * Spawn client offer
     */
    spawnClientOffer() {
        if (Game.storyStage !== 'first_ticket') return;
        Game.storyStage = 'client_offer';
        
        Game.addMessage({
            id: Date.now(),
            from: 'sales@techflow.com',
            subject: 'Proposal: TechFlow Inc Colocation',
            body: `TechFlow Inc is interested in colocating with ${Game.companyName}.\n\n**Requirements:**\n• 10 racks (50U total space)\n• 99.5% uptime SLA\n• $8,000/month revenue\n• 12-month minimum contract\n\n**Impact:**\n• Will use 50% of remaining power capacity\n• Estimated 2% reputation boost (major client)\n• First payment in 30 days\n\nDo we have capacity to take this deal?`,
            urgent: true,
            read: false,
            actions: [
                { text: 'ACCEPT DEAL', type: '', action: 'Story.acceptClient(true)' },
                { text: 'DECLINE', type: '', action: 'Story.acceptClient(false)' }
            ]
        });
        
        AudioController.alert();
        UI.log('📧 New client offer: TechFlow Inc ($8k/mo)', 'info');
        UI.updateMessageBadge();
    },
    
    /**
     * Accept or decline client
     */
    acceptClient(accept) {
        if (accept) {
            // Check capacity
            if (Game.powerUsed + 2.5 > Game.powerMax) {
                UI.showModal('Capacity Error', 'Not enough power capacity! Upgrade infrastructure first.', '<button class="btn" onclick="UI.closeModal()">OK</button>');
                AudioController.error();
                return;
            }
            
            // Add client
            Game.clients.push({
                name: 'TechFlow Inc',
                monthlyRevenue: 8000,
                sla: 99.5,
                racks: 10,
                satisfaction: 80
            });
            
            Game.powerUsed += 2.5;
            Game.spaceUsed += 50;
            Game.reputation += 2;
            
            UI.log('🎉 TechFlow Inc is now a client! +$8k/mo', 'success');
            AudioController.success();
            
            // Trigger hiring need
            setTimeout(() => this.spawnHiringNeed(), 8000);
            
        } else {
            UI.log('Declined TechFlow offer. Opportunity lost.', 'warning');
            
            // Still move to hiring
            setTimeout(() => this.spawnHiringNeed(), 15000);
        }
        
        UI.updateResources();
        UI.renderClients();
    },
    
    /**
     * Spawn hiring need
     */
    spawnHiringNeed() {
        if (Game.storyStage !== 'client_offer') return;
        Game.storyStage = 'need_hire';
        
        Game.addMessage({
            id: Date.now(),
            from: 'HR Department',
            subject: 'URGENT: Staffing Shortage',
            body: `With the new TechFlow contract, we're severely understaffed.\n\nCurrent: 2 NOC techs, 1 L2\nRecommended: 3 NOC, 2 L2 minimum\n\nWe have 3 candidates pre-screened. Review and hire at least one immediately.\n\nThe alternative is overtime burnout and potential mistakes.`,
            urgent: true,
            read: false,
            actions: [
                { text: 'Review Candidates', action: 'Story.showHiring()' }
            ]
        });
        
        AudioController.alert();
        UI.log('HR: Review candidates for open positions', 'warning');
        UI.updateMessageBadge();
    },
    
    /**
     * Show hiring interface
     */
    showHiring() {
        const candidates = [
            {
                name: 'Alex Chen',
                role: 'L2 Support',
                salary: 68000,
                skill: 0.85,
                trait: 'Fast learner, nervous under pressure',
                risk: 0.2
            },
            {
                name: 'Sam Rodriguez',
                role: 'L2 Support',
                salary: 72000,
                skill: 0.90,
                trait: 'Experienced, wants more money',
                risk: 0.1
            },
            {
                name: 'Jordan Park',
                role: 'L3 Engineer',
                salary: 98000,
                skill: 0.95,
                trait: 'Overqualified, may leave for better offer',
                risk: 0.4
            }
        ];
        
        const candidatesHtml = candidates.map((c, i) => `
            <div class="candidate-card" onclick="Story.hireCandidate(${i})" style="margin: 10px 0; padding: 15px; border: 1px solid var(--border); cursor: pointer;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-bright); font-weight: bold;">${c.name}</span>
                    <span style="color: var(--accent);">$${(c.salary/1000).toFixed(0)}k</span>
                </div>
                <div style="font-size: 11px; color: var(--accent-dim); margin-top: 5px;">${c.role} • Skill: ${(c.skill*100).toFixed(0)}%</div>
                <div style="font-size: 10px; color: #606070; margin-top: 5px;">${c.trait}</div>
            </div>
        `).join('');
        
        UI.showModal('HIRE STAFF', `
            <div style="margin-bottom: 15px;">Select a candidate to hire:</div>
            ${candidatesHtml}
            <div style="margin-top: 15px; font-size: 10px; color: #606060;">
                Current budget: $${(Game.money/1000).toFixed(0)}k
            </div>
        `, '<button class="btn" onclick="UI.closeModal()">Cancel</button>');
        
        // Store candidates for hire function
        this.candidates = candidates;
    },
    
    /**
     * Hire selected candidate
     */
    hireCandidate(index) {
        const candidate = this.candidates[index];
        if (!candidate) return;
        
        // Check budget
        if (Game.money < candidate.salary / 12) {
            UI.showModal('Error', 'Not enough budget for first month salary!', '<button class="btn" onclick="UI.closeModal()">OK</button>');
            AudioController.error();
            return;
        }
        
        // Deduct first month
        Game.money -= candidate.salary / 12;
        
        // Add staff
        const role = candidate.role === 'L3 Engineer' ? 'l3' : 'l2';
        Game.staff[role].count++;
        
        UI.log(`✅ Hired ${candidate.name} as ${candidate.role}!`, 'success');
        AudioController.success();
        UI.closeModal();
        UI.updateResources();
        UI.renderStaff();
        
        // Victory condition check
        if (Game.staff.l2.count >= 2 && Game.clients.length > 0) {
            setTimeout(() => {
                UI.showModal('Tutorial Complete!', `
                    <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 10px;">🎉</div>
                        <p>You've successfully handled your first crisis, secured a client, and hired staff!</p>
                        <p style="color: #606060; margin-top: 15px;">The full game continues with random events, more clients, and bigger challenges.</p>
                    </div>
                `, '<button class="btn" onclick="UI.closeModal()">Continue Playing</button>');
            }, 2000);
        }
    },
    
    /**
     * Random events during gameplay
     */
    randomEvent() {
        if (Game.storyStage !== 'need_hire' && Game.storyStage !== 'playing') return;
        
        const events = [
            {
                title: 'Minor disk failure',
                message: 'Server DC1-R15 disk showing SMART errors.',
                impact: () => {
                    UI.log('Disk warning on DC1-R15. Monitor closely.', 'warning');
                }
            },
            {
                title: 'Power fluctuation',
                message: 'Brief voltage spike detected. UPS compensated.',
                impact: () => {
                    UI.log('Power event logged. UPS working correctly.', 'info');
                }
            },
            {
                title: 'Temperature alert',
                message: 'Row 4 running 2°C above nominal.',
                impact: () => {
                    UI.log('Cooling: Row 4 slightly elevated.', 'warning');
                }
            },
            {
                title: 'Backup completed',
                message: 'Nightly backup finished successfully.',
                impact: () => {
                    UI.log('Backup completed successfully.', 'success');
                }
            }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        event.impact();
    }
};
