import fs from 'fs'; import path from 'path';

const cacheDir = path.resolve('./cache');

export default async function handler(req, res) { 
    if (req.method === 'POST') { 
        // Attempt to clear the cache directory 
        try { 
            fs.readdirSync(cacheDir).forEach(file => { 
                const currentPath = path.join(cacheDir, file); 
                fs.unlinkSync(currentPath); 
            }); 
            res.status(200).send('Cache cleared.'); 
        } catch (error) { 
            console.error(`Failed to clear cache: ${error}`); 
            res.status(500).send('Error clearing cache'); 
        } 
    } else { 
        res.setHeader('Allow', ['POST']); 
        res.status(405).end(`Method ${req.method} Not Allowed`); 
    } 
}