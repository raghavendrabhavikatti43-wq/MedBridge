const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API: Get bundled configuration
app.get('/api/config', (req, res) => {
    try {
        const languages = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'languages.json'), 'utf8'));
        const symptoms = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'symptoms.json'), 'utf8'));
        const rules = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rules.json'), 'utf8'));
        
        res.json({ languages, symptoms, rules });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

// API: Save triage report
app.post('/api/reports', (req, res) => {
    const { lang, bodyArea, symptomType, severity, duration, associatedSymptoms, notes, triage } = req.body;
    
    const sql = `INSERT INTO reports (lang, bodyArea, symptomType, severity, duration, associatedSymptoms, notes, priority, message) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        lang, 
        bodyArea, 
        symptomType, 
        severity, 
        duration, 
        JSON.stringify(associatedSymptoms), 
        notes, 
        triage.priority, 
        triage.message
    ];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID });
    });
});

// API: Get report history
app.get('/api/reports', (req, res) => {
    const sql = `SELECT * FROM reports ORDER BY timestamp DESC LIMIT 50`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Parse associatedSymptoms back to array
        const results = rows.map(row => ({
            ...row,
            associatedSymptoms: JSON.parse(row.associatedSymptoms || '[]'),
            triage: { priority: row.priority, message: row.message }
        }));
        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
