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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const fs_1 = __importDefault(require("fs"));
var player = require('play-sound')({});
function getNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
module.exports = {
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
            action: ({ id }) => __awaiter(void 0, void 0, void 0, function* () {
                return new Promise((resolve) => {
                    try {
                        // This function takes a YouTube video ID and streams the audio
                        function streamAndPlayAudio(videoId) {
                            // Fetch the video stream
                            const audioStream = (0, ytdl_core_1.default)(videoId, {
                                filter: 'audioonly', // We want only the audio
                            });
                            audioStream.on('error', (err) => {
                                console.error('Stream error:', err.message);
                                resolve(`Error streaming audio from video ${videoId}`);
                            });
                            // Pipe the stream to a file
                            const filePath = `/tmp/${getNonce()}.mp3`;
                            const writeStream = fs_1.default.createWriteStream(filePath);
                            audioStream.pipe(writeStream);
                            audioStream.on('end', () => {
                                // Play the file
                                player.play(filePath, (err) => {
                                    if (err) {
                                        console.error('Error playing file:', err);
                                        resolve(`Error playing audio from video ${videoId}`);
                                    }
                                    // Delete the file
                                    fs_1.default.unlink(filePath, (err) => {
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
                    }
                    catch (err) {
                        console.error(err);
                        resolve(`Error streaming audio from video ${id}`);
                    }
                });
            })
        }
    }
};
exports.default = module.exports;
