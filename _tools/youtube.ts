import ytdl, { downloadOptions } from 'ytdl-core';
import fs from 'fs';
var player = require('play-sound')({})

function getNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

module.exports = {
    enabled: false,
    tools: {
        youtube_stream_audio: { 
            schema: {
                type: 'function',
                function: {
                    name: 'youtube_stream_audio',
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
            action: async ({ id }: any) => {
                return new Promise((resolve) => {
                    try {
                        // This function takes a YouTube video ID and streams the audio
                        function streamAndPlayAudio(videoId: string) {
                            // Fetch the video stream
                            const audioStream = ytdl(videoId, {
                                filter: 'audioonly', // We want only the audio
                            } as downloadOptions);
                            audioStream.on('error', (err) => {
                                console.error('Stream error:', err.message);
                                resolve(`Error streaming audio from video ${videoId}`);
                            });
                            // Pipe the stream to a file
                            const filePath = `/tmp/${getNonce()}.mp3`;

                            const writeStream = fs.createWriteStream(filePath);
                            audioStream.pipe(writeStream);
                            audioStream.on('end', () => {
                                // Play the file
                                player.play(filePath, (err: any) => {
                                    if (err) {
                                        console.error('Error playing file:', err);
                                        resolve(`Error playing audio from video ${videoId}`);
                                    }
                                    // Delete the file
                                    fs.unlink(filePath, (err) => {
                                        if (err) {
                                            return resolve(`Error deleting file ${filePath}`);
                                        }
                                        resolve(`Played audio from video ${videoId}`);
                                    });
                                });
                            });
                        }

                        // Example usage with a YouTube video ID
                        streamAndPlayAudio(id);
                    } catch (err) {
                        console.error(err);
                        resolve(`Error streaming audio from video ${id}`);
                    }
                })
            }
        }
    }
}
export default module.exports;