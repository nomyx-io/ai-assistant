// pages/api/admin/data.js 
import fs from 'fs'; import path from 'path';

const cacheDir = path.resolve('./cache');

export default async function handler(req, res) { 
    if (req.method === 'GET') { 
        const cachingStatus = 'Enabled'; // Assuming a method to check if caching is enabled 
        let cacheFiles = []; 
        try { 
            cacheFiles = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir) : []; 
        } catch (error) { 
            console.error(error); 
        }       
        res.status(200).json({ cachingStatus, cacheFiles });
    } else { 
        // Handle any other HTTP method 
        res.setHeader('Allow', ['GET']); 
        res.status(405).end(`Method ${req.method} Not Allowed`); 
    } 
}