import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminPage = () => {
    const [cachingStatus, setCachingStatus] = useState('Unknown');
    const [cacheFiles, setCacheFiles] = useState([]);

    // Fetch admin data
    useEffect(() => {
        const fetchData = async () => {
            const adminData = await axios.get('/api/admin/data');
            setCachingStatus(adminData.data.cachingStatus);
            setCacheFiles(adminData.data.cacheFiles);
        };
        fetchData();
    }, []);

    // Handlers for buttons
    const handleToggleCaching = async () => {
        const response = await axios.post('/api/admin/toggleCaching');
        setCachingStatus(response.data.cachingStatus);
    };

    const handleClearCache = async () => {
        await axios.post('/api/admin/clearCache');
        setCacheFiles([]);
    };

    return (
        <div className="container mt-5">
            <h1>Cache Proxy Admin</h1> <p><strong>Caching Status:</strong> {cachingStatus}</p>
            <button className="btn btn-warning mb-3" onClick={handleToggleCaching}>Toggle Caching</button>
            <button className="btn btn-danger mb-3" onClick={handleClearCache}>Clear Cache</button>

            <h2>Cache Overview</h2>
            {cacheFiles.length > 0 ? (
                <ul className="list-group">
                    {cacheFiles.map((file, index) => (
                        <li key={index} className="list-group-item">
                            Cache Key: {file} <a href="#!" className="btn btn-primary btn-sm">View</a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No cached items.</p>
            )}
        </div>
    );
}
export default AdminPage