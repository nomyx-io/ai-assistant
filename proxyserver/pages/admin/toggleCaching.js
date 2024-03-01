// This should change the caching enabled/disabled status 
// For simplicity, we're mimicking this with a global variable here, but in a real application, this should interact with your actual caching logic. 
let cachingEnabled = true; // This should be retrieved and updated using your actual logic

export default function handler(req, res) { 
    if (req.method === 'POST') { 
        cachingEnabled = !cachingEnabled;
        res.status(200).json({ 
            cachingStatus: cachingEnabled ? 'Enabled' : 'Disabled' 
        }); 
    } else { 
        res.setHeader('Allow', ['POST']); 
        res.status(405).end(`Method ${req.method} Not Allowed`); 
    } 
}
