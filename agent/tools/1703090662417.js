const translate = require('google-translate-api');

// The text to be translated
const textToTranslate = 'I want you to translate it to french then read it aloud.';

// Translate the text to French
translate(textToTranslate, {to: 'fr'}).then(res => {
    return res.text;
}).catch(err => {
    throw new Error('Translation failed: ' + err);
});