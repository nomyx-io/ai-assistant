export class ConfidenceCalculator {
  calculateInitialConfidence(chromaConfidence: number, response: string): number {
    const lengthScore = this.calculateLengthScore(response);
    const complexityScore = this.calculateComplexityScore(response);

    // Weighted average of factors
    const confidence = (
      chromaConfidence * 0.6 +
      lengthScore * 0.2 +
      complexityScore * 0.2
    );

    return Math.min(Math.max(confidence, 0), 1); // Ensure confidence is between 0 and 1
  }

  calculateRetrievalConfidence(storedConfidence: number, chromaConfidence: number): number {
    // Combine stored confidence with Chroma's similarity score
    const combinedConfidence = (storedConfidence + chromaConfidence) / 2;
    return Math.min(Math.max(combinedConfidence, 0), 1);
  }

  updateConfidence(oldConfidence: number, chromaConfidence: number): number {
    // Exponential moving average to smooth confidence updates
    const alpha = 0.3; // Smoothing factor
    const updatedConfidence = alpha * chromaConfidence + (1 - alpha) * oldConfidence;

    return Math.min(Math.max(updatedConfidence, 0), 1); // Ensure confidence is between 0 and 1
  }

  private calculateLengthScore(response: string): number {
    const words = this.simpleTokenize(response);
    const optimalLength = 50; // Adjust based on your use case
    const lengthDifference = Math.abs(words.length - optimalLength);
    return Math.exp(-lengthDifference / optimalLength);
  }

  private calculateComplexityScore(response: string): number {
    const words = this.simpleTokenize(response);
    const uniqueWords = new Set(words);
    const lexicalDiversity = uniqueWords.size / words.length;

    // Assuming a good lexical diversity is around 0.6-0.7
    return Math.min(lexicalDiversity / 0.7, 1);
  }

  private simpleTokenize(text: string): string[] {
    // Simple word-splitting function
    return text.toLowerCase().match(/\b(\w+)\b/g) || [];
  }
}