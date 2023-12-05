const chromadb = require('chromadb');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'gasEmbeddingAndRetrieveContext',
            description: 'Converts text into embeddings and stores them in a ChromaDB collection',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'The text to convert into embeddings'
                    },
                    collectionName: {
                        type: 'string',
                        description: 'The name of the ChromaDB collection to store the embeddings'
                    }
                },
                required: ['text', 'collectionName']
            }
        },
    },
    function: async ({ text, collectionName }) => {
        try {
            const client = chromadb.createClient(); // Create a ChromaDB client
            const collection = client.getCollection(collectionName); // Access the specified collection

            // Add the text to the collection, which automatically generates and stores the embeddings
            await collection.add({
                documents: [text]
            });

            return { success: true, message: 'Text embeddings generated and stored successfully.' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};
