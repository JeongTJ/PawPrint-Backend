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


/**
 * URL에서 blob 이름을 추출하는 유틸리티 함수
 * @param {string} fileUrl - 파일 URL (SAS 토큰 포함 가능)
 * @returns {string|null} - blob 이름 또는 null
 */
const extractBlobNameFromUrl = (fileUrl) => {
	try {
		const url = new URL(fileUrl);
		const pathParts = url.pathname.split('/');
		// URL 형태: https://{account}.blob.core.windows.net/{container}/{blobName}
		return pathParts.length >= 3 ? pathParts.slice(2).join('/') : null;
	} catch (error) {
		console.error('URL 파싱 오류:', error);
		return null;
	}
};

/**
 * Azure Blob Storage에서 파일을 삭제합니다.
 * @param {string} fileUrl - 삭제할 파일의 URL
 * @param {string} containerName - 컨테이너 이름 (기본값: 'contents-images')
 * @returns {Promise<boolean>} - 삭제 성공 여부
 */
const deleteFile = async (fileUrl, containerName = 'contents-images') => {
	try {
		const blobName = extractBlobNameFromUrl(fileUrl);
		
		if (!blobName) {
			console.error('유효하지 않은 파일 URL:', fileUrl);
			return false;
		}

		const containerClient = blobServiceClient.getContainerClient(containerName);
		const blockBlobClient = containerClient.getBlockBlobClient(blobName);
		
		// 파일이 존재하는지 확인
		const exists = await blockBlobClient.exists();
		if (!exists) {
			console.warn('삭제하려는 파일이 존재하지 않습니다:', fileUrl);
			return true; // 이미 없으므로 성공으로 간주
		}

		// 파일 삭제
		await blockBlobClient.delete();
		console.log('파일 삭제 성공:', fileUrl);
		return true;
		
	} catch (error) {
		console.error('파일 삭제 실패:', fileUrl, error);
		return false;
	}
};

/**
 * 여러 파일을 한 번에 삭제합니다.
 * @param {string[]} fileUrls - 삭제할 파일 URL 배열
 * @param {string} containerName - 컨테이너 이름 (기본값: 'contents-images')
 * @returns {Promise<{success: string[], failed: string[]}>} - 성공/실패한 파일 목록
 */
const deleteMultipleFiles = async (fileUrls, containerName = 'contents-images') => {
	const results = { success: [], failed: [] };
	
	// 병렬로 삭제 처리
	const deletePromises = fileUrls.map(async (fileUrl) => {
		const success = await deleteFile(fileUrl, containerName);
		if (success) {
			results.success.push(fileUrl);
		} else {
			results.failed.push(fileUrl);
		}
	});
	
	await Promise.all(deletePromises);
	return results;
};

/**
 * 여러 파일을 업로드합니다.
 * @param {Array} files - 업로드할 파일 배열 (각 파일은 {buffer, originalname, mimetype} 구조)
 * @param {string} containerName - 컨테이너 이름 (기본값: 'contents-images')
 * @returns {Promise<string[]>} - 업로드된 파일 URL 배열
 */
const uploadMultipleFiles = async (files, containerName = 'contents-images') => {
	const uploadPromises = files.map(file => 
		uploadFile(file.buffer, file.originalname, file.mimetype, containerName)
	);
	
	return await Promise.all(uploadPromises);
};

/**
 * 기존 blob에 대해 새로운 SAS URL을 생성합니다.
 * @param {string} fileUrl - 기존 파일 URL (만료된 SAS 토큰 포함 가능)
 * @param {string} containerName - 컨테이너 이름 (기본값: 'contents-images')
 * @param {number} expirationHours - SAS 토큰 만료 시간 (시간 단위, 기본값: 24시간)
 * @returns {Promise<string|null>} - 새로운 SAS URL 또는 null (실패 시)
 */
const regenerateSasUrl = async (fileUrl, containerName = 'contents-images', expirationHours = 24) => {
	try {
		const blobName = extractBlobNameFromUrl(fileUrl);
		
		if (!blobName) {
			console.error('유효하지 않은 파일 URL:', fileUrl);
			return null;
		}

		const containerClient = blobServiceClient.getContainerClient(containerName);
		const blockBlobClient = containerClient.getBlockBlobClient(blobName);
		
		// 파일이 존재하는지 확인
		const exists = await blockBlobClient.exists();
		if (!exists) {
			console.error('파일이 존재하지 않습니다:', fileUrl);
			return null;
		}

		// 새로운 SAS 토큰 생성
		const sasOptions = {
			containerName: containerName,
			blobName: blobName,
			permissions: BlobSASPermissions.parse("r"), // 읽기 전용 권한
			startsOn: new Date(),
			expiresOn: new Date(new Date().valueOf() + expirationHours * 60 * 60 * 1000),
		};

		const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
		const newSasUrl = `${blockBlobClient.url}?${sasToken}`;
		
		console.log('SAS URL 재생성 성공:', fileUrl, '->', newSasUrl);
		return newSasUrl;
		
	} catch (error) {
		console.error('SAS URL 재생성 실패:', fileUrl, error);
		return null;
	}
};

/**
 * 여러 파일의 SAS URL을 재생성합니다.
 * @param {string[]} fileUrls - 재생성할 파일 URL 배열
 * @param {string} containerName - 컨테이너 이름 (기본값: 'contents-images')
 * @param {number} expirationHours - SAS 토큰 만료 시간 (시간 단위, 기본값: 24시간)
 * @returns {Promise<{success: {old: string, new: string}[], failed: string[]}>} - 성공/실패한 파일 목록
 */
const regenerateMultipleSasUrls = async (fileUrls, containerName = 'contents-images', expirationHours = 24) => {
	const results = { success: [], failed: [] };
	
	// 병렬로 재생성 처리
	const regeneratePromises = fileUrls.map(async (fileUrl) => {
		const newUrl = await regenerateSasUrl(fileUrl, containerName, expirationHours);
		if (newUrl) {
			results.success.push({ old: fileUrl, new: newUrl });
		} else {
			results.failed.push(fileUrl);
		}
	});
	
	await Promise.all(regeneratePromises);
	return results;
};

/**
 * SAS URL이 만료되었는지 확인합니다.
 * @param {string} sasUrl - 확인할 SAS URL 
 * @returns {boolean} - 만료 여부 (true: 만료됨, false: 유효함)
 */
const isSasUrlExpired = (sasUrl) => {
	try {
		const url = new URL(sasUrl);
		const seParam = url.searchParams.get('se'); // SAS 만료 시간 파라미터
		
		if (!seParam) {
			return true; // SAS 토큰이 없으면 만료된 것으로 간주
		}
		
		const expirationTime = new Date(seParam);
		const now = new Date();
		
		return now >= expirationTime;
	} catch (error) {
		console.error('SAS URL 만료 확인 실패:', sasUrl, error);
		return true; // 오류 시 만료된 것으로 간주
	}
};

/**
 * 범용 SAS URL 리프레시 함수 - 개별 URL 처리
 * @param {string} url - 확인할 URL
 * @param {string} containerName - 컨테이너 이름
 * @param {Function} updateCallback - URL 업데이트 콜백 함수 (oldUrl, newUrl) => Promise
 * @returns {Promise<string>} - 새로운 URL 또는 기존 URL
 */
const refreshUrlIfExpired = async (url, containerName, updateCallback) => {
	if (!url || !isSasUrlExpired(url)) {
		return url; // 만료되지 않았으면 기존 URL 반환
	}
	
	// 새 URL 생성
	const newUrl = await regenerateSasUrl(url, containerName);
	if (!newUrl) {
		console.warn(`SAS URL 재생성 실패: ${url}`);
		return url; // 실패 시 기존 URL 반환
	}
	
	// DB 업데이트 (콜백 함수 사용)
	if (updateCallback) {
		try {
			await updateCallback(url, newUrl);
			console.log(`SAS URL 재생성 완료: ${containerName}`);
		} catch (error) {
			console.error(`SAS URL DB 업데이트 실패: ${error.message}`);
			return url; // 실패 시 기존 URL 반환
		}
	}
	
	return newUrl;
};

module.exports = {
	uploadFile,
	uploadMultipleFiles,
	deleteFile,
	deleteMultipleFiles,
	extractBlobNameFromUrl,
	regenerateSasUrl,
	regenerateMultipleSasUrls,
	isSasUrlExpired,
	// 범용 SAS URL 리프레시
	refreshUrlIfExpired
}; 