const { blobServiceClient, sharedKeyCredential } = require('../config/azureStorage');
const { v4: uuidv4 } = require('uuid');
const { BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');
const { logger } = require('../config/logger');

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
 * 스트림을 Azure Blob Storage에 업로드하고 SAS URL과 blob 이름을 반환합니다.
 * @param {ReadableStream} stream - 업로드할 파일 스트림
 * @param {string} blobName - 저장될 파일의 이름 (확장자 포함)
 * @param {string} mimetype - 파일의 MIME 타입 (e.g., 'video/mp4')
 * @param {string} containerName - 컨테이너 이름
 * @param {number} expirationHours - SAS 토큰 만료 시간 (시간 단위)
 * @returns {Promise<{url: string, blobName: string}>} - 업로드된 파일의 SAS URL과 고유 blob 이름
 */
const uploadStream = async (stream, blobName, mimetype, containerName, expirationHours = 24) => {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    const uniqueBlobName = `${uuidv4()}-${blobName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);

    // 스트림 업로드
    await blockBlobClient.uploadStream(stream, undefined, undefined, {
        blobHTTPHeaders: { blobContentType: mimetype }
    });

    // --- SAS 토큰 생성 로직 ---
    const sasOptions = {
        containerName: containerName,
        blobName: uniqueBlobName,
        permissions: BlobSASPermissions.parse("r"), // 읽기 전용
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + expirationHours * 60 * 60 * 1000),
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    
    return {
        url: `${blockBlobClient.url}?${sasToken}`,
        blobName: uniqueBlobName
    };
};

/**
 * 임시 저장소의 blob을 영구 저장소로 복사(이동)하고 새 SAS URL을 반환합니다.
 * @param {string} blobName - 이동할 blob의 이름 (videoId)
 * @param {string} tempContainerName - 임시 컨테이너 이름
 * @param {string} permanentContainerName - 영구 컨테이너 이름
 * @returns {Promise<string>} - 영구 저장소에 저장된 파일의 새 SAS URL
 */
const moveBlobToPermanentStorage = async (
    blobName, 
    tempContainerName = 'temp-videos', 
    permanentContainerName = 'slideshow-videos'
) => {
    const tempContainerClient = blobServiceClient.getContainerClient(tempContainerName);
    const permanentContainerClient = blobServiceClient.getContainerClient(permanentContainerName);
    await permanentContainerClient.createIfNotExists();

    const sourceBlobClient = tempContainerClient.getBlobClient(blobName);
    const destBlobClient = permanentContainerClient.getBlobClient(blobName); // 동일한 이름 사용

    // 1. 소스 blob이 존재하는지 확인
    const exists = await sourceBlobClient.exists();
    if (!exists) {
        throw new Error(`임시 비디오(ID: ${blobName})를 찾을 수 없습니다. 만료되었을 수 있습니다.`);
    }

    // 2. 영구 컨테이너로 복사 시작
    const copyPoller = await destBlobClient.beginCopyFromURL(sourceBlobClient.url);
    await copyPoller.pollUntilDone();
    logger.info(`Blob 복사 완료: ${blobName} from ${tempContainerName} to ${permanentContainerName}`);

    // 3. 원본 임시 blob 삭제
    await sourceBlobClient.delete();
    logger.info(`원본 임시 Blob 삭제 완료: ${blobName} in ${tempContainerName}`);

    // 4. 영구 저장된 blob에 대한 새 SAS 토큰 생성
    const sasOptions = {
        containerName: permanentContainerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse("r"),
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 365 * 24 * 60 * 60 * 1000), // 1년짜리 긴 만료시간
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    return `${destBlobClient.url}?${sasToken}`;
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
 * URL에서 컨테이너와 blob 이름을 추출하고 디코딩하는 유틸리티 함수
 * @param {string} fileUrl - 전체 파일 URL
 * @returns {{containerName: string|null, blobName: string|null}}
 */
const extractContainerAndBlobName = (fileUrl) => {
	try {
		const url = new URL(fileUrl);
		const pathParts = url.pathname.split('/').filter(p => p); // 빈 문자열 제거
		if (pathParts.length < 2) return { containerName: null, blobName: null };

		const containerName = pathParts[0];
		const blobName = decodeURIComponent(pathParts.slice(1).join('/'));
		return { containerName, blobName };
	} catch (error) {
		logger.error('URL 파싱 오류:', { url: fileUrl, error: error.message });
		return { containerName: null, blobName: null };
	}
};

/**
 * Azure Blob Storage에서 파일을 삭제합니다. (컨테이너 자동 감지)
 * @param {string} fileUrl - 삭제할 파일의 URL
 * @returns {Promise<boolean>} - 삭제 성공 여부
 */
const deleteFile = async (fileUrl) => {
	try {
		const { containerName, blobName } = extractContainerAndBlobName(fileUrl);
		if (!containerName || !blobName) {
			throw new Error('유효하지 않은 파일 URL에서 컨테이너와 blob 이름을 추출할 수 없습니다.');
		}

		const containerClient = blobServiceClient.getContainerClient(containerName);
		const blockBlobClient = containerClient.getBlockBlobClient(blobName);
		
		const exists = await blockBlobClient.exists();
		if (!exists) {
			logger.warn('삭제하려는 파일이 존재하지 않습니다:', fileUrl);
			return true;
		}

		await blockBlobClient.delete();
		logger.info('파일 삭제 성공:', fileUrl);
		return true;
		
	} catch (error) {
		logger.error('파일 삭제 실패:', { url: fileUrl, error: error.message });
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
 * 기존 blob에 대해 새로운 SAS URL을 생성합니다. (컨테이너 자동 감지)
 * @param {string} fileUrl - 기존 파일 URL
 * @param {number} expirationHours - SAS 토큰 만료 시간 (시간 단위, 기본값: 24시간)
 * @returns {Promise<string|null>} - 새로운 SAS URL 또는 null (실패 시)
 */
const regenerateSasUrl = async (fileUrl, expirationHours = 24) => {
	try {
		const { containerName, blobName } = extractContainerAndBlobName(fileUrl);
		if (!containerName || !blobName) {
			throw new Error('유효하지 않은 파일 URL에서 컨테이너와 blob 이름을 추출할 수 없습니다.');
		}

		const containerClient = blobServiceClient.getContainerClient(containerName);
		const blockBlobClient = containerClient.getBlockBlobClient(blobName);
		
		const exists = await blockBlobClient.exists();
		if (!exists) {
			logger.error('SAS URL을 재생성하려는 파일이 존재하지 않습니다:', fileUrl);
			return null;
		}

		const sasOptions = {
			containerName,
			blobName,
			permissions: BlobSASPermissions.parse("r"),
			startsOn: new Date(new Date().valueOf() - 5 * 60 * 1000), // 시차 고려해 5분 전부터 유효
			expiresOn: new Date(new Date().valueOf() + expirationHours * 60 * 60 * 1000),
		};

		const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
		return `${blockBlobClient.url}?${sasToken}`;
		
	} catch (error) {
		logger.error('SAS URL 재생성 실패:', { url: fileUrl, error: error.message });
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
 * SAS URL이 만료되었는지 확인합니다. (3분 버퍼 적용)
 * @param {string} sasUrl - 확인할 SAS URL 
 * @returns {boolean} - 만료 여부 (true: 만료됨, false: 유효함)
 */
const isSasUrlExpired = (sasUrl) => {
	try {
		const url = new URL(sasUrl);
		const seParam = url.searchParams.get('se');
		if (!seParam) return true;
		
		const expirationTime = new Date(seParam).getTime();
        // 현재 시간보다 3분 전에 만료된다고 간주하여 미리 갱신
		const buffer = 3 * 60 * 1000; 
		const now = new Date().getTime();
		
		return now >= expirationTime - buffer;
	} catch (error) {
		logger.error('SAS URL 만료 확인 실패:', { url: sasUrl, error: error.message });
		return true;
	}
};

/**
 * 범용 SAS URL 리프레시 함수 - 개별 URL 처리
 * @param {string} url - 확인할 URL
 * @param {string} containerName - 컨테이너 이름
 * @param {Function} updateCallback - URL 업데이트 콜백 함수 (oldUrl, newUrl) => Promise
 * @returns {Promise<string>} - 새로운 URL 또는 기존 URL
 */
const refreshUrlIfExpired = async (url, updateCallback) => {
	if (!url || !isSasUrlExpired(url)) {
		return url; // 만료되지 않았으면 기존 URL 반환
	}
	
	// 새 URL 생성
	const newUrl = await regenerateSasUrl(url);
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

/**
 * blob을 복사하고 새 SAS URL을 반환합니다.
 * @param {string} sourceUrl - 복사할 원본 파일의 전체 URL
 * @param {string} [destContainerName] - (선택) 복사될 컨테이너 이름. 지정하지 않으면 원본과 동일한 컨테이너 사용.
 * @returns {Promise<string>} - 복사된 새 파일의 SAS URL
 */
async function copyBlob(sourceUrl, destContainerName) {
    const { containerName: sourceContainerName, blobName: sourceBlobName } = extractContainerAndBlobName(sourceUrl);

    if (!sourceContainerName || !sourceBlobName) {
        throw new Error(`원본 URL에서 Blob 정보를 추출할 수 없습니다: ${sourceUrl}`);
    }

    const targetContainerName = destContainerName || sourceContainerName;

    const sourceContainerClient = blobServiceClient.getContainerClient(sourceContainerName);
    const destContainerClient = blobServiceClient.getContainerClient(targetContainerName);
    await destContainerClient.createIfNotExists();

    const sourceBlobClient = sourceContainerClient.getBlobClient(sourceBlobName);
    
    // 원본 파일의 확장자를 유지하면서 새 이름 생성
    const extension = sourceBlobName.includes('.') ? sourceBlobName.substring(sourceBlobName.lastIndexOf('.')) : '';
    const newBlobName = `${uuidv4()}${extension}`;
    const destBlobClient = destContainerClient.getBlobClient(newBlobName);

    // 복사 작업 시작
    const copyPoller = await destBlobClient.beginCopyFromURL(sourceBlobClient.url);
    await copyPoller.pollUntilDone();
    logger.info(`Blob 복사 완료: '${sourceBlobName}' -> '${newBlobName}' in container '${targetContainerName}'`);

    // 복사된 새 Blob에 대한 SAS 토큰 생성 (기본 24시간 유효)
    const sasOptions = {
        containerName: targetContainerName,
        blobName: newBlobName,
        permissions: BlobSASPermissions.parse("r"),
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 24 * 60 * 60 * 1000), // 24시간
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    return `${destBlobClient.url}?${sasToken}`;
}

module.exports = {
	uploadFile,
	deleteFile,
	deleteMultipleFiles,
	uploadMultipleFiles,
	regenerateSasUrl,
    regenerateMultipleSasUrls,
    isSasUrlExpired,
    refreshUrlIfExpired,
    extractBlobNameFromUrl,
    uploadStream,
    moveBlobToPermanentStorage,
    copyBlob, // 추가
}; 