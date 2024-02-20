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
        say_aloud: async ({ text, voice }: any) => {
            require('dotenv').config();
            const PlayHT = require("playht");
            const fs = require('fs');
            var player = require('play-sound')({})

            var config = require('../config');
            const apiKey = config.PLAYHT_AUTHORIZATION;
            const userId = config.PLAYHT_USER_ID;
            const maleVoice = config.PLAYHT_MALE_VOICE;
            const femaleVoice = config.PLAYHT_FEMALE_VOICE;
            if(!voice) voice = config.playHT.defaultVoice;
            if(!apiKey || !userId || !maleVoice || !femaleVoice) {
                const missing = [];
                if(!apiKey) missing.push('playHT.apiKey');
                if(!userId) missing.push('playHT.userId');
                if(!maleVoice) missing.push('playHT.maleVoice');
                if(!femaleVoice) missing.push('playHT.femaleVoice');
                return `Missing configuration: ${missing.join(', ')} in configuration file. Please ask the user to provide the missing configuration using the ask_for_data tool.`;
            }
            // Initialize PlayHT API
            PlayHT.init({
                apiKey: apiKey,
                userId: userId,
            });

            async function speakSentence(sentence: string, voice: string) {
                if(!sentence) return;
                const stream = await PlayHT.stream(sentence, {
                    voiceEngine: "PlayHT2.0-turbo",
                    voiceId: voice === 'male' ? maleVoice : femaleVoice,
                });
                const chunks: any = [];
                stream.on("data", (chunk: any) => chunks.push(chunk));

                return new Promise((resolve, reject) => {
                    stream.on("end", () => {
                        const buf = Buffer.concat(chunks);
                        // save the audio to a file
                        const filename = `${getNonce()}.mp3`;
                        fs.writeFileSync(filename, buf);
                        player.play(filename, function (err: any) {
                            fs.unlinkSync(filename);
                            resolve(`done`);
                        });
                    });
                })
            }
            

            // split the text into sentences
            const sentences = text.split(/[.!?]/g).filter((sentence: any) => sentence.length > 0);
            const consumeSentence = async () => {
                return new Promise((resolve, reject) => {
                    const loop: any = async ()=> {
                        const sentence = sentences.shift();
                        if(!sentence) return resolve('done');
                        await speakSentence(sentence, voice);
                        return await loop();
                    };
                    return loop();
                });
            };
            await consumeSentence();
            return '(aloud) ' + text;
        }
    }
};