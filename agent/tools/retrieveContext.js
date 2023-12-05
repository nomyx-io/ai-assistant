module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'retrieveContext',
            description: 'Retrieves contextually relevant data from ChromaDB',
            parameters: {
                type: 'object',
                properties: {
                    embeddings: {
                        type: 'array',
                        description: 'Embeddings used for querying the database'
                    }
                },
                required: ['embeddings']
            }
        },
    },
    function: async ({ embeddings }) => {
        // Query ChromaDB using embeddings
        const collection = chromadb.getCollection('conversationData');
        const queryResults = collection.query({ embeddings });
        return { queryResults };
    }
};
