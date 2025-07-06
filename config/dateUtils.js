// 한국 시간 기준 날짜 유틸리티 함수들
const moment = require("moment-timezone");

/**
 * 한국 시간 기준으로 오늘 날짜 (00:00:00)를 반환
 * @returns {Date} UTC 기준으로 한국 시간 오늘 날짜의 0시 0분 0초
 */
const getKoreaTodayStart = () => {
	// 한국 시간 기준 오늘 날짜를 문자열로 가져와서 UTC Date 객체로 생성
	const koreaToday = moment().tz("Asia/Seoul").format('YYYY-MM-DD');
	return new Date(koreaToday + 'T00:00:00.000Z');
};

/**
 * 한국 시간 기준으로 현재 시간을 반환
 * @returns {Date} 한국 시간 기준 현재 시간
 */
const getKoreaNow = () => {
	return moment().tz("Asia/Seoul").toDate();
};

/**
 * 한국 시간 기준으로 특정 날짜의 시작 시간 (00:00:00)을 반환
 * @param {Date} date 기준 날짜
 * @returns {Date} UTC 기준으로 해당 날짜의 0시 0분 0초
 */
const getKoreaDayStart = (date) => {
	const koreaDate = moment(date).tz("Asia/Seoul").format('YYYY-MM-DD');
	return new Date(koreaDate + 'T00:00:00.000Z');
};

/**
 * 한국 시간 기준으로 특정 날짜의 종료 시간 (23:59:59.999)을 반환
 * @param {Date} date 기준 날짜
 * @returns {Date} 한국 시간 기준 해당 날짜의 23시 59분 59초 999밀리초
 */
const getKoreaDayEnd = (date) => {
	return moment(date).tz("Asia/Seoul").endOf('day').toDate();
};

/**
 * 한국 시간 기준으로 날짜 포맷팅
 * @param {Date} date 포맷팅할 날짜 (null이면 현재 시간)`
 * @param {string} format 포맷 ('YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss' 등)
 * @returns {string} 포맷팅된 날짜 문자열
 */
const formatKoreaDate = (date, format = 'YYYY-MM-DD') => {
	const koreaTime = date ? moment(date).tz("Asia/Seoul") : moment().tz("Asia/Seoul");
	
	return koreaTime.format(format);
};

/**
 * 한국 시간 기준으로 현재 시간을 문자열로 반환
 * @param {string} format 포맷 ('YYYY-MM-DD HH:mm:ss' 기본값)
 * @returns {string} 포맷팅된 한국 시간 문자열
 */
const getKoreaTimeString = (format = 'YYYY-MM-DD HH:mm:ss') => {
	return moment().tz("Asia/Seoul").format(format);
};

/**
 * 두 날짜가 한국 시간 기준으로 같은 날인지 확인
 * @param {Date} date1 첫 번째 날짜
 * @param {Date} date2 두 번째 날짜
 * @returns {boolean} 같은 날이면 true
 */
const isSameDayInKorea = (date1, date2) => {
	const korea1 = moment(date1).tz("Asia/Seoul");
	const korea2 = moment(date2).tz("Asia/Seoul");
	
	return korea1.format('YYYY-MM-DD') === korea2.format('YYYY-MM-DD');
};

/**
 * 날짜가 한국 시간 기준으로 오늘인지 확인
 * @param {Date} date 확인할 날짜
 * @returns {boolean} 오늘이면 true
 */
const isToday = (date) => {
	return isSameDayInKorea(date, new Date());
};

/**
 * 날짜 문자열을 UTC 기준 Date 객체로 변환 (날짜 유지)
 * @param {string} dateString YYYY-MM-DD 형식의 날짜 문자열
 * @returns {Date} UTC 기준 해당 날짜의 0시 0분 0초
 */
const getUTCDateFromString = (dateString) => {
	return new Date(dateString + 'T00:00:00.000Z');
};

module.exports = {
	getKoreaTodayStart,
	getKoreaNow,
	getKoreaDayStart,
	getKoreaDayEnd,
	formatKoreaDate,
	getKoreaTimeString,
	isSameDayInKorea,
	isToday,
	getUTCDateFromString
}; 