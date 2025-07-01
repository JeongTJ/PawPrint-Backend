const { pool } = require('../config/psqlConfig');
const storageRepository = require('./storageRepository');

// 미디어 배열의 만료된 SAS URL을 재생성하는 헬퍼 함수
const refreshExpiredSasUrls = async (mediaArray) => {
	if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
		return mediaArray;
	}
	
	const expiredMedia = mediaArray.filter(media => 
		storageRepository.isSasUrlExpired(media.file_url)
	);
	
	if (expiredMedia.length === 0) {
		return mediaArray; // 만료된 URL이 없으면 그대로 반환
	}
	
	console.log(`${expiredMedia.length}개의 만료된 SAS URL 발견, 재생성 중...`);
	
	// 만료된 URL들을 재생성
	const regenerateResult = await storageRepository.regenerateMultipleSasUrls(
		expiredMedia.map(media => media.file_url)
	);
	
	// 성공적으로 재생성된 URL들을 DB에 업데이트
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		
		for (const {old: oldUrl, new: newUrl} of regenerateResult.success) {
			await client.query(
				'UPDATE media SET file_url = $1, updated_at = now() WHERE file_url = $2',
				[newUrl, oldUrl]
			);
		}
		
		await client.query('COMMIT');
		console.log(`${regenerateResult.success.length}개의 SAS URL 재생성 및 DB 업데이트 완료`);
		
		if (regenerateResult.failed.length > 0) {
			console.warn(`${regenerateResult.failed.length}개의 SAS URL 재생성 실패:`, regenerateResult.failed);
		}
		
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('SAS URL DB 업데이트 실패:', error);
	} finally {
		client.release();
	}
	
	// 업데이트된 미디어 배열 반환
	return mediaArray.map(media => {
		const updatedUrl = regenerateResult.success.find(result => result.old === media.file_url);
		return updatedUrl ? { ...media, file_url: updatedUrl.new } : media;
	});
};

// 모든 게시물을 미디어와 함께 찾기
const findAll = async () => {
	const { rows } = await pool.query(`
		SELECT 
			c.*,
			COALESCE(
				JSON_AGG(
					JSON_BUILD_OBJECT(
						'id', m.id,
						'file_url', m.file_url,
						'created_at', m.created_at,
						'updated_at', m.updated_at
					)
				) FILTER (WHERE m.id IS NOT NULL), 
				'[]'::json
			) as media
		FROM contents c
		LEFT JOIN media m ON c.id = m.content_id
		GROUP BY c.id
		ORDER BY c.id ASC
	`);
	
	// 각 게시물의 만료된 SAS URL 갱신
	for (const row of rows) {
		row.media = await refreshExpiredSasUrls(row.media);
	}
	
	return rows;
};

// 특정 게시물 타입으로 미디어와 함께 찾기 (qna, community)
const findByContentType = async (content_type) => {
	const { rows } = await pool.query(`
		SELECT 
			c.*,
			COALESCE(
				JSON_AGG(
					JSON_BUILD_OBJECT(
						'id', m.id,
						'file_url', m.file_url,
						'created_at', m.created_at,
						'updated_at', m.updated_at
					)
				) FILTER (WHERE m.id IS NOT NULL), 
				'[]'::json
			) as media
		FROM contents c
		LEFT JOIN media m ON c.id = m.content_id
		WHERE c.content_type = $1
		GROUP BY c.id
		ORDER BY c.id ASC
	`, [content_type]);
	
	// 각 게시물의 만료된 SAS URL 갱신
	for (const row of rows) {
		row.media = await refreshExpiredSasUrls(row.media);
	}
	
	return rows;
};

// 특정 회원의 게시물을 미디어와 함께 찾기
const findByMemberId = async (member_id) => {
	const { rows } = await pool.query(`
		SELECT 
			c.*,
			COALESCE(
				JSON_AGG(
					JSON_BUILD_OBJECT(
						'id', m.id,
						'file_url', m.file_url,
						'created_at', m.created_at,
						'updated_at', m.updated_at
					)
				) FILTER (WHERE m.id IS NOT NULL), 
				'[]'::json
			) as media
		FROM contents c
		LEFT JOIN media m ON c.id = m.content_id
		WHERE c.member_id = $1
		GROUP BY c.id
		ORDER BY c.id ASC
	`, [member_id]);
	
	// 각 게시물의 만료된 SAS URL 갱신
	for (const row of rows) {
		row.media = await refreshExpiredSasUrls(row.media);
	}
	
	return rows;
};

// 특정 게시물을 미디어와 함께 생성 (트랜잭션 사용)
const createWithMedia = async (contentData, mediaFiles = []) => {
	const client = await pool.connect();
	let uploadedFileUrls = [];
	
	try {
		// 1. 먼저 파일들을 Storage에 업로드
		if (mediaFiles && mediaFiles.length > 0) {
			uploadedFileUrls = await storageRepository.uploadMultipleFiles(mediaFiles);
		}
		
		// 2. DB 트랜잭션 시작
		await client.query('BEGIN');
		
		const { member_id, content_type, body } = contentData;
		
		// 콘텐츠 생성
		const contentResult = await client.query(
			'INSERT INTO contents (member_id, content_type, body) VALUES ($1, $2, $3) RETURNING *',
			[member_id, content_type, body]
		);
		
		const content = contentResult.rows[0];
		
		// 미디어 파일들 DB에 저장
		const mediaRecords = [];
		if (uploadedFileUrls.length > 0) {
			for (const url of uploadedFileUrls) {
				const mediaResult = await client.query(
					'INSERT INTO media (content_id, file_url) VALUES ($1, $2) RETURNING *',
					[content.id, url]
				);
				mediaRecords.push(mediaResult.rows[0]);
			}
		}
		
		await client.query('COMMIT');
		
		// 생성된 콘텐츠에 미디어 정보 포함하여 반환
		return {
			...content,
			media: mediaRecords
		};
		
	} catch (error) {
		await client.query('ROLLBACK');
		
		// 실패 시 업로드된 파일들을 Storage에서 삭제 (보상 트랜잭션)
		if (uploadedFileUrls.length > 0) {
			console.log('DB 트랜잭션 실패로 인한 파일 정리 시작...');
			const deleteResult = await storageRepository.deleteMultipleFiles(uploadedFileUrls);
			console.log('파일 정리 완료:', deleteResult);
		}
		
		throw error;
	} finally {
		client.release();
	}
};

// 기존 단순 게시물 생성 (하위 호환성을 위해 유지)
const create = async (contentData) => {
	return await createWithMedia(contentData, []);
};

// 특정 게시물을 미디어와 함께 ID로 찾기
const findById = async (id) => {
	const { rows } = await pool.query(`
		SELECT 
			c.*,
			COALESCE(
				JSON_AGG(
					JSON_BUILD_OBJECT(
						'id', m.id,
						'file_url', m.file_url,
						'created_at', m.created_at,
						'updated_at', m.updated_at
					)
				) FILTER (WHERE m.id IS NOT NULL), 
				'[]'::json
			) as media
		FROM contents c
		LEFT JOIN media m ON c.id = m.content_id
		WHERE c.id = $1
		GROUP BY c.id
	`, [id]);
	
	if (rows.length > 0) {
		// 만료된 SAS URL 갱신
		rows[0].media = await refreshExpiredSasUrls(rows[0].media);
	}
	
	return rows[0];
};

// 특정 게시물 정보를 미디어와 함께 업데이트 (Storage + DB 분산 트랜잭션)
const updateWithMedia = async (id, contentData, newMediaFiles = null) => {
	const client = await pool.connect();
	let uploadedFileUrls = [];
	let oldMediaUrls = [];
	
	try {
		// 1. 기존 미디어 정보 백업 (롤백용)
		const existingMediaResult = await client.query(
			'SELECT file_url FROM media WHERE content_id = $1',
			[id]
		);
		oldMediaUrls = existingMediaResult.rows.map(row => row.file_url);
		
		// 2. 새 파일들을 먼저 Storage에 업로드 (미디어 변경이 있는 경우)
		if (newMediaFiles !== null && newMediaFiles.length > 0) {
			uploadedFileUrls = await storageRepository.uploadMultipleFiles(newMediaFiles);
		}
		
		// 3. DB 트랜잭션 시작
		await client.query('BEGIN');
		
		const { body } = contentData;
		
		// 콘텐츠 업데이트
		const contentResult = await client.query(
			`UPDATE contents 
			SET 
			body = COALESCE($1, body), 
			updated_at = now() 
			WHERE id = $2 
			RETURNING *`,
			[body, id]
		);
		
		const content = contentResult.rows[0];
		
		// 미디어 업데이트 처리
		let mediaFiles = [];
		if (newMediaFiles !== null) {
			// 기존 미디어 DB에서 삭제
			await client.query('DELETE FROM media WHERE content_id = $1', [id]);
			
			// 새로운 미디어 DB에 추가
			if (uploadedFileUrls.length > 0) {
				for (const url of uploadedFileUrls) {
					const mediaResult = await client.query(
						'INSERT INTO media (content_id, file_url) VALUES ($1, $2) RETURNING *',
						[id, url]
					);
					mediaFiles.push(mediaResult.rows[0]);
				}
			}
		} else {
			// 미디어 변경이 없는 경우 기존 미디어 조회
			const mediaResult = await client.query(
				'SELECT * FROM media WHERE content_id = $1 ORDER BY id ASC',
				[id]
			);
			mediaFiles = mediaResult.rows;
		}
		
		// 4. DB 커밋
		await client.query('COMMIT');
		
		// 5. DB 성공 후 기존 파일들을 Storage에서 삭제
		if (newMediaFiles !== null && oldMediaUrls.length > 0) {
			console.log('기존 파일 삭제 시작...', oldMediaUrls);
			const deleteResult = await storageRepository.deleteMultipleFiles(oldMediaUrls);
			console.log('기존 파일 삭제 완료:', deleteResult);
			
			if (deleteResult.failed.length > 0) {
				console.warn('일부 파일 삭제 실패:', deleteResult.failed);
			}
		}
		
		return {
			...content,
			media: mediaFiles
		};
		
	} catch (error) {
		await client.query('ROLLBACK');
		
		// DB 실패 시 새로 업로드한 파일들을 Storage에서 삭제 (보상 트랜잭션)
		if (uploadedFileUrls.length > 0) {
			console.log('DB 트랜잭션 실패로 인한 신규 파일 정리 시작...', uploadedFileUrls);
			const deleteResult = await storageRepository.deleteMultipleFiles(uploadedFileUrls);
			console.log('신규 파일 정리 완료:', deleteResult);
		}
		
		throw error;
	} finally {
		client.release();
	}
};

// 기존 단순 게시물 업데이트 (하위 호환성을 위해 유지)
const update = async (id, contentData) => {
	return await updateWithMedia(id, contentData, null);
};

// 특정 게시물과 관련 미디어를 모두 삭제 (Storage + DB)
const deleteById = async (id, member_id) => {
	const client = await pool.connect();
	let deletedData = null;
	let mediaUrls = [];
	
	try {
		await client.query('BEGIN');
		
		// 삭제하기 전에 데이터 조회 (반환용 + Storage 파일 삭제용)
		const contentResult = await client.query(`
			SELECT 
				c.*,
				COALESCE(
					JSON_AGG(
						JSON_BUILD_OBJECT(
							'id', m.id,
							'file_url', m.file_url,
							'created_at', m.created_at,
							'updated_at', m.updated_at
						)
					) FILTER (WHERE m.id IS NOT NULL), 
					'[]'::json
				) as media
			FROM contents c
			LEFT JOIN media m ON c.id = m.content_id
			WHERE c.id = $1 AND c.member_id = $2
			GROUP BY c.id
		`, [id, member_id]);
		
		if (contentResult.rows.length === 0) {
			await client.query('ROLLBACK');
			return null;
		}
		
		deletedData = contentResult.rows[0];
		
		// Storage에서 삭제할 파일 URL들 추출
		if (deletedData.media && Array.isArray(deletedData.media)) {
			mediaUrls = deletedData.media.map(media => media.file_url);
		}
		
		// DB에서 미디어 및 콘텐츠 삭제 (외래키 제약조건으로 자동 삭제되지만 명시적으로 처리)
		await client.query('DELETE FROM media WHERE content_id = $1', [id]);
		await client.query('DELETE FROM contents WHERE id = $1 AND member_id = $2', [id, member_id]);
		
		await client.query('COMMIT');
		
		// DB 삭제 성공 후 Storage에서 파일들 삭제
		if (mediaUrls.length > 0) {
			console.log('관련 파일 삭제 시작...', mediaUrls);
			const deleteResult = await storageRepository.deleteMultipleFiles(mediaUrls);
			console.log('관련 파일 삭제 완료:', deleteResult);
			
			if (deleteResult.failed.length > 0) {
				console.warn('일부 파일 삭제 실패:', deleteResult.failed);
			}
		}
		
		return deletedData;
		
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

// 특정 콘텐츠의 미디어만 조회
const findMediaByContentId = async (content_id) => {
	const { rows } = await pool.query('SELECT * FROM media WHERE content_id = $1 ORDER BY id ASC', [content_id]);
	
	// 만료된 SAS URL 갱신
	return await refreshExpiredSasUrls(rows);
};

// 특정 미디어 삭제 (Storage + DB)
const deleteMediaById = async (media_id, content_id) => {
	const client = await pool.connect();
	
	try {
		await client.query('BEGIN');
		
		// 삭제하기 전에 파일 URL 조회
		const mediaResult = await client.query(
			'SELECT file_url FROM media WHERE id = $1 AND content_id = $2',
			[media_id, content_id]
		);
		
		if (mediaResult.rows.length === 0) {
			await client.query('ROLLBACK');
			return null;
		}
		
		const fileUrl = mediaResult.rows[0].file_url;
		
		// DB에서 미디어 삭제
		const deleteResult = await client.query(
			'DELETE FROM media WHERE id = $1 AND content_id = $2 RETURNING *',
			[media_id, content_id]
		);
		
		await client.query('COMMIT');
		
		// DB 삭제 성공 후 Storage에서 파일 삭제
		if (fileUrl) {
			console.log('미디어 파일 삭제 시작...', fileUrl);
			const storageDeleteSuccess = await storageRepository.deleteFile(fileUrl);
			if (!storageDeleteSuccess) {
				console.warn('Storage에서 파일 삭제 실패:', fileUrl);
			} else {
				console.log('미디어 파일 삭제 완료:', fileUrl);
			}
		}
		
		return deleteResult.rows[0];
		
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

module.exports = {
	findAll,
	findByContentType,
	findByMemberId,
	create,
	createWithMedia,
	findById,
	update,
	updateWithMedia,
	deleteById,
	findMediaByContentId,
	deleteMediaById,
};