const express = require('express');
const router = express.Router();
const contentsServices = require('../services/contentsServices');
const { authMiddleware } = require('../middlewares/auth');

/**
 * @openapi
 * /api/comments/{commentId}:
 *   patch:
 *     summary: 댓글 수정
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 댓글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               body:
 *                 type: string
 *                 description: 수정할 댓글 내용
 *     responses:
 *       200:
 *         description: 수정된 댓글
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       403:
 *         description: 권한 없음 (본인 댓글이 아님)
 *       404:
 *         description: 댓글을 찾을 수 없음
 *   delete:
 *     summary: 댓글 삭제
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 댓글 ID
 *     responses:
 *       200:
 *         description: 댓글 삭제 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: 권한 없음 (본인 댓글이 아님)
 *       404:
 *         description: 댓글을 찾을 수 없음
 */

// PATCH /api/comments/:commentId - 댓글 수정
router.patch('/:commentId', authMiddleware, async (req, res) => {
	try {
		const { commentId } = req.params;
		const userId = req.user.id;
		const { body } = req.body;
		
		const updatedComment = await contentsServices.updateComment(commentId, userId, body);
		res.json({
			code: 200,
			message: "댓글이 성공적으로 수정되었습니다.",
			result: updatedComment
		});
	} catch (error) {
		console.error('댓글 수정 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

// DELETE /api/comments/:commentId - 댓글 삭제
router.delete('/:commentId', authMiddleware, async (req, res) => {
	try {
		const { commentId } = req.params;
		const userId = req.user.id;
		
		const result = await contentsServices.deleteComment(commentId, userId);
		res.json({
			code: 200,
			message: "댓글이 성공적으로 삭제되었습니다.",
			result: result
		});
	} catch (error) {
		console.error('댓글 삭제 오류:', error);
		const statusCode = error.statusCode || 500;
		res.status(statusCode).json({
			code: statusCode >= 500 ? 500 : (statusCode >= 400 ? 400 : 500),
			message: error.message,
			result: null
		});
	}
});

module.exports = router;