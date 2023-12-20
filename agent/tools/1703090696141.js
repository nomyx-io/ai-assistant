const { TranslationServiceClient } = require('@google-cloud/translate');

// Instantiates a client
const translationClient = new TranslationServiceClient();

// The text to translate
const text = 'I want you to translate it to french then read it aloud.';

// The target language
const target = 'fr';

async function translateText() {
  // Construct request
  const request = {
    parent: 'projects/YOUR_PROJECT_ID/locations/global',
    contents: [text],
    mimeType: 'text/plain', // mime types: text/plain, text/html
    sourceLanguageCode: 'en',
    targetLanguageCode: target,
  };

  // Run request
  const [response] = await translationClient.translateText(request);
  return response.translations[0].translatedText;
}

translateText();