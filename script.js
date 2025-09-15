window.onload = function() {
    // Do not clear localStorage on load; preserve saved progress and theme
    
    // Reset global variables but preserve matrix data
    const savedMatrix = window.savedMatrix;
    const savedElements = window.savedElements;
    
    elements = [];
    comparisons = [];
    currentComparison = 0;
    matrix = [];
    currentStep = 1;
    savedData = {
        comparisonType: '',
        elements: [],
        comparisons: [],
        evaluationData: {
            options: [],
            ratings: []
        }
    };
    
    // Restore matrix data if it exists
    if (savedMatrix && savedElements) {
        window.savedMatrix = savedMatrix;
        window.savedElements = savedElements;
    }
    
    // Reset all form elements
    document.querySelectorAll('input').forEach(input => {
        if (input.type === 'text') {
            input.value = '';
        } else if (input.type === 'range') {
            input.value = '2';
        } else if (input.type === 'radio' && input.value === 'importance') {
            input.checked = true;
        }
    });
    
    // Reset to first step in UI (actual saved step will be restored below)
    updateStepIndicators();
    showSectionForStep(1);
    updateUILanguage();
};

// Configuration for different comparison types
const COMPARISON_TYPES = {
    importance: {
        itemLabel: 'parameters to compare',
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
    matrix: {
        itemLabel: 'matrix file',
        placeholder: '',
        downloadFileName: 'comparison_matrix.csv'
    }
};

// Global variables
let elements = [];
let comparisons = [];
let currentComparison = 0;
let matrix = [];
let currentStep = 1;
let savedData = {
    comparisonType: '',
    elements: [],
    comparisons: [],
    evaluationData: {
        options: [],
        ratings: [] // Store ratings independently
    }
};

// Add undo/redo functionality
let comparisonHistory = [];
let historyIndex = -1;

function saveToHistory(comparison) {
    // Remove any future history if we're not at the end
    comparisonHistory = comparisonHistory.slice(0, historyIndex + 1);
    comparisonHistory.push(comparison);
    historyIndex++;
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const previousComparison = comparisonHistory[historyIndex];
        restoreComparison(previousComparison);
        updateUndoRedoButtons();
    }
}

function redo() {
    if (historyIndex < comparisonHistory.length - 1) {
        historyIndex++;
        const nextComparison = comparisonHistory[historyIndex];
        restoreComparison(nextComparison);
        updateUndoRedoButtons();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    const radioButtons = document.querySelectorAll('input[name="comparisonType"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', updateUILanguage);
    });
    updateUILanguage();

    // Choice group (segmented) listeners
    document.querySelectorAll('input[name="comparisonChoice"]').forEach(r => {
        r.addEventListener('change', updateChoiceSelection);
    });

    // Add button event listeners
    document.getElementById('startComparisonBtn').addEventListener('click', startComparison);
    document.getElementById('submitComparisonBtn').addEventListener('click', submitComparison);
    document.getElementById('downloadCsvBtn').addEventListener('click', downloadCSV);
    document.getElementById('startEvaluationBtn').addEventListener('click', () => {
        // Ensure matrix and elements are saved before starting evaluation
        window.savedMatrix = matrix;
        window.savedElements = elements;
        startEvaluation();
    });
    document.getElementById('startOverBtn').addEventListener('click', resetApp);

    // Make step indicators clickable
    document.querySelectorAll('.step').forEach((step, index) => {
        step.addEventListener('click', () => navigateToStep(index + 1));
    });
    
    // Load saved data if it exists
    loadSavedData();
    
    // Initialize step indicators
    updateStepIndicators();

    // Add comparison navigation listeners
    document.getElementById('prevComparisonBtn').addEventListener('click', showPreviousComparison);
    document.getElementById('nextComparisonBtn').addEventListener('click', showNextComparison);

    // Add new event listeners
    document.getElementById('matrixFileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importComparisonMatrix(e.target.files[0]);
        }
    });

    const skipBtn = document.getElementById('skipToEvaluationBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            // Hide all sections first
            document.getElementById('setup').style.display = 'none';
            document.getElementById('comparison').style.display = 'none';
            document.getElementById('results').style.display = 'none';
            
            // Update step indicator
            currentStep = 4;
            updateStepIndicators();
            
            // Show evaluation section
            startEvaluation();
            
            // Smooth scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const elementsInputEl = document.getElementById('elements');
    elementsInputEl.addEventListener('input', function() {
        validateElements(this);
        updateWorkloadPreview();
    });
    updateWorkloadPreview();

    // Enable keyboard navigation and autosave
    setupKeyboardNavigation();
    setupAutosave();

    // Try example flow
    const tryExampleBtn = document.getElementById('tryExampleBtn');
    if (tryExampleBtn) {
        tryExampleBtn.addEventListener('click', () => {
            document.querySelector('input[name="comparisonType"][value="importance"]').checked = true;
            updateUILanguage();
            const example = ['Price', 'Quality', 'Speed', 'Reliability'];
            const input = document.getElementById('elements');
            input.value = example.join(', ');
            updateWorkloadPreview();
            startComparison();
        });
    }
});

function updateUILanguage() {
    const selectedType = document.querySelector('input[name="comparisonType"]:checked').value;
    
    // Show/hide appropriate input sections
    const comparisonInput = document.querySelector('.comparison-input');
    const matrixInput = document.querySelector('.matrix-input');
    
    if (selectedType === 'importance') {
        comparisonInput.style.display = 'block';
        matrixInput.style.display = 'none';
        document.getElementById('startComparisonBtn').textContent = 'Start Comparison';
    } else {
        comparisonInput.style.display = 'none';
        matrixInput.style.display = 'block';
        document.getElementById('startComparisonBtn').textContent = 'Skip to Evaluation';
    }
}

// Update segmented choice labels for current pair
function updateChoiceLabels(i, j) {
    const selectedType = document.querySelector('input[name="comparisonType"]:checked').value;
    const labels = COMPARISON_TYPES[selectedType].sliderLabels;
    const a = elements[i];
    const b = elements[j];
    // 0,1 favor A; 2 equal; 3,4 favor B
    document.getElementById('choiceLabel0').textContent = `${labels[0]}: ${a}`;
    document.getElementById('choiceLabel1').textContent = `${labels[1]}: ${a}`;
    document.getElementById('choiceLabel2').textContent = labels[2];
    document.getElementById('choiceLabel3').textContent = `${labels[3]}: ${b}`;
    document.getElementById('choiceLabel4').textContent = `${labels[4]}: ${b}`;
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
    const selectedType = document.querySelector('input[name="comparisonType"]:checked').value;
    
    if (selectedType === 'importance') {
        const elementsInput = document.getElementById('elements').value;
        elements = elementsInput.split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0);

        if (elements.length < 2) {
            alert('Please enter at least 2 items to compare');
            return;
        }

        // Initialize matrix and start comparison process
        matrix = Array(elements.length).fill(0)
            .map(() => Array(elements.length).fill(1));

        comparisons = [];
        for (let i = 0; i < elements.length - 1; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                comparisons.push([i, j]);
            }
        }

        currentComparison = 0;
        savedData.comparisons = [];
        savedData.comparisonType = selectedType;
        savedData.elements = elements;
        
        // Clear any existing matrix data
        window.savedMatrix = null;
        window.savedElements = null;
        
        saveToLocalStorage();
        
        currentStep = 2;
        updateStepIndicators();
        showSectionForStep(2);
        showCurrentComparison();
    } else {
        // Handle matrix file if one is selected
        const fileInput = document.getElementById('matrixFileInput');
        if (fileInput.files.length > 0) {
            importComparisonMatrix(fileInput.files[0]);
        } else {
            // If no file selected but we have saved matrix data, use that
            if (window.savedMatrix && window.savedElements) {
                matrix = window.savedMatrix;
                elements = window.savedElements;
                currentStep = 4;
                updateStepIndicators();
                showSectionForStep(4);
                startEvaluation();
            } else {
                alert('Please select a comparison matrix file');
            }
        }
    }
}

function updateChoiceSelection() {
    const selected = document.querySelector('input[name="comparisonChoice"]:checked');
    const value = selected ? parseInt(selected.value) : 2;
    const optionA = document.getElementById('optionA');
    const optionB = document.getElementById('optionB');
    optionA.style.transform = value < 2 ? 'scale(1.05)' : 'scale(1)';
    optionB.style.transform = value > 2 ? 'scale(1.05)' : 'scale(1)';
    optionA.style.borderColor = value < 2 ? 'var(--primary-color)' : 'var(--border-color)';
    optionB.style.borderColor = value > 2 ? 'var(--primary-color)' : 'var(--border-color)';
}

function submitComparison() {
    const [i, j] = comparisons[currentComparison];
    const selected = document.querySelector('input[name="comparisonChoice"]:checked');
    const sliderValue = selected ? parseInt(selected.value) : 2;
    
    // Convert slider value to matrix values
    const values = [5, 3, 1, 1/3, 1/5];
    const ratio = values[sliderValue];
    
    matrix[i][j] = ratio;
    matrix[j][i] = 1/ratio;
    
    // Update or add the comparison to savedData
    const existingComparisonIndex = savedData.comparisons.findIndex(comp => 
        comp.optionA === elements[i] && comp.optionB === elements[j]
    );
    
    if (existingComparisonIndex !== -1) {
        savedData.comparisons[existingComparisonIndex].value = sliderValue;
    } else {
        savedData.comparisons.push({
            optionA: elements[i],
            optionB: elements[j],
            value: sliderValue
        });
    }
    
    saveToLocalStorage();
    
    // If we're at the last comparison, move to results
    if (currentComparison === comparisons.length - 1) {
        currentStep = 3;
        updateStepIndicators();
        showSectionForStep(3);
        showResults();
    } else {
        // Otherwise, move to next comparison
        currentComparison++;
        showCurrentComparison();
    }
}

// (Removed duplicate showNextComparison implementation)

function showResults() {
    document.getElementById('comparison').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    
    // Calculate scores
    const scores = matrix.map(row => 
        row.reduce((a, b) => a + b, 0) / elements.length
    );

    // Calculate percentages
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const percentages = scores.map(score => (score / totalScore) * 100);

    // Create ranked results array
    const rankedResults = elements.map((element, index) => ({
        element,
        score: scores[index],
        percentage: percentages[index]
    })).sort((a, b) => b.percentage - a.percentage);

    // Store the matrix and elements before moving to evaluation
    window.savedMatrix = matrix;
    window.savedElements = elements;

    // Generate HTML
    let html = `
        <div class="results-header">
            <h2>Comparison Results</h2>
            <p>Here are your comparison results ranked by importance</p>
        </div>

        <div class="results-tabs">
            <button class="tab-button active" onclick="showResultsTab('summary')">Summary</button>
            <button class="tab-button" onclick="showResultsTab('details')">Detailed Matrix</button>
        </div>

        <div id="summary-tab" class="results-summary">
            <ul class="summary-list">
                ${rankedResults.map((result, index) => `
                    <li>
                        <span class="ranking-position">#${index + 1}</span>
                        <div class="ranking-details">
                            <h3>${result.element}</h3>
                            <div class="score-container">
                                <div class="score-bar-container">
                                    <div class="score-bar" style="width: ${result.percentage}%"></div>
                                </div>
                                <span class="score-value">${result.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div id="details-tab" class="detailed-results" style="display: none;">
            <div class="results-wrapper">
                <table class="result-table">
                    <tr>
                        <th></th>
                        ${elements.map(e => `<th>${e}</th>`).join('')}
                        <th>Score</th>
                        <th>Percentage</th>
                    </tr>
                    ${elements.map((element, i) => `
                        <tr>
                            <th>${element}</th>
                            ${matrix[i].map(value => `<td>${value.toFixed(2)}</td>`).join('')}
                            <td>${scores[i].toFixed(2)}</td>
                            <td>${percentages[i].toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </div>

        <div class="button-container">
            <button class="btn btn-success" id="downloadCsvBtn">
                <span class="btn-icon">↓</span>
                Download Results (CSV)
            </button>
            <button class="btn btn-primary" onclick="startEvaluation()">
                Continue to Evaluation
                <span class="btn-icon">→</span>
            </button>
        </div>
    `;

    document.getElementById('results').innerHTML = html;

    // Re-attach event listener for download button
    document.getElementById('downloadCsvBtn').addEventListener('click', downloadCSV);

    // Update step indicator to show third step completion
    const stepIndicator = document.querySelector('.step-indicator');
    stepIndicator.setAttribute('data-step', '3');
}

// Add this function to handle tab switching
function showResultsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Show/hide content
    document.getElementById('summary-tab').style.display = 
        tabName === 'summary' ? 'block' : 'none';
    document.getElementById('details-tab').style.display = 
        tabName === 'details' ? 'block' : 'none';
}

function downloadCSV() {
    const selectedType = document.querySelector('input[name="comparisonType"]:checked').value;
    const typeConfig = COMPARISON_TYPES[selectedType];
    
    // Update button to show downloading state
    const downloadBtn = document.getElementById('downloadCsvBtn');
    downloadBtn.innerHTML = `
        <div class="spinner-small"></div>
        <span>Downloading...</span>
    `;
    downloadBtn.disabled = true;
    downloadBtn.classList.remove('success');

    // Create and trigger download
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

    // Show success state after small delay
    setTimeout(() => {
        downloadBtn.innerHTML = `
            <span class="success-icon-small">✓</span>
            <span>Download Again</span>
        `;
        downloadBtn.classList.add('success');
        downloadBtn.disabled = false;
    }, 500);
}

function startEvaluation() {
    // Ensure we have the matrix and elements
    if (!window.savedMatrix || !window.savedElements) {
        alert('No comparison matrix available. Please complete the comparison first.');
        navigateToStep(1);
        return;
    }

    // Initialize evaluation data structure if it doesn't exist
    if (!savedData.evaluationData) {
        savedData.evaluationData = {
            options: [],
            ratings: []
        };
    }

    // Update current step and show correct section
    currentStep = 4;
    updateStepIndicators();
    
    // Hide all sections first
    document.getElementById('setup').style.display = 'none';
    document.getElementById('comparison').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('finalResults').style.display = 'none';
    
    // Show evaluation section
    document.getElementById('evaluation').style.display = 'block';
    // Ensure evaluation progress UI exists
    const evalSection = document.getElementById('evaluation');
    if (!evalSection.querySelector('.evaluation-progress')) {
        const progress = document.createElement('div');
        progress.className = 'progress-container evaluation-progress';
        progress.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text" aria-live="polite"></div>
        `;
        // Insert after the options input group
        const inputGroup = evalSection.querySelector('.input-group');
        if (inputGroup && inputGroup.nextSibling) {
            evalSection.insertBefore(progress, inputGroup.nextSibling);
        } else {
            evalSection.prepend(progress);
        }
    }

    // Render matrix with current options (can be 0, we show add controls in-table)
    createEvaluationMatrix(savedData.evaluationData.options);

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Inline options management
function addOption() {
    const defaultNameBase = 'Option';
    let index = savedData.evaluationData.options.length + 1;
    let candidate = `${defaultNameBase} ${index}`;
    while (savedData.evaluationData.options.includes(candidate)) {
        index++;
        candidate = `${defaultNameBase} ${index}`;
    }
    savedData.evaluationData.options.push(candidate);
    saveToLocalStorage();
    createEvaluationMatrix(savedData.evaluationData.options);
}

function renameOption(oldName, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) return; // ignore empty names
    const options = savedData.evaluationData.options;
    const idx = options.indexOf(oldName);
    if (idx === -1) return;
    if (options.includes(trimmed)) return; // avoid duplicates
    options[idx] = trimmed;
    // migrate ratings
    savedData.evaluationData.ratings.forEach(r => {
        if (r.option === oldName) r.option = trimmed;
    });
    saveToLocalStorage();
    createEvaluationMatrix(savedData.evaluationData.options);
}

function removeOption(name) {
    const options = savedData.evaluationData.options;
    const idx = options.indexOf(name);
    if (idx === -1) return;
    options.splice(idx, 1);
    // remove ratings for this option
    savedData.evaluationData.ratings = savedData.evaluationData.ratings.filter(r => r.option !== name);
    saveToLocalStorage();
    createEvaluationMatrix(savedData.evaluationData.options);
}

function handleRatingChange(input) {
    const criterion = input.dataset.criterion;
    const option = input.dataset.option;
    const rating = parseFloat(input.value);
    
    // Update the rating in savedData
    const existingRatingIndex = savedData.evaluationData.ratings.findIndex(e => 
        e.criterion === criterion && e.option === option
    );
    
    if (input.value === '') {
        input.style.borderColor = 'red';
        if (existingRatingIndex !== -1) {
            // Remove invalid rating
            savedData.evaluationData.ratings.splice(existingRatingIndex, 1);
        }
    } else if (!isNaN(rating)) {
        if (existingRatingIndex !== -1) {
            savedData.evaluationData.ratings[existingRatingIndex].rating = rating;
        } else {
            savedData.evaluationData.ratings.push({
                criterion,
                option,
                rating
            });
        }
        
        input.style.borderColor = (rating >= 1 && rating <= 5) ? 'var(--primary-color)' : 'red';
    } else {
        input.style.borderColor = 'red';
        if (existingRatingIndex !== -1) {
            // Remove invalid rating
            savedData.evaluationData.ratings.splice(existingRatingIndex, 1);
        }
    }
    
    saveToLocalStorage();
    updateEvaluationProgress();
}

function createEvaluationMatrix(options) {
    const criteria = window.savedElements;
    const weights = calculateWeights();
    
    let html = `
        <div class="rating-help">
            <h4>Rating Guide</h4>
            <p>Rate how well each option performs for each criterion:</p>
            <div class="rating-scale">
                <div class="rating-point">
                    <strong>1</strong>
                    <span>Poor</span>
                </div>
                <div class="rating-point">
                    <strong>2</strong>
                    <span>Fair</span>
                </div>
                <div class="rating-point">
                    <strong>3</strong>
                    <span>Good</span>
                </div>
                <div class="rating-point">
                    <strong>4</strong>
                    <span>Very Good</span>
                </div>
                <div class="rating-point">
                    <strong>5</strong>
                    <span>Excellent</span>
                </div>
            </div>
        </div>
        
        <div class="table-wrapper">
            <table class="evaluation-table">
                <thead>
                    <tr>
                        <th scope="col">Criteria</th>
                        <th scope="col">Weight</th>
                        ${options.map(opt => `
                            <th scope=\"col\">
                                <div class=\"option-header\">
                                    <input class=\"option-name-input\" value=\"${opt}\" aria-label=\"Rename option ${opt}\" onblur=\"renameOption('${opt.replace(/'/g, "\\'")}', this.value)\" />
                                    <button type=\"button\" class=\"btn btn-icon remove-option\" aria-label=\"Remove ${opt}\" onclick=\"removeOption('${opt.replace(/'/g, "\\'")}')\">×</button>
                                </div>
                            </th>
                        `).join('')}
                        <th scope="col" class="add-option-col">
                            <button type="button" class="btn btn-primary btn-small" onclick="addOption()" aria-label="Add option">+ Add</button>
                        </th>
                    </tr>
                </thead>
                <tbody>`;

    criteria.forEach((criterion, i) => {
        html += `
            <tr>
                <td scope="row">
                    ${criterion}
                </td>
                <td>
                    <span class="weight-badge">${(weights[i] * 100).toFixed(1)}%</span>
                </td>
                ${options.map(opt => {
                    const savedRating = savedData.evaluationData.ratings.find(e => 
                        e.criterion === criterion && e.option === opt
                    );
                    const value = savedRating ? savedRating.rating : '';
                    
                    return `
                        <td>
                            <input type="number"
                                   min="1"
                                   max="5"
                                   step="0.5"
                                   class="rating-input"
                                   data-criterion="${criterion}"
                                   data-option="${opt}"
                                   value="${value}"
                                   oninput="handleRatingChange(this)"
                                   placeholder="1-5"
                                   required>
                        </td>
                    `;
                }).join('')}
                <td></td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>
    </div>

    <div class="button-container">
        <button onclick="calculateFinalResults()" class="btn btn-primary">
            Calculate Results
        </button>
    </div>`;

    document.getElementById('evaluationMatrix').innerHTML = html;
    updateEvaluationProgress();
}

function calculateWeights() {
    const matrix = window.savedMatrix;
    const n = matrix.length;
    const rowSums = matrix.map(row => 
        row.reduce((a, b) => a + b, 0)
    );
    const total = rowSums.reduce((a, b) => a + b, 0);
    return rowSums.map(sum => sum / total);
}

function updateEvaluationProgress() {
    const totalCells = window.savedElements.length * savedData.evaluationData.options.length;
    const validCount = savedData.evaluationData.ratings.filter(r => r.rating >= 1 && r.rating <= 5).length;
    const completed = Math.min(totalCells, validCount);
    const progressPercent = totalCells > 0 ? (completed / totalCells) * 100 : 0;

    const container = document.getElementById('evaluation');
    const progressFill = container.querySelector('.progress-fill');
    const progressText = container.querySelector('.progress-text');
    if (progressFill && progressText) {
        progressFill.style.width = `${progressPercent}%`;
        progressText.textContent = `${completed}/${totalCells} cells completed`;
    }
}

function calculateFinalResults() {
    const options = savedData.evaluationData.options;
    const criteria = window.savedElements;
    const weights = calculateWeights();

    // Validate all inputs
    const inputs = document.querySelectorAll('.rating-input');
    let allValid = true;
    inputs.forEach(input => {
        const value = parseFloat(input.value);
        const na = input.parentElement.querySelector('.na-toggle input')?.checked === true;
        if (!na && (!value || value < 1 || value > 5)) {
            input.style.borderColor = 'red';
            allValid = false;
        } else {
            input.style.borderColor = '';
        }
    });

    if (!allValid) {
        alert('Please fill in all ratings with values between 1 and 5');
        return;
    }

    // Calculate weighted scores using saved ratings
    const results = options.map(option => {
        let totalScore = 0;
        criteria.forEach((criterion, i) => {
            const entry = savedData.evaluationData.ratings.find(r => r.criterion === criterion && r.option === option);
            if (entry && typeof entry.rating === 'number') {
                totalScore += entry.rating * weights[i];
            }
        });
        return { option, score: totalScore };
    });

    // Sort and display results
    results.sort((a, b) => b.score - a.score);
    displayFinalResults(results);

    // Update progress indicator to show completion (fills fourth section)
    const stepIndicator = document.querySelector('.step-indicator');
    stepIndicator.setAttribute('data-step', 'complete');
}

function displayFinalResults(results) {
    const finalResultsSection = document.getElementById('finalResults');
    finalResultsSection.style.position = 'relative';  // Remove any sticky positioning
    finalResultsSection.style.display = 'block';
    document.getElementById('evaluation').style.display = 'none';

    const maxScore = Math.max(...results.map(r => r.score), 1);
    let html = '<div class="final-rankings" style="position: relative;">';  // Ensure relative positioning
    
    results.forEach((result, index) => {
        const percentage = (result.score / maxScore) * 100;
        html += `
            <div class="ranking-item">
                <div class="ranking-details">
                    <h3>#${index + 1}: ${result.option}</h3>
                    <div class="score-bar-container">
                        <div class="score-bar" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="ranking-score">${result.score.toFixed(2)}</div>
            </div>
        `;
    });

    html += '</div>';
    document.getElementById('rankingResults').innerHTML = html;

    // Add event listener for the download button
    document.getElementById('downloadFinalResultsBtn').addEventListener('click', () => {
        downloadFinalResults(results);
    });
}

function navigateToStep(step) {
    if (step <= currentStep) {
        currentStep = step;
        updateStepIndicators();
        
        // Reset display of all sections first
        document.getElementById('setup').style.display = 'none';
        document.getElementById('comparison').style.display = 'none';
        document.getElementById('results').style.display = 'none';
        document.getElementById('evaluation').style.display = 'none';
        document.getElementById('finalResults').style.display = 'none';
        
        switch(step) {
            case 1:
                document.getElementById('setup').style.display = 'block';
                focusElement('#elements');
                break;
                
            case 2:
                if (savedData.elements && savedData.elements.length > 0) {
                    elements = savedData.elements;
                    comparisons = [];
                    for (let i = 0; i < elements.length - 1; i++) {
                        for (let j = i + 1; j < elements.length; j++) {
                            comparisons.push([i, j]);
                        }
                    }
                    currentComparison = Math.min(
                        savedData.comparisons.length, 
                        comparisons.length - 1
                    );
                    document.getElementById('comparison').style.display = 'block';
                    showCurrentComparison();
                    focusElement('#comparisonQuestion');
                } else {
                    navigateToStep(1);
                }
                break;
                
            case 3:
                if (savedData.comparisons && savedData.comparisons.length > 0) {
                    document.getElementById('results').style.display = 'block';
                    showResults();
                    focusElement('#results h2');
                } else {
                    navigateToStep(2);
                }
                break;
                
            case 4:
                if (window.savedMatrix && window.savedElements) {
                    document.getElementById('evaluation').style.display = 'block';
                    startEvaluation();
                    focusElement('#evaluation h2');
                } else {
                    navigateToStep(3);
                }
                break;
        }
    }
}

function showCurrentComparison() {
    if (comparisons.length === 0) return;
    
    const [i, j] = comparisons[currentComparison];
    document.getElementById('optionA').textContent = elements[i];
    document.getElementById('optionB').textContent = elements[j];
    updateChoiceLabels(i, j);
    
    // Check if there's an existing comparison
    const existingComparison = savedData.comparisons.find(comp => 
        comp.optionA === elements[i] && comp.optionB === elements[j]
    );
    
    // Set radio value based on existing comparison or default to center
    const choiceToSelect = existingComparison ? existingComparison.value : 2;
    const input = document.querySelector(`input[name="comparisonChoice"][value="${choiceToSelect}"]`);
    if (input) input.checked = true;
    updateChoiceSelection();
    updateNavigationButtons();
    
    // Update progress bar
    const progressPercent = ((currentComparison) / comparisons.length) * 100;
    const progressFill = document.querySelector('.comparison-container .progress-fill');
    const progressText = document.querySelector('.comparison-container .progress-text');
    
    if (progressFill && progressText) {
        progressFill.style.width = `${progressPercent}%`;
        progressText.textContent = `${currentComparison}/${comparisons.length} comparisons completed`;
    }
}

function showPreviousComparison() {
    if (currentComparison > 0) {
        currentComparison--;
        showCurrentComparison();
    }
}

function showNextComparison() {
    if (currentComparison < comparisons.length - 1) {
        currentComparison++;
        showCurrentComparison();
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevComparisonBtn');
    const nextBtn = document.getElementById('nextComparisonBtn');
    const submitBtn = document.getElementById('submitComparisonBtn');
    
    prevBtn.disabled = currentComparison === 0;
    nextBtn.disabled = currentComparison === comparisons.length - 1;
    
    // Update submit button text based on position
    if (currentComparison === comparisons.length - 1) {
        submitBtn.textContent = 'Finish';
    } else {
        submitBtn.textContent = 'Continue';
    }
}

// Update rebuildMatrixFromComparisons to handle the comparison state better
function rebuildMatrixFromComparisons() {
    // Reset matrix
    matrix = Array(elements.length).fill(0)
        .map(() => Array(elements.length).fill(1));
    
    // Rebuild matrix from saved comparisons
    savedData.comparisons.forEach(comp => {
        const i = elements.indexOf(comp.optionA);
        const j = elements.indexOf(comp.optionB);
        if (i !== -1 && j !== -1) { // Make sure elements exist
            const values = [5, 3, 1, 1/3, 1/5];
            const ratio = values[comp.value];
            matrix[i][j] = ratio;
            matrix[j][i] = 1/ratio;
        }
    });
}

function updateStepIndicators() {
    const steps = document.querySelectorAll('.step');
    const stepIndicator = document.querySelector('.step-indicator');
    
    // Update step indicator data attribute
    stepIndicator.setAttribute('data-step', currentStep.toString());
    
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed', 'future');
        step.removeAttribute('aria-current');
        
        if (index + 1 === currentStep) {
            step.classList.add('active');
            step.setAttribute('aria-current', 'step');
        } else if (index + 1 < currentStep) {
            step.classList.add('completed');
        } else {
            step.classList.add('future');
        }
    });

    // If we're on the results page, mark the third step as completed
    if (currentStep === 3 || currentStep === 4) {
        steps[2].classList.add('completed');
    }
}

function saveToLocalStorage() {
    localStorage.setItem('pairwiseData', JSON.stringify(savedData));
}

function loadFromLocalStorage() {
    const data = localStorage.getItem('pairwiseData');
    if (data) {
        savedData = JSON.parse(data);
        return true;
    }
    return false;
}

function loadSavedData() {
    if (loadFromLocalStorage()) {
        // Initialize evaluation data if it doesn't exist
        if (!savedData.evaluationData) {
            savedData.evaluationData = {
                options: [],
                ratings: []
            };
        }

        switch(currentStep) {
            case 1:
                if (savedData.comparisonType) {
                    document.querySelector(`input[value="${savedData.comparisonType}"]`).checked = true;
                }
                if (savedData.elements.length > 0) {
                    document.getElementById('elements').value = savedData.elements.join(', ');
                }
                break;
            case 2:
                // Restore comparison progress
                if (savedData.comparisons.length > 0) {
                    // Implement restoration of comparison progress
                }
                break;
            case 3:
                // Restore results
                if (savedData.comparisons.length > 0) {
                    showResults();
                }
                break;
            case 4:
                window.savedMatrix = matrix;
                window.savedElements = elements;
                createEvaluationMatrix(savedData.evaluationData.options);
                break;
        }
    }
}

function showCurrentSection() {
    document.getElementById('setup').style.display = currentStep === 1 ? 'block' : 'none';
    document.getElementById('comparison').style.display = currentStep === 2 ? 'block' : 'none';
    document.getElementById('results').style.display = currentStep === 3 ? 'block' : 'none';
    document.getElementById('evaluation').style.display = currentStep === 4 ? 'block' : 'none';
}

// Add this function to handle matrix import
function importComparisonMatrix(file) {
    const uploadSection = document.querySelector('.matrix-input');
    uploadSection.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Importing matrix file...</p>
        </div>
    `;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvContent = e.target.result;
            const rows = csvContent.split('\n')
                .map(row => row.trim())
                .filter(row => row.length > 0);
            
            if (rows.length < 2) {
                throw new Error('Invalid CSV format: Not enough rows');
            }

            // Parse header row to get elements (skip last two columns: Score,Percentage)
            const header = rows[0].split(',');
            const elements = header.slice(1, -2);
            
            // Create and populate the matrix
            const matrix = Array(elements.length).fill(0)
                .map(() => Array(elements.length).fill(1));
            
            // Parse data rows
            for (let i = 0; i < elements.length; i++) {
                const rowData = rows[i + 1].split(',');
                const values = rowData.slice(1, elements.length + 1)
                    .map(val => parseFloat(val));
                
                if (values.length !== elements.length) {
                    throw new Error('Invalid CSV format: Incorrect number of columns');
                }
                
                for (let j = 0; j < elements.length; j++) {
                    matrix[i][j] = values[j];
                }
            }

            // Store the imported data globally
            window.savedMatrix = matrix;
            window.savedElements = elements;
            
            // Show success state with improved file change UI
            uploadSection.innerHTML = `
                <div class="success-state">
                    <div class="success-icon">✓</div>
                    <p class="success-title">Matrix imported successfully!</p>
                    <div class="matrix-info">
                        <p class="file-name">${file.name}</p>
                        <p class="matrix-details">${elements.length} × ${elements.length} matrix</p>
                    </div>
                    <div class="file-upload-container">
                        <label for="matrixFileInput" class="file-change-btn">
                            <span class="change-icon">↺</span>
                            Change File
                        </label>
                        <input type="file" 
                               id="matrixFileInput" 
                               accept=".csv" 
                               class="input-field visually-hidden">
                    </div>
                </div>
            `;

            // Re-attach event listener
            document.getElementById('matrixFileInput').addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    importComparisonMatrix(e.target.files[0]);
                }
            });
            
            // Enable and update the start button
            const startBtn = document.getElementById('startComparisonBtn');
            startBtn.disabled = false;
            startBtn.textContent = 'Continue to Evaluation →';
            startBtn.classList.add('ready');
            
        } catch (error) {
            // Show error state with improved UI
            uploadSection.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">!</div>
                    <p class="error-title">Import Failed</p>
                    <p class="error-message">${error.message}</p>
                    <div class="file-upload-container">
                        <label for="matrixFileInput" class="file-change-btn error">
                            <span class="change-icon">↺</span>
                            Try Another File
                        </label>
                        <input type="file" 
                               id="matrixFileInput" 
                               accept=".csv" 
                               class="input-field visually-hidden">
                    </div>
                </div>
            `;

            // Re-attach event listener
            document.getElementById('matrixFileInput').addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    importComparisonMatrix(e.target.files[0]);
                }
            });

            // Disable the start button
            const startBtn = document.getElementById('startComparisonBtn');
            startBtn.disabled = true;
            startBtn.textContent = 'Start Comparison';
            startBtn.classList.remove('ready');
        }
    };
    reader.readAsText(file);
}

// Add this helper function to handle section visibility
function showSectionForStep(step) {
    const sections = {
        1: 'setup',
        2: 'comparison',
        3: 'results',
        4: 'evaluation',
        5: 'finalResults'  // Add final results section
    };
    
    Object.values(sections).forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
            section.style.position = 'relative';  // Reset positioning
        }
    });
    
    const targetSection = document.getElementById(sections[step]);
    if (targetSection) {
        targetSection.style.display = 'block';
        // Focus management
        switch (step) {
            case 1: focusElement('#elements'); break;
            case 2: focusElement('#comparisonQuestion'); break;
            case 3: focusElement('#results h2'); break;
            case 4: focusElement('#evaluation h2'); break;
            case 5: focusElement('#finalResults h2'); break;
        }
    }
}

// Add this function to update the comparison progress bar
function updateComparisonProgress() {
    const totalComparisons = comparisons.length;
    const currentProgress = currentComparison;
    const progressPercentage = (currentProgress / totalComparisons) * 100;
    
    const progressFill = document.querySelector('.comparison-container .progress-fill');
    const progressText = document.querySelector('.comparison-container .progress-text');
    
    if (progressFill && progressText) {
        progressFill.style.width = `${progressPercentage}%`;
        progressText.textContent = `${currentProgress}/${totalComparisons} comparisons completed`;
    }
}

// Add input validation and real-time feedback
function validateElements(input) {
    const elements = input.value.split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);
    
    const helpText = input.parentElement.querySelector('.input-help') || 
        document.createElement('p');
    helpText.className = 'input-help';
    
    if (elements.length < 2) {
        helpText.textContent = 'Please enter at least 2 items separated by commas';
        helpText.style.color = '#ef4444';
        input.style.borderColor = '#ef4444';
        return false;
    } else {
        helpText.textContent = `${elements.length} items entered`;
        helpText.style.color = '#10b981';
        input.style.borderColor = '#10b981';
        return true;
    }
    
    if (!input.parentElement.querySelector('.input-help')) {
        input.parentElement.appendChild(helpText);
    }
}

function updateProgressBar() {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (currentStep === 2) {
        // For comparison step
        const progress = (currentComparison / comparisons.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.innerHTML = `
            <strong>${currentComparison}</strong> of <strong>${comparisons.length}</strong> comparisons
            <span class="progress-estimate">(${Math.ceil((comparisons.length - currentComparison) * 0.5)} min remaining)</span>
        `;
    } else if (currentStep === 4) {
        // For evaluation step
        const totalRatings = savedElements.length * savedData.evaluationData.options.length;
        const completedRatings = savedData.evaluationData.ratings.length;
        const progress = (completedRatings / totalRatings) * 100;
        
        progressFill.style.width = `${progress}%`;
        progressText.innerHTML = `
            <strong>${completedRatings}</strong> of <strong>${totalRatings}</strong> ratings completed
        `;
    }
}

// Add keyboard navigation for comparison
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (currentStep === 2) {
            const selected = document.querySelector('input[name="comparisonChoice"]:checked');
            const current = selected ? parseInt(selected.value) : 2;
            switch(e.key) {
                case 'ArrowLeft':
                    {
                        const next = Math.max(0, current - 1);
                        const input = document.querySelector(`input[name="comparisonChoice"][value="${next}"]`);
                        if (input) { input.checked = true; updateChoiceSelection(); }
                    }
                    break;
                case 'ArrowRight':
                    {
                        const next = Math.min(4, current + 1);
                        const input = document.querySelector(`input[name="comparisonChoice"][value="${next}"]`);
                        if (input) { input.checked = true; updateChoiceSelection(); }
                    }
                    break;
                case 'Enter':
                    if (!document.getElementById('submitComparisonBtn').disabled) {
                        submitComparison();
                    }
                    break;
            }
        }
    });
}

// Add autosave functionality
function setupAutosave() {
    const autosaveInterval = 30000; // 30 seconds
    
    setInterval(() => {
        if (savedData.elements.length > 0) {
            saveToLocalStorage();
            showAutosaveNotification();
        }
    }, autosaveInterval);
}

function showAutosaveNotification() {
    const notification = document.createElement('div');
    notification.className = 'autosave-notification';
    notification.innerHTML = `
        <span class="autosave-icon">💾</span>
        Progress saved automatically
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showHelp(step) {
    const helpContent = {
        1: {
            title: 'Getting Started',
            content: 'Enter the criteria you want to compare...'
        },
        2: {
            title: 'Making Comparisons',
            content: 'Use the slider to indicate relative importance...'
        },
        // ... more help content
    };

    const modal = document.createElement('div');
    modal.className = 'help-modal';
    modal.innerHTML = `
        <div class="help-content">
            <h3>${helpContent[step].title}</h3>
            <p>${helpContent[step].content}</p>
            <button onclick="this.parentElement.parentElement.remove()">Got it</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function downloadFinalResults(results) {
    // Create CSV content
    let csvContent = "Rank,Option,Score\n";
    results.forEach((result, index) => {
        csvContent += `${index + 1},${result.option},${result.score.toFixed(2)}\n`;
    });

    // Update button to show downloading state
    const downloadBtn = document.getElementById('downloadFinalResultsBtn');
    downloadBtn.innerHTML = `
        <div class="spinner-small"></div>
        <span>Downloading...</span>
    `;
    downloadBtn.disabled = true;
    downloadBtn.classList.remove('success');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "final_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success state after small delay
    setTimeout(() => {
        downloadBtn.innerHTML = `
            <span class="success-icon-small">✓</span>
            <span>Download Again</span>
        `;
        downloadBtn.classList.add('success');
        downloadBtn.disabled = false;
    }, 500);
}

// Helper: update workload preview under the criteria input
function updateWorkloadPreview() {
    const input = document.getElementById('elements');
    if (!input) return;
    const items = input.value.split(',').map(s => s.trim()).filter(Boolean);
    const n = items.length;
    const comparisonsCount = n > 1 ? (n * (n - 1)) / 2 : 0;
    const el = document.getElementById('workloadPreview');
    if (el) {
        if (comparisonsCount > 0) {
            el.textContent = `You will make ${comparisonsCount} pairwise comparisons.`;
        } else {
            el.textContent = '';
        }
    }
}

// Helper: scoped reset that preserves theme
function resetApp() {
    const theme = localStorage.getItem('theme');
    localStorage.removeItem('pairwiseData');
    window.savedMatrix = null;
    window.savedElements = null;
    elements = [];
    comparisons = [];
    currentComparison = 0;
    matrix = [];
    currentStep = 1;
    savedData = { comparisonType: '', elements: [], comparisons: [], evaluationData: { options: [], ratings: [] } };
    if (theme) localStorage.setItem('theme', theme);
    updateStepIndicators();
    showSectionForStep(1);
    updateUILanguage();
}

function focusElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '-1');
    }
    el.focus({ preventScroll: false });
}
