const app = {
    currentStep: 1,
    totalSteps: 5,
    langData: null,
    symptomData: null,
    rulesData: null,
    selectedLang: localStorage.getItem('medbridge_lang') || 'en',
    state: {
        bodyAreas: [],
        symptomTypes: [],
        severities: [],
        durations: [],
        associatedSymptoms: [],
        notes: ''
    },

    async fetchData() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            
            this.fullLangData = data.languages;
            this.langData = data.languages[this.selectedLang];
            this.symptomData = data.symptoms;
            this.rulesData = data.rules;
        } catch (err) {
            console.error('API Error, falling back to local files:', err);
            const [lang, symptoms, rules] = await Promise.all([
                fetch('data/languages.json').then(r => r.json()),
                fetch('data/symptoms.json').then(r => r.json()),
                fetch('data/rules.json').then(r => r.json())
            ]);
            this.langData = lang[this.selectedLang];
            this.symptomData = symptoms;
            this.rulesData = rules;
        }
    },

    t(key) {
        return (this.langData && this.langData[key]) || key;
    },

    en(key) {
        return (this.fullLangData && this.fullLangData['en'] && this.fullLangData['en'][key]) || key;
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
                const isActive = this.state.bodyAreas.includes(area.id);
                const btn = this.createIconBtn(area.icon, this.t(area.id), () => {
                    if (isActive) this.state.bodyAreas = this.state.bodyAreas.filter(id => id !== area.id);
                    else this.state.bodyAreas.push(area.id);
                    this.renderStep();
                }, isActive);
                grid.appendChild(btn);
            });
            container.appendChild(grid);
        } else if (this.currentStep === 2) { // Symptom Type
            this.symptomData.symptomTypes.forEach(type => {
                const isActive = this.state.symptomTypes.includes(type.id);
                const btn = this.createIconBtn(type.icon, this.t(type.id), () => {
                    if (isActive) this.state.symptomTypes = this.state.symptomTypes.filter(id => id !== type.id);
                    else this.state.symptomTypes.push(type.id);
                    this.renderStep();
                }, isActive);
                grid.appendChild(btn);
            });
            container.appendChild(grid);
        } else if (this.currentStep === 3) { // Severity
            this.symptomData.severities.forEach(sev => {
                const isActive = this.state.severities.includes(sev.id);
                const btn = this.createIconBtn(sev.icon || '⚡', this.t(sev.id).toUpperCase(), () => {
                    if (isActive) this.state.severities = this.state.severities.filter(id => id !== sev.id);
                    else this.state.severities.push(sev.id);
                    this.renderStep();
                }, isActive);
                grid.appendChild(btn);
            });
            container.appendChild(grid);
        } else if (this.currentStep === 4) { // Duration
            this.symptomData.durations.forEach(dur => {
                const isActive = this.state.durations.includes(dur.id);
                const btn = this.createIconBtn(dur.icon || '⏳', this.t(dur.id), () => {
                    if (isActive) this.state.durations = this.state.durations.filter(id => id !== dur.id);
                    else this.state.durations.push(dur.id);
                    this.renderStep();
                }, isActive);
                grid.appendChild(btn);
            });
            container.appendChild(grid);
        } else if (this.currentStep === 5) { // Associated
            this.symptomData.associatedSymptoms.forEach(sym => {
                const isActive = this.state.associatedSymptoms.includes(sym.id);
                const btn = this.createIconBtn(sym.icon, this.t(sym.id), () => {
                    if (isActive) {
                        this.state.associatedSymptoms = this.state.associatedSymptoms.filter(id => id !== sym.id);
                    } else {
                        this.state.associatedSymptoms.push(sym.id);
                    }
                }, isActive);
                grid.appendChild(btn);
            });
            container.appendChild(grid);
        } /* else if (this.currentStep === 6) { // Notes
            const textarea = document.createElement('textarea');
            textarea.placeholder = "Optional notes...";
            textarea.rows = 5;
            textarea.value = this.state.notes;
            textarea.oninput = (e) => this.state.notes = e.target.value;
            container.appendChild(textarea);
        } */

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
        document.getElementById('btn-back').innerText = this.t('back_nav');
        document.getElementById('btn-back').disabled = this.currentStep === 1;
        document.getElementById('btn-next').innerText = this.currentStep === this.totalSteps ? this.t('submit') : this.t('next_nav');
        
        // Validation: Block Next if step selection required
        const arrays = [null, this.state.bodyAreas, this.state.symptomTypes, this.state.severities, this.state.durations];
        const currentArr = arrays[this.currentStep];
        document.getElementById('btn-next').disabled = [1, 2, 3, 4].includes(this.currentStep) && (!currentArr || currentArr.length === 0);
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

    async translateNote(text, from) {
        if (!text) return text;
        if (from === 'en') return text;
        
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            const data = await res.json();
            
            // Format is [[["translated_text", "original_text"]]]
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                return data[0][0][0];
            }
            return text;
        } catch (e) {
            console.error("Translation fail:", e);
            return text;
        }
    },

    async finishIntake() {
        const nextBtn = document.getElementById('btn-next');
        const originalText = nextBtn.innerText;
        nextBtn.innerText = "Translating...";
        nextBtn.disabled = true;

        const translatedNote = await this.translateNote(this.state.notes, this.selectedLang);

        const triage = this.runTriage();
        const report = {
            lang: this.selectedLang,
            ...this.state,
            translatedNote,
            triage
        };
        
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report)
            });
            const result = await response.json();
            report.id = result.id;
        } catch (err) {
            console.error('Failed to save to backend:', err);
            report.id = Date.now();
        }

        localStorage.setItem('medbridge_last_report', JSON.stringify(report));
        window.location.href = 'summary.html';
    },

    runTriage() {
        let result = { priority: 'low', message: 'Standard case. Routine observation.' };
        const hasChestPain = this.state.bodyAreas.includes('chest') && this.state.symptomTypes.includes('pain');
        const hasSevere = this.state.severities.includes('severe');

        for (const rule of this.rulesData) {
            let match = true;
            if (rule.conditions.bodyArea && !this.state.bodyAreas.includes(rule.conditions.bodyArea)) match = false;
            if (rule.conditions.symptomType && !this.state.symptomTypes.includes(rule.conditions.symptomType)) match = false;
            if (rule.conditions.severity && !this.state.severities.includes(rule.conditions.severity)) match = false;
            
            if (match) {
                return { priority: rule.priority, message: rule.message };
            }
        }

        if (hasChestPain || hasSevere) {
            return { priority: 'high', message: 'Immediate Medical Attention Required.' };
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
                <span class="summary-label">${this.t('select_language')} / ${this.t('complaint')}</span>
                <span class="summary-value">${this.capitalize(report.lang)} / ${report.symptomTypes ? report.symptomTypes.map(t=>this.t(t)).join(', ') : this.t(report.symptomType)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">${this.t('priority')}</span>
                <div class="triage-badge triage-${report.triage.priority}">${this.t(report.triage.priority)}</div>
                <p style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-muted)">${report.triage.message}</p>
            </div>
            <div class="summary-item">
                <span class="summary-label">${this.t('zone')}</span>
                <span class="summary-value">${report.bodyAreas ? report.bodyAreas.map(a=>this.t(a)).join(', ') : this.t(report.bodyArea)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">${this.t('step_3')}</span>
                <span class="summary-value">${report.severities ? report.severities.map(s=>this.t(s)).join(', ') : this.t(report.severity)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">${this.t('onset')}</span>
                <span class="summary-value">${report.durations ? report.durations.map(d=>this.t(d)).join(', ') : this.t(report.duration)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">${this.t('step_5')}</span>
                <span class="summary-value">${report.associatedSymptoms.map(s => this.t(s)).join(', ') || this.t('no')}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">${this.t('step_6')}</span>
                <span class="summary-value">${report.notes || '...'}</span>
            </div>
            <div class="summary-item" style="background:#f8fafc; padding:1.5rem; border-radius:1rem; margin-top:1rem; border: 2px solid #e2e8f0;">
                <span class="summary-label" style="color:#1e40af;">📋 ${this.t('clinical_brief')}</span>
                <pre style="font-family: inherit; white-space: pre-wrap; word-wrap: break-word; margin-top:0.5rem; line-height:1.7; font-weight:600;">PRESENTING COMPLAINT: Patient presents with ${report.severities ? report.severities.map(s=>this.en(s)).join(', ').toLowerCase() : this.en(report.severity).toLowerCase()} ${report.symptomTypes ? report.symptomTypes.map(t=>this.en(t)).join(', ').toLowerCase() : this.en(report.symptomType).toLowerCase()} localized to the ${report.bodyAreas ? report.bodyAreas.map(a=>this.en(a)).join(', ').toLowerCase() : this.en(report.bodyArea).toLowerCase()} region(s).

DURATION: Symptoms onset reported as ${report.durations ? report.durations.map(d=>this.en(d)).join(', ').toLowerCase() : this.en(report.duration).toLowerCase()}.

ASSOCIATED SYMPTOMS: ${report.associatedSymptoms.length > 0 ? report.associatedSymptoms.map(s => this.en(s)).join(', ') : 'None reported'}.

${(() => {
    const notes = report.notes;
    const translated = report.translatedNote;
    const lang = report.lang || this.selectedLang;
    if (!notes || notes.trim() === '') return 'ADDITIONAL NOTES: No additional notes provided.';
    if (lang === 'en') return 'ADDITIONAL NOTES: ' + notes;
    const langNames = {hi:'Hindi',te:'Telugu',ta:'Tamil',bn:'Bengali'};
    const lName = langNames[lang] || lang;
    return 'ADDITIONAL NOTES (Auto-translated to English):\\n"' + translated + '"\\n\\nORIGINAL [' + lName + ']:\\n"' + notes + '"';
})()}

TRIAGE ASSESSMENT: ${this.en(report.triage.priority).toUpperCase()} PRIORITY — ${report.triage.message}.</pre>
            </div>
        `;

        document.getElementById('btn-new').innerText = this.t('new_intake');

        this.renderHistory();
    },

    async renderHistory() {
        const container = document.getElementById('history-container');
        document.getElementById('history-title').innerText = this.t('view_history');
        
        let history = [];
        try {
            const response = await fetch('/api/reports');
            history = await response.json();
        } catch (err) {
            console.error('Failed to fetch history from backend');
            history = JSON.parse(localStorage.getItem('medbridge_history') || '[]');
        }
        
        container.innerHTML = history.map(h => `
            <div class="history-item">
                <strong>${new Date(h.timestamp || h.date).toLocaleString()}</strong><br>
                ${this.t(h.symptomType)} (${this.t(h.bodyArea)}) - ${this.t(h.triage.priority).toUpperCase()}
            </div>
        `).join('') || `<p>${this.t('no')}</p>`;
    },

    capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
};
