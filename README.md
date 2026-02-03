# Apex Maths Competency Radar Dashboard

## What Was Built

A web dashboard that visualizes student math competencies across Grades 4-12 using an **adaptive spiral radar chart**. Teachers can:
- Select any student to view their performance
- Compare against grade-level averages
- Export PDF reports

---

## Project Structure

```
apex-maths-radar/
├── index.html              # Main dashboard page
├── styles.css              # Dark theme styling
├── src/
│   └── app.js              # Main application logic (Chart.js radar)
├── data/
│   └── sample_quiz_results.csv  # Generated test data (30 students)
└── generate_sample_data.py      # Python script to create test data
```

---

## How to Run

```bash
# Navigate to project folder
cd C:\Users\Sean Wallington\.gemini\antigravity\scratch\apex-maths-radar

# Start local server
python -m http.server 8080

# Open browser to http://localhost:8080
```

---

## Key Features

| Feature | Implementation |
|---------|----------------|
| **Adaptive Spiral Radar** | Chart.js radar with competencies sorted by grade (4→12 clockwise) |
| **Teacher-Friendly Labels** | 20 competencies mapped to readable names (e.g., "Fractions & Decimals") |
| **Grade Colors** | 9 distinct colors from light blue (G4) to purple (G12) |
| **Grade Average Comparison** | Overlay comparison with dotted line |
| **PDF Export** | html2canvas + jsPDF for one-click reports |

---

## Competency Name Mapping

| Code | Display Name |
|------|-------------|
| NUM-MultiDigit | Place Value & Numbers |
| COMP-Advanced | Computation Skills |
| NUM-FracDec | Fractions & Decimals |
| ALG-PreAlg | Pre-Algebra |
| GEOM-Trig | Trigonometry |
| CALC-Foundations | Calculus Basics |
| DATA-Stats | Statistics & Probability |

*(Full list in `src/app.js` → `COMPETENCY_NAMES`)*

---

## Scoring Logic (Time-Limited Assessment)

Since the assessment is time-limited (90 mins), students may not reach higher grades. The dashboard is designed to grade **only what they have completed**:

- **Accuracy-Based Scoring**: Scores are calculated as `(Correct Attempts / Total Attempts) * 100`.
- **No Penalty for Unreached Work**: Unanswered questions due to time limits do not count as "wrong" and do not lower the score.
- **Adaptive Radar**: The chart dynamically adjusts to show only the competencies the student actually attempted (e.g., if a student stops at Grade 8, the radar only displays G4-G8).
- **Progress Tracking**: The "Student Details" panel shows the highest grade level reached (`max_grade`).

---

## Connecting to Real Moodle Data

### Option 1: CSV Export
1. In Moodle, go to **Quiz → Results → Grades**
2. Export as CSV with columns: `student_id, student_name, question_id, is_correct`
3. Ensure question tags (Grade-X, Competency) are included
4. Replace `data/sample_quiz_results.csv`

### Option 2: Moodle REST API
```python
# Required API functions:
# - core_user_get_users (get student list)
# - mod_quiz_get_user_attempts (get quiz attempts)
# - mod_quiz_get_attempt_review (get question responses with tags)

# You'll need:
MOODLE_URL = "https://your-moodle-site.com"
API_TOKEN = "your-api-token"  # Generate in Site Admin → Plugins → Web services
```

---

## Skills & Technologies Used

| Category | Technology |
|----------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **Visualization** | Chart.js (radar charts) |
| **PDF Export** | html2canvas, jsPDF |
| **Data Generation** | Python 3, CSV module |
| **Server** | Python http.server |
| **Design** | CSS Grid, CSS Variables, Dark theme |

---

## Troubleshooting

### Radar chart not loading
```
✓ Check browser console (F12) for errors
✓ Verify data/sample_quiz_results.csv exists and has data
✓ Ensure server is running (python -m http.server 8080)
✓ Hard refresh: Ctrl+Shift+R
```

### Labels too long / overlapping
```javascript
// In src/app.js, line ~330, reduce font size:
pointLabels: {
    font: { size: 8 }  // Reduce from 10
}
```

### PDF export blank or cut off
```
✓ Wait for chart to fully render before export
✓ Try reducing chart size in styles.css (.chart-wrapper max-width)
```

### Students not reaching Grade 12
```python
# In generate_sample_data.py:
# - Removed wrong-answer limit (line ~47)
# - All students now attempt all grades
# - Regenerate: python generate_sample_data.py
```

### Grade averages showing 0%
```
✓ Ensure multiple students have the same grade_level in CSV
✓ Grade averages only calculate for grades with 2+ students
```

---

## Next Steps

- [ ] Connect to actual Moodle quiz data
- [ ] Add date range filter for assessments
- [ ] Create class-level summary view
- [ ] Add curriculum alignment notes per competency
