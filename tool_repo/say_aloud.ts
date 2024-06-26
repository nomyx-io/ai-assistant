(params, api) => __awaiter(void 0, void 0, void 0, function* () {
            const PlayHT = require('playht');
            const fs = require('fs');
            var player = require('play-sound')({});
            const apiKey = process.env.PLAYHT_AUTHORIZATION;
            const userId = process.env.PLAYHT_USER_ID;
            const maleVoice = process.env.PLAYHT_MALE_VOICE;
            const femaleVoice = process.env.PLAYHT_FEMALE_VOICE;
            // Initialize PlayHT API
            PlayHT.init({
                apiKey: apiKey,
                userId: userId,
            });
            function getNonce() {
                return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            }
            function speakSentence(sentence, voice) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!sentence)
                        return;
                    const stream = yield PlayHT.stream(sentence, {
                        voiceEngine: 'PlayHT2.0-turbo',
                        voiceId: voice === 'male' ? maleVoice : femaleVoice,
                    });
                    const chunks = [];
                    stream.on('data', (chunk) => chunks.push(chunk));
                    return new Promise((resolve, reject) => {
                        stream.on('end', () => {
                            const buf = Buffer.concat(chunks);
                            // save the audio to a file
                            const filename = `${getNonce()}.mp3`;
                            fs.writeFileSync(filename, buf);
                            player.play(filename, function (err) {
                                fs.unlinkSync(filename);
                                resolve('done');
                            });
                        });
                    });
                });
            }
            if (!Array.isArray(params))
                params = [params];
            for (const param of params) {
                // if params is a string, convert it to an object
                let { text, voice } = param;
                voice = voice || 'female';
                if (!text)
                    throw new Error('Text is required to speak aloud');
                if (!voice)
                    throw new Error('Voice is required to speak aloud');
                let sentences = yield api.callTool('callLLM', {
                    system_prompt: 'convert the following text into a number of sentences meant to be spoken aloud. This means breaking the text into sentences that are easy to read and understand as well as phonetically pronouncing any difficult words, urls, or acronyms. *** Return your response as a RAW JSON ARRAY of strings. ***',
                    prompt: text,
                    responseFormat: `string[]`,
                });
                sentences = sentences instanceof Array ? sentences : JSON.parse(sentences);
                const consumeSentence = () => __awaiter(void 0, void 0, void 0, function* () {
                    return new Promise((resolve, reject) => {
                        const loop = () => __awaiter(void 0, void 0, void 0, function* () {
                            const sentence = sentences.shift();
                            if (!sentence)
                                return resolve('done');
                            yield speakSentence(sentence, voice);
                            return yield loop();
                        });
                        return loop();
                    });
                });
                yield consumeSentence();
            }
            return '(aloud) ' + blessed_1.text;
        })