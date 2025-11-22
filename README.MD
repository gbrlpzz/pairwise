# Pairwise Comparison Tool

A web-based tool for making complex decisions using the Analytic Hierarchy Process (AHP) through pairwise comparisons.

## Privacy-First Decision Making

- **100% Client-Side**: All calculations happen in your browser
- **Zero Data Collection**: Your decisions stay completely private
- **No Account Required**: Just open and use
- **Local Storage Only**: Data saved locally in your browser
- **No External Dependencies**

## About

This tool helps you make better decisions by breaking down complex choices into simple comparisons. It uses the Analytic Hierarchy Process (AHP), a structured method for organizing and analyzing complex decisions.

### How It Works

The process happens in 4 steps:

1. **Setup**: Enter the criteria that matter for your decision (e.g., Price, Quality, Speed)

2. **Compare**: Make pairwise comparisons between criteria to establish their relative importance
   - Compare two criteria at a time
   - Use a slider to indicate which is more important and by how much
   - The tool will guide you through all necessary comparisons

3. **Results**: View the weighted importance of each criterion
   - See how your comparisons translate into percentage weights
   - Download the comparison matrix for future use

4. **Evaluate**: Rate your options against each criterion
   - Enter the options you're considering
   - Rate how well each option performs for each criterion
   - Get a final weighted score that accounts for both criteria importance and option performance

### Perfect For

- Product Decisions
- Career Choices
- Feature Prioritization
- Investment Decisions
- Any complex choice with multiple factors

### The Math Behind It

1. **Pairwise Comparison Matrix**: Your comparisons create a matrix where:
   - Each element represents the relative importance of criterion i compared to criterion j
   - If criterion A is 3 times more important than B, then B is 1/3 as important as A
   - The diagonal is always 1 (each criterion compared to itself)

2. **Priority Vector**: The final weights are calculated by:
   - Normalizing the matrix (dividing each element by its column sum)
   - Taking the average of each row in the normalized matrix

3. **Final Scores**: Options are scored by:
   - Multiplying each rating by the criterion's weight
   - Summing these weighted ratings for each option

## Usage

1. Visit the tool at https://compare.gbrlpzz.com/
2. Choose between starting a new comparison or uploading an existing matrix
3. Follow the step-by-step process
4. Download your results or continue to evaluate options

## Development

The tool is built with vanilla JavaScript and uses modern CSS features. To run locally:

1. Clone the repository
2. Open `index.html` in a web browser
3. No build process or dependencies required

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
