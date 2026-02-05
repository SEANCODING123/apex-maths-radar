/**
 * Apex Maths Competency Radar Dashboard
 * Visualizes student performance using an adaptive spiral radar chart
 */

// Grade colors matching CSS variables
const GRADE_COLORS = {
    4: '#4fc3f7',
    5: '#29b6f6',
    6: '#26a69a',
    7: '#66bb6a',
    8: '#9ccc65',
    9: '#ffca28',
    10: '#ffa726',
    11: '#ef5350',
    12: '#ab47bc'
};

// Human-readable competency names for teachers
const COMPETENCY_NAMES = {
    'NUM-MultiDigit': 'Place Value & Numbers',
    'COMP-Advanced': 'Computation Skills',
    'MEAS-Standard': 'Measurement Basics',
    'GEOM-Reasoning': 'Shapes & Geometry',
    'NUM-Large': 'Large Numbers',
    'NUM-FracDec': 'Fractions & Decimals',
    'MEAS-Advanced': 'Area & Perimeter',
    'DATA-Represent': 'Data & Graphs',
    'NUM-Theory': 'Number Patterns',
    'RATIO-Proportion': 'Ratio & Proportion',
    'ALG-PreAlg': 'Pre-Algebra',
    'GEOM-Advanced': 'Angles & Triangles',
    'NUM-AdvSystems': 'Number Systems',
    'GEOM-Coord': 'Coordinate Geometry',
    'ALG-Manipulation': 'Algebraic Expressions',
    'FUNC-Relationships': 'Functions & Graphs',
    'GEOM-Trig': 'Trigonometry',
    'FUNC-Advanced': 'Advanced Functions',
    'CALC-Foundations': 'Calculus Basics',
    'DATA-Stats': 'Statistics & Probability',
    'CALC-Intro': 'Introductory Calculus',
    'ALG-Complex': 'Complex Algebra',
    'TRIG-Advanced': 'Advanced Trigonometry',
    'PROB-Stats': 'Probability & Statistics'
};

// Store for loaded data
let allData = [];
let studentMap = new Map();
let gradeAverages = {};
let radarChart = null;

/**
 * Load and parse CSV data
 */
async function loadData() {
    try {
        const response = await fetch('data/sample_quiz_results.csv');
        const csvText = await response.text();

        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        allData = lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((h, i) => {
                row[h.trim()] = values[i]?.trim();
            });
            return row;
        });

        processData();
        populateStudentDropdown();
        calculateGradeAverages();
        createGradeLegend();

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

/**
 * Process raw data into student-grouped structure
 */
function processData() {
    studentMap.clear();

    allData.forEach(row => {
        const sid = row.student_id;
        if (!studentMap.has(sid)) {
            studentMap.set(sid, {
                id: sid,
                name: row.student_name,
                gradeLevel: parseInt(row.student_grade_level),
                responses: []
            });
        }
        studentMap.get(sid).responses.push({
            questionId: row.question_id,
            gradeTag: row.grade_tag,
            competencyTag: row.competency_tag,
            typeTag: row.type_tag,
            isCorrect: row.is_correct === '1',
            timestamp: row.timestamp
        });
    });
}

/**
 * Calculate grade-level averages for comparison
 */
function calculateGradeAverages() {
    gradeAverages = {};

    for (let grade = 4; grade <= 12; grade++) {
        const studentsInGrade = Array.from(studentMap.values())
            .filter(s => s.gradeLevel === grade);

        if (studentsInGrade.length === 0) continue;

        // Aggregate all responses for this grade level
        const competencyStats = {};

        studentsInGrade.forEach(student => {
            const stats = calculateStudentStats(student);
            Object.entries(stats.byCompetency).forEach(([key, val]) => {
                if (!competencyStats[key]) {
                    competencyStats[key] = { correct: 0, total: 0, grade: val.grade };
                }
                competencyStats[key].correct += val.correct;
                competencyStats[key].total += val.total;
            });
        });

        // Calculate percentages
        Object.keys(competencyStats).forEach(key => {
            const stat = competencyStats[key];
            stat.percentage = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
        });

        gradeAverages[grade] = competencyStats;
    }
}

/**
 * Calculate stats for a single student
 */
function calculateStudentStats(student) {
    const byCompetency = {};
    let totalCorrect = 0;
    let totalAttempted = 0;
    let maxGrade = 4;

    student.responses.forEach(resp => {
        const grade = parseInt(resp.gradeTag.split('-')[1]);
        const key = `G${grade}-${resp.competencyTag}`;

        if (!byCompetency[key]) {
            byCompetency[key] = { correct: 0, total: 0, grade, competency: resp.competencyTag };
        }

        byCompetency[key].total++;
        totalAttempted++;

        if (resp.isCorrect) {
            byCompetency[key].correct++;
            totalCorrect++;
        }

        maxGrade = Math.max(maxGrade, grade);
    });

    // Calculate percentages
    Object.keys(byCompetency).forEach(key => {
        const stat = byCompetency[key];
        stat.percentage = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
    });

    return {
        byCompetency,
        totalCorrect,
        totalAttempted,
        overallPercentage: totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0,
        maxGrade
    };
}

/**
 * Populate student dropdown
 */
function populateStudentDropdown() {
    const select = document.getElementById('studentSelect');
    const students = Array.from(studentMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));

    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (Grade ${student.gradeLevel})`;
        select.appendChild(option);
    });
}

/**
 * Create grade color legend
 */
function createGradeLegend() {
    const legend = document.getElementById('gradeLegend');
    legend.innerHTML = '';

    for (let grade = 4; grade <= 12; grade++) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <span class="legend-color" style="background: ${GRADE_COLORS[grade]}"></span>
            <span>Grade ${grade}</span>
        `;
        legend.appendChild(item);
    }
}

/**
 * Build radar chart data for a student
 */
function buildRadarData(studentId, compareGrade = null) {
    const student = studentMap.get(studentId);
    if (!student) return null;

    const stats = calculateStudentStats(student);

    // Sort competencies by grade for spiral effect (clockwise from 1 o'clock)
    const sortedKeys = Object.keys(stats.byCompetency)
        .sort((a, b) => {
            const gradeA = stats.byCompetency[a].grade;
            const gradeB = stats.byCompetency[b].grade;
            if (gradeA !== gradeB) return gradeA - gradeB;
            return a.localeCompare(b);
        });

    // Create labels with grade prefix and readable competency name
    const labels = sortedKeys.map(key => {
        const stat = stats.byCompetency[key];
        const readableName = COMPETENCY_NAMES[stat.competency] || stat.competency;
        return `G${stat.grade}: ${readableName}`;
    });

    // Student data
    const studentData = sortedKeys.map(key => stats.byCompetency[key].percentage);

    // Background colors by grade
    const backgroundColors = sortedKeys.map(key => {
        const grade = stats.byCompetency[key].grade;
        return GRADE_COLORS[grade] + '40'; // 40 = 25% opacity
    });

    const borderColors = sortedKeys.map(key => {
        const grade = stats.byCompetency[key].grade;
        return GRADE_COLORS[grade];
    });

    const datasets = [{
        label: student.name,
        data: studentData,
        backgroundColor: 'rgba(0, 212, 255, 0.2)',
        borderColor: '#00d4ff',
        borderWidth: 2,
        pointBackgroundColor: borderColors,
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 5
    }];

    // Add comparison data if grade selected
    if (compareGrade && gradeAverages[compareGrade]) {
        const avgData = sortedKeys.map(key => {
            return gradeAverages[compareGrade][key]?.percentage || 0;
        });

        datasets.push({
            label: `Grade ${compareGrade} Average`,
            data: avgData,
            backgroundColor: 'rgba(171, 71, 188, 0.1)',
            borderColor: '#ab47bc',
            borderWidth: 2,
            borderDash: [5, 5],
            pointBackgroundColor: '#ab47bc',
            pointBorderColor: '#fff',
            pointRadius: 3
        });
    }

    return { labels, datasets, stats };
}

/**
 * Render radar chart
 */
function renderRadar(studentId, compareGrade = null) {
    const data = buildRadarData(studentId, compareGrade);
    if (!data) return;

    const ctx = document.getElementById('radarChart').getContext('2d');

    if (radarChart) {
        radarChart.destroy();
    }

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.labels,
            datasets: data.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: 20
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        color: '#a0a0b0',
                        backdropColor: 'transparent',
                        showLabelBackdrop: false
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    pointLabels: {
                        color: '#ffffff',
                        font: {
                            size: 9 // Reduced to fit more labels
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#ffffff',
                        padding: 20,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });

    updateStudentInfo(studentId, data.stats);
}

/**
 * Update student info panel
 */
function updateStudentInfo(studentId, stats) {
    const student = studentMap.get(studentId);
    if (!student) return;

    document.getElementById('studentName').textContent = student.name;
    document.getElementById('studentGradeLevel').textContent = `Grade Level: ${student.gradeLevel}`;
    document.getElementById('studentProgress').textContent = `Reached: Grade ${stats.maxGrade}`;
    document.getElementById('studentAccuracy').textContent =
        `Accuracy: ${stats.overallPercentage.toFixed(1)}% (${stats.totalCorrect}/${stats.totalAttempted})`;
}

/**
 * Export to PDF
 */
async function exportPdf() {
    const { jsPDF } = window.jspdf;
    const chartWrapper = document.getElementById('chartWrapper');
    const studentInfo = document.getElementById('studentInfo');

    // Capture chart
    const chartCanvas = await html2canvas(chartWrapper, {
        backgroundColor: '#1a1a2e',
        scale: 2
    });

    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(0, 100, 150);
    pdf.text('Apex Maths Competency Report', pageWidth / 2, 15, { align: 'center' });

    // Student info
    const studentName = document.getElementById('studentName').textContent;
    const gradeLevel = document.getElementById('studentGradeLevel').textContent;
    const progress = document.getElementById('studentProgress').textContent;
    const accuracy = document.getElementById('studentAccuracy').textContent;

    pdf.setFontSize(12);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Student: ${studentName}`, 20, 30);
    pdf.text(gradeLevel, 20, 38);
    pdf.text(progress, 20, 46);
    pdf.text(accuracy, 20, 54);

    // Add chart image
    const imgData = chartCanvas.toDataURL('image/png');
    // Reduced from 180 to 130 to fit within A4 Landscape page (210mm height)
    // 60mm (top) + 130mm (chart) + 20mm (margins) = 210mm
    const imgWidth = 130;
    const imgHeight = (chartCanvas.height / chartCanvas.width) * imgWidth;

    pdf.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, 60, imgWidth, imgHeight);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save
    pdf.save(`apex-maths-report-${studentName.replace(/\s+/g, '-')}.pdf`);
}

/**
 * Event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    document.getElementById('studentSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            const compareGrade = document.getElementById('gradeFilter').value;
            renderRadar(e.target.value, compareGrade ? parseInt(compareGrade) : null);
        }
    });

    document.getElementById('gradeFilter').addEventListener('change', (e) => {
        const studentId = document.getElementById('studentSelect').value;
        if (studentId) {
            renderRadar(studentId, e.target.value ? parseInt(e.target.value) : null);
        }
    });

    document.getElementById('exportPdf').addEventListener('click', exportPdf);
});
