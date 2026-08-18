/**
 * 공통 금액 포맷팅 및 유틸리티 함수
 */

// 숫자 -> 1,234,567 원 포맷팅
const formatWon = (num) => Math.max(0, Math.round(num)).toLocaleString('ko-KR') + ' 원';

// 숫자 -> 한글 금액 표기 (예: 25억 4,000만원)
function formatKoreanText(num) {
    if (num <= 0) return '0원';
    const eok = Math.floor(num / 100000000);
    const remainderAfterEok = num % 100000000;
    const man = Math.floor(remainderAfterEok / 10000);
    const won = Math.round(remainderAfterEok % 10000);

    let result = '';
    if (eok > 0) result += `${eok}억 `;
    if (man > 0) result += `${man.toLocaleString()}만 `;
    if (won > 0 && eok === 0) result += `${won.toLocaleString()}`;
    
    result = result.trim();
    if (result.endsWith('억') || result.endsWith('만')) {
        return result + '원';
    }
    return result ? result + '원' : '0원';
}
