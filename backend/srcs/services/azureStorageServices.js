const { blobServiceClient, sharedKeyCredential } = require('../config/azureStorage');
const { v4: uuidv4 } = require('uuid');
const { BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');

/**
 * 파일을 Azure Blob Storage에 업로드하고 SAS URL을 반환합니다.
 * ... (함수 주석은 동일) ...
 */
const uploadFile = async (buffer, originalname, mimetype, containerName = 'contents-images') => {
	const containerClient = blobServiceClient.getContainerClient(containerName);
	// 컨테이너 접근 수준을 설정할 필요가 없습니다. 비공개가 기본입니다.
	await containerClient.createIfNotExists();

	const blobName = `${uuidv4()}-${originalname}`;
	const blockBlobClient = containerClient.getBlockBlobClient(blobName);

	await blockBlobClient.uploadData(buffer, {
		blobHTTPHeaders: { blobContentType: mimetype }
	});

	// --- SAS 토큰 생성 로직 ---
	const sasOptions = {
		containerName: containerName,
		blobName: blobName,
		permissions: BlobSASPermissions.parse("r"), // "r" = 읽기 전용 권한
		startsOn: new Date(),
		expiresOn: new Date(new Date().valueOf() + 24 * 60 * 60 * 1000), // 24시간 동안 유효
	};

	// SAS 토큰 생성
	const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
	
	// 기본 URL에 SAS 토큰을 쿼리스트링으로 추가하여 반환
	return `${blockBlobClient.url}?${sasToken}`;
};

// ... (deleteFile 함수는 그대로 유지) ...

module.exports = {
	uploadFile,
	// deleteFile,
};