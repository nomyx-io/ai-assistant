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
            const url = 'https://api.play.ht/api/v2/tts/stream';
            const options = {
                method: 'post',
                url: url,
                headers: {
                    'accept': 'audio/mpeg',
                    'content-type': 'application/json',
                    'authorization': '5359344622a2412796b722605d7962fe',
                    'x-user-id': '1NtEbWVr9tfch4Lzr6JvRZS8gU43'
                },
                responseType: 'arraybuffer',
                data: {
                    text: text,
                    voice: 's3://voice-cloning-zero-shot/10f44b5e-b5ca-4515-bc36-6b8e1272d907/sebastian/manifest.json',
                    output_format: 'mp3'
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