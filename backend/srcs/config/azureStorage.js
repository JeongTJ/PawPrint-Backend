const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set in environment variables.');
}
if (!process.env.AZURE_STORAGE_ACCOUNT_NAME || !process.env.AZURE_STORAGE_ACCOUNT_KEY) {
    throw new Error('Azure account name or key is not set in environment variables for SAS token generation.');
}

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

// SAS 토큰 서명을 위한 공유 키 자격 증명
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);

console.log('Azure Blob Storage client initialized.');

module.exports = {
    blobServiceClient,
    sharedKeyCredential,
};