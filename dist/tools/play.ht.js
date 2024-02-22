"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
module.exports = {
    state: {
        modules: [{
                name: 'play.ht',
                description: 'Text to speech using PlayHT',
                version: '0.0.1',
            }],
        playHT: {
            defaultVoice: 'female'
        }
    },
    schemas: [{
            "type": 'function',
            "function": {
                "name": 'say_aloud',
                "description": 'say the text using text-to-speech',
                "parameters": {
                    "type": 'object',
                    "properties": {
                        "text": {
                            "type": 'string',
                            "description": 'the text to say',
                        },
                        "voice": {
                            "type": 'string',
                            "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default female voice will be used',
                        }
                    },
                    "required": ['text']
                }
            }
        }],
    tools: {
        say_aloud: ({ text, voice }) => __awaiter(void 0, void 0, void 0, function* () {
            require('dotenv').config();
            const PlayHT = require("playht");
            const fs = require('fs');
            var player = require('play-sound')({});
            var config = require('../config');
            const apiKey = config.PLAYHT_AUTHORIZATION;
            const userId = config.PLAYHT_USER_ID;
            const maleVoice = config.PLAYHT_MALE_VOICE;
            const femaleVoice = config.PLAYHT_FEMALE_VOICE;
            if (!voice)
                voice = config.playHT.defaultVoice;
            if (!apiKey || !userId || !maleVoice || !femaleVoice) {
                const missing = [];
                if (!apiKey)
                    missing.push('playHT.apiKey');
                if (!userId)
                    missing.push('playHT.userId');
                if (!maleVoice)
                    missing.push('playHT.maleVoice');
                if (!femaleVoice)
                    missing.push('playHT.femaleVoice');
                return `Missing configuration: ${missing.join(', ')} in configuration file. Please ask the user to provide the missing configuration using the ask_for_data tool.`;
            }
            // Initialize PlayHT API
            PlayHT.init({
                apiKey: apiKey,
                userId: userId,
            });
            function speakSentence(sentence, voice) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!sentence)
                        return;
                    const stream = yield PlayHT.stream(sentence, {
                        voiceEngine: "PlayHT2.0-turbo",
                        voiceId: voice === 'male' ? maleVoice : femaleVoice,
                    });
                    const chunks = [];
                    stream.on("data", (chunk) => chunks.push(chunk));
                    return new Promise((resolve, reject) => {
                        stream.on("end", () => {
                            const buf = Buffer.concat(chunks);
                            // save the audio to a file
                            const filename = `${getNonce()}.mp3`;
                            fs.writeFileSync(filename, buf);
                            player.play(filename, function (err) {
                                fs.unlinkSync(filename);
                                resolve(`done`);
                            });
                        });
                    });
                });
            }
            // split the text into sentences
            const sentences = text.split(/[.!?]/g).filter((sentence) => sentence.length > 0);
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
            return '(aloud) ' + text;
        })
    }
};
//# sourceMappingURL=play.ht.js.map