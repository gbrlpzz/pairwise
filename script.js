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
let currentEvaluationOption = 0;
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
    // Start from the system appearance and remember only an explicit choice.
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const savedTheme = localStorage.getItem('theme') || systemTheme;
    const themeToggle = document.getElementById('themeToggle');
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const isDark = theme === 'dark';
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.setAttribute('aria-label', isDark ? 'Use light appearance' : 'Use dark appearance');
        themeToggle.title = isDark ? 'Use light appearance' : 'Use dark appearance';
    };
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    const radioButtons = document.querySelectorAll('input[name="comparisonType"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', updateUILanguage);
    });
    updateUILanguage();

    document.getElementById('comparisonSlider').addEventListener('input', updateChoiceSelection);
    document.getElementById('optionA').addEventListener('click', () => selectComparisonChoice(0));
    document.getElementById('optionB').addEventListener('click', () => selectComparisonChoice(4));

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
        updateCriteriaState();
    });
    elementsInputEl.addEventListener('keydown', (event) => {
        const startButton = document.getElementById('startComparisonBtn');
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !startButton.disabled) {
            event.preventDefault();
            startComparison();
        }
    });
    updateCriteriaState();

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
            input.value = example.join('\n');
            updateCriteriaState();
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
        updateCriteriaState();
    } else {
        comparisonInput.style.display = 'none';
        matrixInput.style.display = 'block';
        const startButton = document.getElementById('startComparisonBtn');
        startButton.innerHTML = 'Continue to evaluation <span aria-hidden="true">→</span>';
        startButton.disabled = !(document.getElementById('matrixFileInput').files.length || (window.savedMatrix && window.savedElements));
    }
}

// Update the unified preference slider labels for the current pair
function updateChoiceLabels(i, j) {
    const a = elements[i];
    const b = elements[j];
    document.getElementById('preferenceLabelA').textContent = a;
    document.getElementById('preferenceLabelB').textContent = b;
    document.getElementById('comparisonChoices').setAttribute('aria-label', `Preference scale from ${a} to ${b}`);
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
        const criteriaState = parseCriteria(document.getElementById('elements').value);
        elements = criteriaState.items;

        if (!criteriaState.valid) {
            const message = criteriaState.duplicates.length
                ? `Remove duplicate criteria: ${criteriaState.duplicates.join(', ')}.`
                : 'Enter at least two criteria before continuing.';
            showStatus(message, 'error');
            document.getElementById('elements').focus();
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
                showStatus('Choose a comparison matrix CSV before continuing.', 'error');
                fileInput.focus();
            }
        }
    }
}

function updateChoiceSelection() {
    const slider = document.getElementById('comparisonSlider');
    const value = Number(slider.value);
    const labels = ['Strongly left', 'Slightly left', 'Equal', 'Slightly right', 'Strongly right'];
    slider.closest('.effort-slider').style.setProperty('--slider-fill', `${((value + 1) / 5) * 100}%`);
    slider.setAttribute('aria-valuetext', labels[value]);
    const optionA = document.getElementById('optionA');
    const optionB = document.getElementById('optionB');
    optionA.classList.toggle('selected', value < 2);
    optionB.classList.toggle('selected', value > 2);
    optionA.setAttribute('aria-pressed', String(value < 2));
    optionB.setAttribute('aria-pressed', String(value > 2));
}

function selectComparisonChoice(value) {
    const input = document.getElementById('comparisonSlider');
    input.value = String(value);
    updateChoiceSelection();
}

function submitComparison() {
    const [i, j] = comparisons[currentComparison];
    const sliderValue = Number(document.getElementById('comparisonSlider').value);
    
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

        <div class="results-tabs" role="tablist" aria-label="Result views">
            <button class="tab-button active" type="button" role="tab" aria-selected="true" aria-controls="summary-tab" onclick="showResultsTab('summary', this)">Summary</button>
            <button class="tab-button" type="button" role="tab" aria-selected="false" aria-controls="details-tab" onclick="showResultsTab('details', this)">Detailed Matrix</button>
        </div>

        <div id="summary-tab" class="results-summary" role="tabpanel">
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

        <div id="details-tab" class="detailed-results" role="tabpanel" hidden>
            <div class="results-wrapper">
                <table class="result-table">
                    <caption class="visually-hidden">Pairwise comparison matrix and calculated scores</caption>
                    <thead><tr>
                        <th></th>
                        ${elements.map(e => `<th>${e}</th>`).join('')}
                        <th>Score</th>
                        <th>Percentage</th>
                    </tr></thead>
                    <tbody>
                    ${elements.map((element, i) => `
                        <tr>
                            <th scope="row">${element}</th>
                            ${matrix[i].map(value => `<td>${value.toFixed(2)}</td>`).join('')}
                            <td>${scores[i].toFixed(2)}</td>
                            <td>${percentages[i].toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="button-container">
            <button class="btn btn-success" id="downloadCsvBtn" type="button">
                <span class="btn-icon">↓</span>
                Download Results (CSV)
            </button>
            <button class="btn btn-primary" type="button" onclick="startEvaluation()">
                Continue to Evaluation
                <span class="btn-icon">→</span>
            </button>
        </div>
    `;

    document.getElementById('results').innerHTML = html;

    // Re-attach event listener for download button
    document.getElementById('downloadCsvBtn').addEventListener('click', downloadCSV);
    const tabs = Array.from(document.querySelectorAll('.tab-button'));
    tabs.forEach((tab, index) => {
        tab.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            let nextIndex = index;
            if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
            if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = tabs.length - 1;
            tabs[nextIndex].click();
            tabs[nextIndex].focus();
        });
    });

    // Update step indicator to show third step completion
    const stepIndicator = document.querySelector('.step-indicator');
    stepIndicator.setAttribute('data-step', '3');
}

// Add this function to handle tab switching
function showResultsTab(tabName, trigger) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    trigger.classList.add('active');
    trigger.setAttribute('aria-selected', 'true');

    // Show/hide content
    document.getElementById('summary-tab').hidden = tabName !== 'summary';
    document.getElementById('details-tab').hidden = tabName !== 'details';
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
        showStatus('Complete a comparison before evaluating options.', 'error');
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
    document.body.classList.add('guided-evaluation-active');
    updateStepIndicators();
    
    // Hide all sections first
    document.getElementById('setup').style.display = 'none';
    document.getElementById('comparison').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('finalResults').style.display = 'none';
    
    // Show evaluation section
    document.getElementById('evaluation').style.display = 'block';
    currentEvaluationOption = Math.min(
        currentEvaluationOption,
        Math.max(savedData.evaluationData.options.length - 1, 0)
    );
    createEvaluationMatrix(savedData.evaluationData.options);

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Touch-native options management
function addOption() {
    const input = document.getElementById('newOptionName');
    const candidate = (input?.value || '').trim();
    if (!candidate) {
        showStatus('Enter a name for the option.', 'error');
        input?.focus();
        return;
    }
    if (savedData.evaluationData.options.includes(candidate)) {
        showStatus('Each option needs a unique name.', 'error');
        input?.select();
        return;
    }
    savedData.evaluationData.options.push(candidate);
    currentEvaluationOption = savedData.evaluationData.options.length - 1;
    saveToLocalStorage();
    createEvaluationMatrix(savedData.evaluationData.options);
    requestAnimationFrame(() => document.getElementById('newOptionName')?.focus());
}

function renameOption(oldName, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
        showStatus('Option names cannot be empty.', 'error');
        createEvaluationMatrix(savedData.evaluationData.options);
        return;
    }
    const options = savedData.evaluationData.options;
    const idx = options.indexOf(oldName);
    if (idx === -1) return;
    if (trimmed !== oldName && options.includes(trimmed)) {
        showStatus('Each option needs a unique name.', 'error');
        createEvaluationMatrix(savedData.evaluationData.options);
        return;
    }
    if (trimmed === oldName) return;
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
    currentEvaluationOption = Math.min(currentEvaluationOption, Math.max(options.length - 1, 0));
    // remove ratings for this option
    savedData.evaluationData.ratings = savedData.evaluationData.ratings.filter(r => r.option !== name);
    saveToLocalStorage();
    createEvaluationMatrix(savedData.evaluationData.options);
}

function setEvaluationRating(input) {
    const { criterion, option } = input.dataset;
    const rating = Number(input.value);
    const existingRatingIndex = savedData.evaluationData.ratings.findIndex(e => 
        e.criterion === criterion && e.option === option
    );
    if (existingRatingIndex !== -1) {
        savedData.evaluationData.ratings[existingRatingIndex].rating = rating;
    } else {
        savedData.evaluationData.ratings.push({ criterion, option, rating });
    }
    saveToLocalStorage();

    const criterionCard = input.closest('.evaluation-criterion');
    criterionCard.classList.remove('is-unrated', 'is-incomplete');
    const label = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating - 1];
    input.closest('.effort-slider').style.setProperty('--slider-fill', `${(rating / 5) * 100}%`);
    input.setAttribute('aria-valuetext', label);
    updateEvaluationProgress();
}

function showEvaluationOption(index) {
    const options = savedData.evaluationData.options;
    if (!options.length) return;
    currentEvaluationOption = Math.max(0, Math.min(index, options.length - 1));
    createEvaluationMatrix(options);
    requestAnimationFrame(() => document.querySelector('.evaluation-option-card input[type="range"]')?.focus());
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function createEvaluationMatrix(options) {
    const criteria = window.savedElements;
    const weights = calculateWeights();
    const ratingLabels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
    currentEvaluationOption = Math.min(currentEvaluationOption, Math.max(options.length - 1, 0));
    const option = options[currentEvaluationOption];
    const optionCard = option ? (() => {
        const safeOption = escapeHtml(option);
        const criteriaRows = criteria.map((criterion, i) => {
            const savedRating = savedData.evaluationData.ratings.find(e =>
                e.criterion === criterion && e.option === option
            );
            const selectedRating = savedRating?.rating;
            const safeCriterion = escapeHtml(criterion);
            return `
                <section class="evaluation-criterion${selectedRating ? '' : ' is-unrated'}">
                    <div class="criterion-heading">
                        <h4>${safeCriterion}</h4>
                        <span class="weight-badge">${(weights[i] * 100).toFixed(1)}%</span>
                    </div>
                    <div class="effort-slider rating-effort-slider" style="--slider-fill:${((selectedRating ?? 3) / 5) * 100}%">
                        <div class="effort-slider-track">
                            <span class="effort-slider-fill" aria-hidden="true"></span>
                            <div class="effort-slider-points" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
                            <input type="range" class="rating-slider" min="1" max="5" step="1"
                                   value="${selectedRating ?? 3}"
                                   data-criterion="${safeCriterion}" data-option="${safeOption}"
                                   aria-label="Rate ${safeOption} for ${safeCriterion} from 1 to 5"
                                   aria-valuetext="${selectedRating ? ratingLabels[selectedRating - 1] : 'Not rated'}">
                        </div>
                        <div class="effort-slider-labels" aria-hidden="true">
                            <span>Poor</span><span>Fair</span><span>Good</span><span>Very good</span><span>Excellent</span>
                        </div>
                    </div>
                </section>`;
        }).join('');

        return `
            <article class="evaluation-option-card" aria-label="Option ${currentEvaluationOption + 1} of ${options.length}">
                <header class="evaluation-option-header">
                    <label class="guided-option-title">
                        <span>Currently evaluating</span>
                        <input class="option-name-input" value="${safeOption}" data-original-name="${safeOption}" aria-label="Rename ${safeOption}">
                    </label>
                    <button type="button" class="btn btn-icon remove-option" data-option="${safeOption}" aria-label="Remove ${safeOption}">×</button>
                </header>
                <div class="evaluation-criteria">${criteriaRows}</div>
            </article>`;
    })() : '';

    const optionAdder = `
        <form class="option-adder${options.length ? ' is-compact' : ''}" id="optionAdder">
            <label for="newOptionName">${options.length ? 'Add another option' : 'Add an option'}</label>
            <div class="option-adder-row">
                <input id="newOptionName" class="input-field" autocomplete="off" placeholder="e.g. Option A">
                <button type="submit" class="btn btn-primary">Add</button>
            </div>
        </form>`;

    let html = options.length
            ? `<div class="evaluation-options">${optionCard}</div>
               <div class="evaluation-page-navigation">
                    <button type="button" class="btn" id="previousEvaluationOption" ${currentEvaluationOption === 0 ? 'disabled' : ''}>← Previous</button>
                    <button type="button" class="btn btn-primary" id="nextEvaluationOption">${currentEvaluationOption === options.length - 1 ? 'Review results' : 'Next →'}</button>
               </div>
               ${optionAdder}`
            : `${optionAdder}
               <div class="evaluation-empty">
                    <h3>Start with the alternatives</h3>
                    <p>Add at least two options. Each will get its own simple rating card.</p>
               </div>`;

    const container = document.getElementById('evaluationMatrix');
    container.innerHTML = html;
    updateEvaluationProgress();
    container.querySelector('#optionAdder').addEventListener('submit', event => {
        event.preventDefault();
        addOption();
    });
    container.querySelectorAll('.option-name-input').forEach(input => {
        input.addEventListener('change', () => renameOption(input.dataset.originalName, input.value));
    });
    container.querySelectorAll('.remove-option').forEach(button => {
        button.addEventListener('click', () => removeOption(button.dataset.option));
    });
    container.querySelectorAll('.rating-slider').forEach(input => {
        input.addEventListener('input', () => setEvaluationRating(input));
    });
    container.querySelector('#previousEvaluationOption')?.addEventListener('click', () => showEvaluationOption(currentEvaluationOption - 1));
    container.querySelector('#nextEvaluationOption')?.addEventListener('click', () => {
        if (currentEvaluationOption < options.length - 1) showEvaluationOption(currentEvaluationOption + 1);
        else calculateFinalResults();
    });
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

    const options = savedData.evaluationData.options;
    const evaluationStep = document.querySelectorAll('.step')[3];
    if (!evaluationStep) return;

    evaluationStep.style.setProperty('--step-progress', `${progressPercent}%`);
    const label = evaluationStep.querySelector('span:last-child');
    if (label) {
        label.textContent = options.length
            ? `Evaluate ${currentEvaluationOption + 1}/${options.length}`
            : 'Evaluate';
    }
    evaluationStep.setAttribute('aria-label', options.length
        ? `Evaluate, option ${currentEvaluationOption + 1} of ${options.length}, ${completed} of ${totalCells} ratings complete`
        : 'Evaluate, add options to begin');
}

function resetEvaluationStepProgress() {
    const evaluationStep = document.querySelectorAll('.step')[3];
    if (!evaluationStep) return;
    evaluationStep.style.removeProperty('--step-progress');
    const label = evaluationStep.querySelector('span:last-child');
    if (label) label.textContent = 'Evaluate';
    evaluationStep.setAttribute('aria-label', 'Evaluate');
}

function calculateFinalResults() {
    const options = savedData.evaluationData.options;
    const criteria = window.savedElements;
    const weights = calculateWeights();

    if (options.length < 2) {
        showStatus('Add at least two options before calculating results.', 'error');
        document.getElementById('newOptionName')?.focus();
        return;
    }

    const missingRating = options.flatMap(option =>
        criteria.map(criterion => ({ option, criterion }))
    ).find(({ option, criterion }) => !savedData.evaluationData.ratings.some(r =>
        r.option === option && r.criterion === criterion && r.rating >= 1 && r.rating <= 5
    ));

    if (missingRating) {
        showStatus(`Rate ${missingRating.option} for ${missingRating.criterion} before calculating.`, 'error');
        currentEvaluationOption = options.indexOf(missingRating.option);
        createEvaluationMatrix(options);
        const missingButton = [...document.querySelectorAll('.rating-slider')].find(input =>
            input.dataset.option === missingRating.option && input.dataset.criterion === missingRating.criterion
        );
        missingButton?.closest('.evaluation-criterion')?.classList.add('is-incomplete');
        missingButton?.focus();
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
    document.body.classList.remove('guided-evaluation-active');
    resetEvaluationStepProgress();
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
        document.body.classList.toggle('guided-evaluation-active', step === 4);
        if (step !== 4) resetEvaluationStepProgress();
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
    
    // Set slider value based on existing comparison or default to center
    const choiceToSelect = existingComparison ? existingComparison.value : 2;
    document.getElementById('comparisonSlider').value = String(choiceToSelect);
    updateChoiceSelection();
    updateNavigationButtons();
    
    // Update progress bar
    const progressPercent = ((currentComparison) / comparisons.length) * 100;
    const progressFill = document.querySelector('.comparison-container .progress-fill');
    const progressText = document.querySelector('.comparison-container .progress-text');
    
    if (progressFill && progressText) {
        progressFill.style.width = `${progressPercent}%`;
        progressFill.parentElement.setAttribute('aria-valuenow', String(Math.round(progressPercent)));
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
        step.disabled = index + 1 > currentStep;
        
        if (index + 1 === currentStep) {
            step.classList.add('active');
            step.setAttribute('aria-current', 'step');
            step.removeAttribute('aria-disabled');
        } else if (index + 1 < currentStep) {
            step.classList.add('completed');
            step.removeAttribute('aria-disabled');
        } else {
            step.classList.add('future');
            step.setAttribute('aria-disabled', 'true');
        }
    });

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
    document.body.classList.toggle('guided-evaluation-active', step === 4);
    if (step !== 4) resetEvaluationStepProgress();
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
            const slider = document.getElementById('comparisonSlider');
            const current = Number(slider.value);
            switch(e.key) {
                case 'ArrowLeft':
                    {
                        const next = Math.max(0, current - 1);
                        slider.value = String(next);
                        updateChoiceSelection();
                    }
                    break;
                case 'ArrowRight':
                    {
                        const next = Math.min(4, current + 1);
                        slider.value = String(next);
                        updateChoiceSelection();
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
            <button type="button" onclick="this.parentElement.parentElement.remove()">Got it</button>
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

function parseCriteria(value) {
    const rawItems = value
        .split(/[,\n]+/)
        .map(item => item.trim())
        .filter(Boolean);
    const seen = new Map();
    const items = [];
    const duplicates = [];

    rawItems.forEach(item => {
        const key = item.toLocaleLowerCase();
        if (seen.has(key)) {
            if (!duplicates.some(duplicate => duplicate.toLocaleLowerCase() === key)) {
                duplicates.push(item);
            }
            return;
        }
        seen.set(key, item);
        items.push(item);
    });

    return {
        items,
        duplicates,
        valid: items.length >= 2 && duplicates.length === 0,
        comparisonsCount: items.length > 1 ? (items.length * (items.length - 1)) / 2 : 0,
    };
}

function updateCriteriaState() {
    const input = document.getElementById('elements');
    if (!input) return;
    const state = parseCriteria(input.value);
    const preview = document.getElementById('workloadPreview');
    const startButton = document.getElementById('startComparisonBtn');
    const isImportanceMode = document.querySelector('input[name="comparisonType"]:checked')?.value === 'importance';

    input.classList.toggle('is-invalid', input.value.trim().length > 0 && !state.valid);
    input.classList.toggle('is-valid', state.valid);
    input.setAttribute('aria-invalid', String(input.value.trim().length > 0 && !state.valid));

    preview.classList.toggle('validation-error', state.duplicates.length > 0);
    preview.classList.toggle('validation-success', state.valid);
    if (state.duplicates.length) {
        preview.textContent = `Duplicate criteria: ${state.duplicates.join(', ')}.`;
    } else if (state.items.length === 0) {
        preview.textContent = 'Add at least two criteria to begin.';
    } else if (state.items.length === 1) {
        preview.textContent = 'Add one more criterion to begin.';
    } else {
        preview.textContent = `${state.items.length} criteria · ${state.comparisonsCount} comparisons`;
    }

    if (isImportanceMode) {
        startButton.innerHTML = 'Start comparison <span aria-hidden="true">→</span>';
        startButton.disabled = !state.valid;
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

function showStatus(message, tone = 'info') {
    const status = document.getElementById('appStatus');
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
    status.hidden = false;
    window.clearTimeout(showStatus.timeoutId);
    showStatus.timeoutId = window.setTimeout(() => {
        status.hidden = true;
    }, 6000);
}
