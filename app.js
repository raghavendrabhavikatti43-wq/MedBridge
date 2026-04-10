const app = {
    currentStep: 1,
    totalSteps: 6,
    langData: null,
    symptomData: null,
    rulesData: null,
    selectedLang: localStorage.getItem('medbridge_lang') || 'en',
    state: {
        bodyArea: null,
        symptomType: null,
        severity: null,
        duration: null,
        associatedSymptoms: [],
        notes: ''
    },

    async fetchData() {
        const [lang, symptoms, rules] = await Promise.all([
            fetch('data/languages.json').then(r => r.json()),
            fetch('data/symptoms.json').then(r => r.json()),
            fetch('data/rules.json').then(r => r.json())
        ]);
        this.langData = lang[this.selectedLang];
        this.symptomData = symptoms;
        this.rulesData = rules;
    },

    t(key) {
        return this.langData[key] || key;
    },

    async initIntake() {
        await this.fetchData();
        this.renderStep();
        this.updateDots();
    },

    renderStep() {
        const container = document.getElementById('step-content');
        const title = document.getElementById('step-title');
        container.innerHTML = '';
        
        const stepKey = `step_${this.currentStep}`;
        title.innerText = this.t(stepKey);

        const grid = document.createElement('div');
        grid.className = 'grid';

        if (this.currentStep === 1) { // Body Area
            this.symptomData.bodyAreas.forEach(area => {
                const btn = this.createIconBtn(area.icon, this.t(area.id), () => {
                    this.state.bodyArea = area.id;
                    this.renderStep();
                }, this.state.bodyArea === area.id);
                grid.appendChild(btn);
            });
            container.appendChild(grid);
        } else if (this.currentStep === 2) { // Symptom Type
            this.symptomData.symptomTypes.forEach(type => {
                const btn = this.createIconBtn(type.icon, this.t(type.id), () => {
                    this.state.symptomType = type.id;
                    this.renderStep();
                }, this.state.symptomType === type.id);
                grid.appendChild(btn);
            });
            container.appendChild(grid);
        } else if (this.currentStep === 3) { // Severity
            const meter = document.createElement('div');
            meter.className = 'severity-meter';
            this.symptomData.severities.forEach(sev => {
                const btn = document.createElement('button');
                btn.className = `btn ${this.state.severity === sev.id ? 'active' : ''}`;
                btn.style.borderColor = sev.color;
                if (this.state.severity === sev.id) btn.style.backgroundColor = sev.color + '20';
                btn.innerHTML = `<span class="btn-text" style="color:${sev.color}">${this.t(sev.id).toUpperCase()}</span>`;
                btn.onclick = () => {
                    this.state.severity = sev.id;
                    this.renderStep();
                };
                meter.appendChild(btn);
            });
            container.appendChild(meter);
        } else if (this.currentStep === 4) { // Duration
            const list = document.createElement('div');
            list.className = 'duration-list';
            this.symptomData.durations.forEach(dur => {
                const btn = document.createElement('button');
                btn.className = `btn ${this.state.duration === dur.id ? 'active' : ''}`;
                btn.innerHTML = `<span class="btn-text">${this.t(dur.id)}</span>`;
                btn.onclick = () => {
                    this.state.duration = dur.id;
                    this.renderStep();
                };
                list.appendChild(btn);
            });
            container.appendChild(list);
        } else if (this.currentStep === 5) { // Associated
            this.symptomData.associatedSymptoms.forEach(sym => {
                const isActive = this.state.associatedSymptoms.includes(sym.id);
                const btn = this.createIconBtn(sym.icon, this.t(sym.id), () => {
                    if (isActive) {
                        this.state.associatedSymptoms = this.state.associatedSymptoms.filter(id => id !== sym.id);
                    } else {
                        this.state.associatedSymptoms.push(sym.id);
                    }
                    this.renderStep();
                }, isActive);
                grid.appendChild(btn);
            });
            container.appendChild(grid);
        } else if (this.currentStep === 6) { // Notes
            const textarea = document.createElement('textarea');
            textarea.placeholder = "Optional notes...";
            textarea.rows = 5;
            textarea.value = this.state.notes;
            textarea.oninput = (e) => this.state.notes = e.target.value;
            container.appendChild(textarea);
            document.getElementById('btn-next').innerText = this.t('submit');
        }

        this.updateNavButtons();
    },

    createIconBtn(icon, text, onClick, isActive) {
        const btn = document.createElement('button');
        btn.className = `btn ${isActive ? 'active' : ''}`;
        btn.innerHTML = `
            <span class="btn-icon">${icon}</span>
            <span class="btn-text">${text}</span>
        `;
        btn.onclick = onClick;
        return btn;
    },

    updateNavButtons() {
        document.getElementById('btn-back').disabled = this.currentStep === 1;
        document.getElementById('btn-next').innerText = this.currentStep === this.totalSteps ? this.t('submit') : this.t('next');
        
        // Validation: Block Next if step selection required
        const needsSelection = [1, 2, 3, 4].includes(this.currentStep);
        const currentVal = [null, this.state.bodyArea, this.state.symptomType, this.state.severity, this.state.duration][this.currentStep];
        document.getElementById('btn-next').disabled = needsSelection && !currentVal;
    },

    updateDots() {
        const container = document.getElementById('step-dots');
        container.innerHTML = '';
        for (let i = 1; i <= this.totalSteps; i++) {
            const dot = document.createElement('div');
            dot.className = `step-dot ${i === this.currentStep ? 'active' : ''}`;
            container.appendChild(dot);
        }
    },

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.renderStep();
            this.updateDots();
        } else {
            this.finishIntake();
        }
    },

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderStep();
            this.updateDots();
        }
    },

    finishIntake() {
        const triage = this.runTriage();
        const report = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            lang: this.selectedLang,
            ...this.state,
            triage
        };
        
        const history = JSON.parse(localStorage.getItem('medbridge_history') || '[]');
        history.unshift(report);
        localStorage.setItem('medbridge_history', JSON.stringify(history.slice(0, 10)));
        localStorage.setItem('medbridge_last_report', JSON.stringify(report));
        
        window.location.href = 'summary.html';
    },

    runTriage() {
        let result = { priority: 'low', message: 'Standard case. Routine observation.' };
        
        for (const rule of this.rulesData) {
            let match = true;
            if (rule.conditions.bodyArea && rule.conditions.bodyArea !== this.state.bodyArea) match = false;
            if (rule.conditions.symptomType && rule.conditions.symptomType !== this.state.symptomType) match = false;
            if (rule.conditions.severity && rule.conditions.severity !== this.state.severity) match = false;
            if (rule.conditions.associatedSymptoms) {
                if (!rule.conditions.associatedSymptoms.every(s => this.state.associatedSymptoms.includes(s))) match = false;
            }
            
            if (match) {
                return { priority: rule.priority, message: rule.message };
            }
        }

        // Logic for MODERATE if not HIGH
        if (this.state.severity === 'severe' || this.state.duration === 'plus_1_week') {
            return { priority: 'mod', message: 'Symptoms persistent or severe. Recommend professional review.' };
        }

        return result;
    },

    async initSummary() {
        await this.fetchData();
        const report = JSON.parse(localStorage.getItem('medbridge_last_report'));
        if (!report) return;

        const container = document.getElementById('summary-content');
        document.getElementById('summary-main-title').innerText = this.t('summary_title');
        
        const severityLabels = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' };

        container.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Language / Primary Concern</span>
                <span class="summary-value">${this.capitalize(report.lang)} / ${this.capitalize(report.symptomType)} (${report.bodyArea})</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Triage Priority</span>
                <div class="triage-badge triage-${report.triage.priority}">${this.t(report.triage.priority)}</div>
                <p style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-muted)">${report.triage.message}</p>
            </div>
            <div class="summary-item">
                <span class="summary-label">Details</span>
                <span class="summary-value">${this.t(report.severity)} | ${this.t(report.duration)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Associated Symptoms</span>
                <span class="summary-value">${report.associatedSymptoms.map(s => this.t(s)).join(', ') || 'None'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Notes</span>
                <span class="summary-value">${report.notes || 'No extra notes provided.'}</span>
            </div>
            <div class="summary-item" style="background:#f8fafc; padding:1rem; border-radius:0.5rem; margin-top:1rem;">
                <span class="summary-label">Clinical Brief (English)</span>
                <p style="font-style: italic;">Patient reports ${report.severity} ${report.symptomType} in the ${report.bodyArea} area for ${report.duration.replace('_', '-')}. ${report.associatedSymptoms.length > 0 ? 'Accompanied by ' + report.associatedSymptoms.join(', ') + '.' : ''} Red flag triage level: ${report.triage.priority.toUpperCase()}.</p>
            </div>
        `;

        this.renderHistory();
    },

    renderHistory() {
        const history = JSON.parse(localStorage.getItem('medbridge_history') || '[]');
        const container = document.getElementById('history-container');
        document.getElementById('history-title').innerText = this.t('view_history');
        
        container.innerHTML = history.slice(1).map(h => `
            <div class="history-item">
                <strong>${h.date}</strong><br>
                ${this.capitalize(h.symptomType)} (${h.bodyArea}) - ${h.triage.priority.toUpperCase()}
            </div>
        `).join('') || '<p>No recent history.</p>';
    },

    capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
};
