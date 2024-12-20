# Pairwise Comparison Tool

## Overview

Pairwise is a web-based decision-making tool that helps users make systematic comparisons and evaluations through pairwise comparisons and weighted criteria. It implements the Analytic Hierarchy Process (AHP) methodology to break down complex decisions into simpler comparisons.

🔗 **Try it now: [pairwise-compare.vercel.com](https://pairwise-compare.vercel.com)**

## Features

### 1. Flexible Input Methods
- **New Comparison**: Start fresh by entering criteria to compare
- **Matrix Import**: Upload previously exported comparison matrices (CSV format)

### 2. Four-Step Decision Process

#### Step 1: Setup
- Choose between starting a new comparison or using an existing matrix
- Input criteria for comparison
- Support for multiple criteria input via comma-separated values

#### Step 2: Compare
- Interactive pairwise comparison interface
- Intuitive slider-based importance selection
- Visual feedback for comparison progress
- Navigation controls (Previous/Next)
- Real-time validation and feedback

#### Step 3: Results
- Detailed comparison matrix display
- Importance scores and percentages
- Two view modes:
  - Summary view with rankings
  - Detailed matrix view
- Export results to CSV

#### Step 4: Evaluate
- Input options for evaluation
- Rate options against weighted criteria
- 1-5 rating scale with clear guidelines
- Real-time calculation of final scores

### 3. User Interface Features
- Clean, modern design
- Progress tracking
- Responsive layout
- Interactive tooltips
- Visual feedback for user actions
- Keyboard navigation support

### 4. Data Management
- Automatic saving of progress
- CSV export functionality
- Matrix import/export capabilities

## Use Cases

Perfect for:
- Product Decisions
- Career Choices
- Feature Prioritization
- Investment Decisions
- Any complex choice with multiple factors

## How to Use

1. Visit [pairwise-compare.vercel.com](https://pairwise-compare.vercel.com)
2. Enter your criteria or upload an existing matrix
3. Complete the comparisons
4. Review results and export if needed
5. Evaluate options against your criteria
6. Get final rankings

## File Format

### CSV Export Format
```csv
Elements,Criterion1,Criterion2,Criterion3,Score,Percentage
Criterion1,1,3,0.33,1.44,33.3
Criterion2,0.33,1,0.2,0.51,11.8
Criterion3,3,5,1,3.00,54.9
```

## Technical Stack

Built with modern web technologies:
- HTML5
- CSS3
- Vanilla JavaScript
- No external dependencies

### Key Features
- Responsive design
- Offline-capable
- Local storage for progress saving
- Modern UI with smooth transitions
- Cross-browser compatibility

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Privacy

All calculations are performed client-side, and no data is sent to any server. Your decision data remains private and secure in your browser's local storage.

## Feedback

For bug reports or feature requests, please visit [pairwise-compare.vercel.com/feedback](https://pairwise-compare.vercel.com/feedback)
