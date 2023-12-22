require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const player = require('play-sound')({});

module.exports = {
    schema: {
        "type": 'function',
        "function": {
            "name": 'say',                                                                                                                                                                 
            "description": 'say the text using text-to-speech',                                                                                                                         
            "parameters": {                                                                                                                                                                
                "type": 'object',                                                                                                                                                          
                "properties": {                                                                                                                                                            
                    "text": {                                                                                                                                                               
                        "type": 'string',                                                                                                                                                  
                        "description": 'the text to say',                                                                                                                                
                    },                                                                                                                                                                     
                },                                                                                                                                                                         
                "required": ['text']                                                                                                                                                        
            }      
        }
    },
    function: ({ text }) => {
        return new Promise((resolve, reject) => {
            const url = process.env.PLAY_HT_URL;
            const options = {
                method: 'post',
                url: url,
                headers: {
                    'accept': 'audio/mpeg',
                    'content-type': 'application/json',
                    'authorization': process.env.PLAY_HT_AUTHORIZATION,
                    'x-user-id': process.env.PLAY_HT_USER_ID,
                },
                responseType: 'arraybuffer',
                data: {
                    text: text,
                    voice: process.env.PLAY_HT_VOICE,
                    output_format: 'mp3',
                    voice_guidance: 3,
                    style_guidance: 20,
                    text_guidance: 1
                }
            };
            axios(options)
                .then(response => {
                    if (response.status !== 200) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.data;
                })
                .then(buffer => {
                    fs.writeFileSync('audio.mp3', Buffer.from(buffer));
                    // play the audio file
                    player.play('audio.mp3', function (err) {
                        if (err) reject(err);
                        resolve(text);
                    });
                })
        });
    }
}