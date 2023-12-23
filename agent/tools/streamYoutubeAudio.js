const ytdl = require('ytdl-core');
const { Readable } = require('stream');
const player = require('play-sound')({});

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'stream_youtube_audio',
            description: 'stream audio from a youtube video with given id',
            parameters: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'The ID of the youtube video.'
                    },
                },
                required: ['id']
            }
        },
    },
    function: async ({ id }) => {

        return new Promise((resolve) => {
            // This function takes a YouTube video ID and streams the audio
            function streamAndPlayAudio(videoId) {
              // Fetch the video stream
              const audioStream = ytdl(videoId, {
                filter: 'audioonly', // We want only the audio
              });
            
              // Handle stream errors (such as the video being unavailable)
              audioStream.on('error', (err) => {
                console.error('Stream error:', err.message);
                resolve(`Error streaming audio from video ${videoId}`);
              });
            
                // Play the audio using the platform's audio player
                player.play(audioStream, function (err) {
                    if (err) throw err
                    resolve(`Playing audio from video ${videoId}`);
                });
            }
            
            // Example usage with a YouTube video ID
            streamAndPlayAudio(id);
        })

    }
}