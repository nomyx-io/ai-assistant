const PlayHT = require('playht');
const fs = require('fs');
var player = require('play-sound')({});

class SayAloud {
  constructor() {
    this.apiKey = process.env.PLAYHT_AUTHORIZATION;
    this.userId = process.env.PLAYHT_USER_ID;
    this.maleVoice = process.env.PLAYHT_MALE_VOICE;
    this.femaleVoice = process.env.PLAYHT_FEMALE_VOICE;

    PlayHT.init({
      apiKey: this.apiKey,
      userId: this.userId,
    });
  }

  getNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async speakSentence(sentence, voice) {
    if (!sentence) return;
    const stream = await PlayHT.stream(sentence, {
      voiceEngine: 'PlayHT2.0-turbo',
      voiceId: voice === 'male' ? this.maleVoice : this.femaleVoice,
    });
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        const buf = Buffer.concat(chunks);
        const filename = `${this.getNonce()}.mp3`;
        fs.writeFileSync(filename, buf);
        player.play(filename, function (err) {
          fs.unlinkSync(filename);
          resolve('done');
        });
      });
    });
  }

  async say_aloud(params, api) {
    if (!Array.isArray(params)) params = [params];
    for (const param of params) {
      let { text, voice } = param;
      voice = voice || 'female';
      if (!text) throw new Error('Text is required to speak aloud');
      if (!voice) throw new Error('Voice is required to speak aloud');
      let sentences = await api.callTool('callLLM', {
        system_prompt: 'convert the following text into a number of sentences meant to be spoken aloud. This means breaking the text into sentences that are easy to read and understand as well as phonetically pronouncing any difficult words, urls, or acronyms. *** Return your response as a RAW JSON ARRAY of strings. ***',
        prompt: text,
        responseFormat: `string[]`,
      });
      sentences = sentences instanceof Array ? sentences : JSON.parse(sentences);
      const consumeSentence = async () => {
        return new Promise((resolve, reject) => {
          const loop = async () => {
            const sentence = sentences.shift();
            if (!sentence) return resolve('done');
            await this.speakSentence(sentence, voice);
            return await loop();
          };
          return loop();
        });
      };
      await consumeSentence();
    }
    return '(aloud) ' + text;
  }
}

module.exports = { SayAloud };