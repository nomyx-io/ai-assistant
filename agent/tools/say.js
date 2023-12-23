require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const PlayHT = require('playht');
const player = require('play-sound')({});

module.exports = {
    schema: {
        "type": 'function',
        "function": {
            "name": 'say_text',                                                                                                                                                                 
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
                        "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default male voice will be used',  
                    }                                                                                                                                                               
                },                                                                                                                                                                         
                "required": ['text']                                                                                                                                                        
            }      
        }
    },
    function: async ({ text, voice }) => {
        if(!voice) {
            voice = 'male'
        } else if(voice === 'male') {
            voice = process.env.PLAY_HT_MALE_VOICE
        } else if(voice === 'female') {
            voice = process.env.PLAY_HT_FEMALE_VOICE
        }
        // Initialize PlayHT API
        PlayHT.init({
            apiKey: process.env.PLAY_HT_AUTHORIZATION,
            userId: process.env.PLAY_HT_USER_ID
        });

        const GenerationOptions = {
            voiceEngine: "PlayHT2.0-turbo",
            voiceId: voice
        };
        // Warm up the network caching and voice
        const warmUpStream = await PlayHT.stream("warm up", GenerationOptions);
        await new Promise((resolve, reject) => {
            warmUpStream.on("data", resolve);
            warmUpStream.on("error", reject);
        });

        // split the text into sentences
        const sentences = text.split(/[.!?]/g).filter(sentence => sentence.length > 0);
        
        const consumeSentence = async () => {
            const sentence = sentences.shift();
            if (!sentence) return `done`;
    
            const musicFileName = getNonce() + ".mp3";
            const fileStream = createWriteStream(musicFileName);
            const stream = await PlayHT.stream(sentence, GenerationOptions);
            stream.on("data", (chunk) => fileStream.write(chunk));
            stream.on("end", () => {
                fileStream.end();
                console.log(`speaking: ${sentence}`)
                player.play(musicFileName, () => {
                    consumeSentence()
                })
            });
            stream.on("error", () => consumeSentence);
        }
        await consumeSentence();
    }
}