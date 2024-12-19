// Configuration for different comparison types
const COMPARISON_TYPES = {
    importance: {
        itemLabel: 'items to compare',
        placeholder: 'e.g., Price, Quality, Speed, Reliability',
        sliderLabels: [
            'Much more important',
            'More important',
            'Equally important',
            'More important',
            'Much more important'
        ],
        question: 'Which is more important?',
        resultLabel: 'Importance Score',
        downloadFileName: 'importance_comparison_matrix.csv'
    },
    likelihood: {
        itemLabel: 'possible outcomes',
        placeholder: 'e.g., Outcome A, Outcome B, Outcome C',
        sliderLabels: [
            'Much more likely',
            'More likely',
            'Equally likely',
            'More likely',
            'Much more likely'
        ],
        question: 'Which is more likely?',
        resultLabel: 'Likelihood Score',
        downloadFileName: 'likelihood_comparison_matrix.csv'
    }
};

// Global variables
let elements = [];
let comparisons = [];
let currentComparison = 0;
let matrix = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    const radioButtons = document.querySelectorAll('input[name="comparisonType"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', updateUILanguage);
    });
    updateUILanguage();

    // Add slider event listener
    const slider = document.getElementById('comparisonSlider');
    slider.addEventListener('input', updateSliderSelection);
});

function updateUILanguage() {
    const selectedType = document.querySelector('input[name="comparisonType"]:checked').value;
    const typeConfig = COMPARISON_TYPES[selectedType];
    
    document.getElementById('elementsLabel').textContent = `Enter ${typeConfig.itemLabel}`;
    document.getElementById('elements').placeholder = typeConfig.placeholder;
    
    const questionEl = document.getElementById('comparisonQuestion');
    if (questionEl) {
        questionEl.textContent = typeConfig.question;
    }
    updateSliderLabels();
}

function updateSliderLabels() {
    const selectedType = document.querySelector('input[name="comparisonType"]:checked').value;
    const labels = COMPARISON_TYPES[selectedType].sliderLabels;
    
    document.getElementById('leftLabel').textContent = labels[0];
    document.getElementById('centerLabel').textContent = labels[2];
    document.getElementById('rightLabel').textContent = labels[4];
}

function updateStepIndicator(stepNumber) {
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index < stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

function startComparison() {
    const elementsInput = document.getElementById('elements').value;
    elements = elementsInput.split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

    if (elements.length < 2) {
        alert('Please enter at least 2 items to compare');
        return;
    }

    // Initialize matrix
    matrix = Array(elements.length).fill(0)
        .map(() => Array(elements.length).fill(1));

    // Generate all possible pairs
    comparisons = [];
    for (let i = 0; i < elements.length - 1; i++) {
        for (let j = i + 1; j < elements.length; j++) {
            comparisons.push([i, j]);
        }
    }

    currentComparison = 0;
    
    document.getElementById('setup').style.display = 'none';
    document.getElementById('comparison').style.display = 'block';
    updateStepIndicator(2);
    
    // Add progress information
    const progressInfo = `
        <div class="comparison-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-text">0/${comparisons.length} comparisons completed</div>
        </div>
    `;
    document.getElementById('comparison').insertAdjacentHTML('afterbegin', progressInfo);
    
    showNextComparison();
}

function updateSliderSelection() {
    const slider = document.getElementById('comparisonSlider');
    const value = parseInt(slider.value);
    const selectedType = document.querySelector('input[name="comparisonType"]:checked').value;
    const labels = COMPARISON_TYPES[selectedType].sliderLabels;
    
    // Update visual feedback based on slider position
    document.getElementById('leftLabel').style.fontWeight = value < 2 ? '600' : '400';
    document.getElementById('centerLabel').style.fontWeight = value === 2 ? '600' : '400';
    document.getElementById('rightLabel').style.fontWeight = value > 2 ? '600' : '400';
}

function submitComparison() {
    const [i, j] = comparisons[currentComparison];
    const sliderValue = parseInt(document.getElementById('comparisonSlider').value);
    
    // Convert slider value to matrix values
    const values = [5, 3, 1, 1/3, 1/5];
    const ratio = values[sliderValue];
    
    matrix[i][j] = ratio;
    matrix[j][i] = 1/ratio;
    
    currentComparison++;
    
    // Update progress bar
    const progressPercentage = (currentComparison / comparisons.length) * 100;
    const progressFill = document.querySelector('.comparison-progress .progress-fill');
    const progressText = document.querySelector('.comparison-progress .progress-text');
    
    progressFill.style.width = `${progressPercentage}%`;
    progressText.textContent = `${currentComparison}/${comparisons.length} comparisons completed`;
    
    if (currentComparison < comparisons.length) {
        showNextComparison();
    } else {
        showResults();
    }
}

function showNextComparison() {
    const [i, j] = comparisons[currentComparison];
    document.getElementById('optionA').textContent = elements[i];
    document.getElementById('optionB').textContent = elements[j];
    
    // Reset slider to center
    const slider = document.getElementById('comparisonSlider');
    slider.value = 2;
    updateSliderSelection();
}

function showResults() {
    document.getElementById('comparison').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    updateStepIndicator(3);

    // Calculate scores
    const scores = matrix.map(row => 
        row.reduce((a, b) => a + b, 0) / elements.length
    );

    // Calculate percentages
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const percentages = scores.map(score => (score / totalScore) * 100);

    // Create results table
    let html = '<table class="result-table"><tr><th></th>';
    elements.forEach(e => {
        html += `<th>${e}</th>`;
    });
    html += '<th>Score</th><th>Percentage</th></tr>';

    for (let i = 0; i < elements.length; i++) {
        html += `<tr><th>${elements[i]}</th>`;
        for (let j = 0; j < elements.length; j++) {
            html += `<td>${matrix[i][j].toFixed(2)}</td>`;
        }
        html += `<td>${scores[i].toFixed(2)}</td>`;
        html += `<td>${percentages[i].toFixed(1)}%</td></tr>`;
    }
    html += '</table>';

    // Add ranked summary
    const rankedResults = elements.map((element, index) => ({
        element,
        score: scores[index],
        percentage: percentages[index]
    })).sort((a, b) => b.percentage - a.percentage);

    html += '<h3>Ranking</h3><ul class="summary-list">';
    rankedResults.forEach((result, index) => {
        html += `
            <li>
                <span><strong>#${index + 1}:</strong> ${result.element}</span>
                <div style="display: flex; align-items: center;">
                    <span>${result.percentage.toFixed(1)}%</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${result.percentage}%"></div>
                    </div>
                </div>
            </li>`;
    });
    html += '</ul>';

    document.getElementById('resultMatrix').innerHTML = html;
}

function downloadCSV() {
    const selectedType = document.querySelector('input[name="comparisonType"]:checked').value;
    const typeConfig = COMPARISON_TYPES[selectedType];
    
    let csvContent = "Elements," + elements.join(",") + ",Score,Percentage\n";

    const scores = matrix.map(row => 
        row.reduce((a, b) => a + b, 0) / elements.length
    );
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const percentages = scores.map(score => (score / totalScore) * 100);

    for (let i = 0; i < elements.length; i++) {
        let row = [
            elements[i],
            ...matrix[i].map(v => v.toFixed(2)),
            scores[i].toFixed(2),
            percentages[i].toFixed(1)
        ];
        csvContent += row.join(",") + "\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", typeConfig.downloadFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}