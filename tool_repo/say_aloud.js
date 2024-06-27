// This is javascript code for a tool module
class say_aloudTool {

  async execute(params, api) {
    const PlayHT = require('playht');
    const fs = require('fs');
    var player = require('play-sound')({});
    const apiKey = process.env.PLAYHT_AUTHORIZATION;
    const userId = process.env.PLAYHT_USER_ID;
    const maleVoice = process.env.PLAYHT_MALE_VOICE;
    const femaleVoice = process.env.PLAYHT_FEMALE_VOICE;

    PlayHT.init({
      apiKey: apiKey,
      userId: userId,
    });

    function getNonce() {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    async function speakSentence(sentence, voice) {
      if (!sentence) return;
      const stream = await PlayHT.stream(sentence, {
        voiceEngine: 'PlayHT2.0-turbo',
        voiceId: voice === 'male' ? maleVoice : femaleVoice,
      });
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      return new Promise((resolve, reject) => {
        stream.on('end', () => {
          const buf = Buffer.concat(chunks);
          const filename = `${getNonce()}.mp3`;
          fs.writeFileSync(filename, buf);
          player.play(filename, function (err) {
            fs.unlinkSync(filename);
            resolve('done');
          });
        });
      });
    }

    if (!Array.isArray(params)) params = [params];

    for (const param of params) {
      let { text, voice } = param;
      voice = voice || 'female';
      if (!text) throw new Error('Text is required to speak aloud');
      if (!voice) throw new Error('Voice is required to speak aloud');

      let sentences = await api.conversation.chat([
        {
          role: 'system',
          content: 'Convert the given text into a number of sentences meant to be spoken aloud. This means breaking the text into sentences that are easy to read and understand as well as phonetically pronouncing any difficult words, urls, or acronyms.*** Return your response as a RAW JSON ARRAY of strings. ***',
        },
        {
          role: 'user',
          content: text + '\n\n*** Return your response as a RAW JSON ARRAY of strings. ***',
        },
      ]);

      sentences = sentences.content[0].text;
      sentences = sentences instanceof Array ? sentences : JSON.parse(sentences);

      const consumeSentence = async () => {
        return new Promise((resolve, reject) => {
          const loop = async () => {
            const sentence = sentences.shift();
            if (!sentence) return resolve('done');
            await speakSentence(sentence, voice);
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

module.exports = new say_aloudTool();