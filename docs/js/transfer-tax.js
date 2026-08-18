/**
 * 양도소득세 (2026년, 2027년, 2028년, 2029년 이후) 정밀 계산 로직
 */

function toggleGainsResidenceRow() {
    const houseType = document.getElementById('gainsHouseType');
    const residenceRow = document.getElementById('gainsResidenceRow');
    if (!houseType || !residenceRow) return;
    if (houseType.value === '1house') {
        residenceRow.style.display = 'block';
    } else {
        residenceRow.style.display = 'none';
    }
}

function getHoldingAndResidenceYears(targetYear, acquireYear, acquireMonth, resType) {
    if (acquireYear <= 2016) {
        const holdY = 10;
        const resiY = (resType === 'full') ? 10 : Number(resType);
        return { holdY, resiY };
    }
    // targetYear 시점의 보유 만 연수
    let holdY = Math.max(0, targetYear - acquireYear - (acquireMonth > 11 ? 1 : 0));
    let resiY = (resType === 'full') ? holdY : Number(resType);
    return { holdY, resiY };
}

function getLongTermDeductionInfo(isOneHouse, holdingYears, residenceYears, era) {
    // era: '2026', '2027', '2028', '2029'
    if (!isOneHouse) {
        // 일반 과세 (3년 미만 0%, 3년 이상 연 2%씩 최대 30%)
        let rate = 0;
        if (holdingYears >= 15) rate = 0.30;
        else if (holdingYears >= 3) rate = holdingYears * 0.02;
        return { rate, holdRate: rate, resiRate: 0, cap: Infinity, desc: `일반 장특공 (연 2%, 최대 30%): ${(rate*100).toFixed(0)}%` };
    }

    // 1세대 1주택이나 거주기간 2년 미만인 경우 일반 장특공 적용
    if (residenceYears < 2) {
        let rate = 0;
        if (holdingYears >= 15) rate = 0.30;
        else if (holdingYears >= 3) rate = holdingYears * 0.02;
        return { rate, holdRate: rate, resiRate: 0, cap: Infinity, desc: `거주 2년 미만 일반 공제 (연 2%, 최대 30%): ${(rate*100).toFixed(0)}%` };
    }

    // 1세대 1주택 (거주 2년 이상)
    let holdRate = 0;
    let resiRate = 0;
    let cap = Infinity;
    let desc = "";

    if (era === '2026' || era === '2027') {
        // ~2027년: 보유 연 4% (3년 12% ~ 10년 40%), 거주 연 4% (3년 12% ~ 10년 40%), 최대 80% (한도 없음)
        holdRate = holdingYears >= 10 ? 0.40 : (holdingYears >= 3 ? holdingYears * 0.04 : 0);
        resiRate = residenceYears >= 10 ? 0.40 : (residenceYears >= 3 ? residenceYears * 0.04 : 0);
        cap = Infinity;
        desc = `보유 ${(holdRate*100).toFixed(0)}% (${holdingYears}년) + 거주 ${(resiRate*100).toFixed(0)}% (${residenceYears}년) = 합산 ${((holdRate+resiRate)*100).toFixed(0)}% (한도 없음)`;
    } else if (era === '2028') {
        // 2028년: 보유 연 2% (3년 6% ~ 10년 20%), 거주 연 6% (3년 18% ~ 10년 60%), 최대 80%, 1인당 한도 10억 (공동명의 합산 20억)
        holdRate = holdingYears >= 10 ? 0.20 : (holdingYears >= 3 ? holdingYears * 0.02 : 0);
        resiRate = residenceYears >= 10 ? 0.60 : (residenceYears >= 3 ? residenceYears * 0.06 : 0);
        cap = 1000000000; // 1인당 10억
        desc = `보유 ${(holdRate*100).toFixed(0)}% (${holdingYears}년) + 거주 ${(resiRate*100).toFixed(0)}% (${residenceYears}년) = 합산 ${((holdRate+resiRate)*100).toFixed(0)}% (1인당 한도 10억)`;
    } else { // 2029
        // 2029년 이후: 보유공제 폐지 (0%), 거주 연 8% (3년 24% ~ 10년 80%), 최대 80%, 1인당 한도 5억 (공동명의 합산 10억)
        holdRate = 0;
        resiRate = residenceYears >= 10 ? 0.80 : (residenceYears >= 3 ? residenceYears * 0.08 : 0);
        cap = 500000000; // 1인당 5억
        desc = `거주 ${(resiRate*100).toFixed(0)}% (${residenceYears}년) = 합산 ${(resiRate*100).toFixed(0)}% (보유공제 폐지, 1인당 한도 5억)`;
    }

    let totalRate = Math.min(0.80, holdRate + resiRate);
    return { rate: totalRate, holdRate, resiRate, cap, desc };
}

function calculateTransferTaxDetailsForEra(sellPrice, buyPrice, expense, isOneHouse, isJoint, holdingYears, residenceYears, era) {
    sellPrice = Math.max(0, Number(sellPrice) || 0);
    buyPrice = Math.max(0, Number(buyPrice) || 0);
    expense = Math.max(0, Number(expense) || 0);

    // 1. 총 양도차익 = 양도가액 - 취득가액 - 필요경비
    let capitalGain = Math.max(0, sellPrice - buyPrice - expense);

    // 2. 1세대 1주택 과세 대상 양도차익 (12억 초과분 안분 비율 적용)
    let taxableGain = 0;
    let nonTaxableRatio = 0;
    let taxableRatio = 1;

    if (isOneHouse) {
        if (sellPrice <= 1200000000) {
            taxableGain = 0;
            taxableRatio = 0;
            nonTaxableRatio = 1;
        } else {
            taxableRatio = (sellPrice - 1200000000) / sellPrice;
            nonTaxableRatio = 1200000000 / sellPrice;
            taxableGain = Math.round(capitalGain * taxableRatio);
        }
    } else {
        taxableGain = capitalGain;
        taxableRatio = 1;
    }

    // 3. 인별 과세 대상 양도차익 (명의 분할)
    const ownershipRatio = isJoint ? 0.5 : 1.0;
    let perPersonTaxableGain = Math.round(taxableGain * ownershipRatio);

    // 4. 연도별 장기보유특별공제 및 과세표준
    const deductionInfo = getLongTermDeductionInfo(isOneHouse, holdingYears, residenceYears, era);
    let rawDeduction = Math.round(perPersonTaxableGain * deductionInfo.rate);
    let deductionAmount = Math.min(rawDeduction, deductionInfo.cap);

    // 양도소득금액 = 인별 과세 대상 양도차익 - 공제액
    let incomeAmount = Math.max(0, perPersonTaxableGain - deductionAmount);

    // 과세표준 = 양도소득금액 - 기본공제 (250만원)
    const basicDeduction = 2500000;
    let taxBase = Math.max(0, incomeAmount - basicDeduction);

    // 5. 기본세율 (6%~45%) 및 누진공제 산출
    let rate = 0;
    let progressiveDeduction = 0;
    let tierInfo = "";
    let formulaText = "";

    if (taxBase <= 0) {
        tierInfo = "과세표준 없음";
        formulaText = "0원";
    } else if (taxBase <= 14000000) {
        rate = 0.06; progressiveDeduction = 0;
        tierInfo = "1,400만원 이하 (세율 6%)";
        formulaText = `(과세표준 ${formatKoreanText(taxBase)} × 6%)`;
    } else if (taxBase <= 50000000) {
        rate = 0.15; progressiveDeduction = 1260000;
        tierInfo = "1,400만 ~ 5,000만원 이하 (세율 15%, 누진공제 126만원)";
        formulaText = `(과세표준 ${formatKoreanText(taxBase)} × 15%) - 126만원`;
    } else if (taxBase <= 88000000) {
        rate = 0.24; progressiveDeduction = 5760000;
        tierInfo = "5,000만 ~ 8,800만원 이하 (세율 24%, 누진공제 576만원)";
        formulaText = `(과세표준 ${formatKoreanText(taxBase)} × 24%) - 576만원`;
    } else if (taxBase <= 150000000) {
        rate = 0.35; progressiveDeduction = 14900000;
        tierInfo = "8,800만 ~ 1.5억원 이하 (세율 35%, 누진공제 1,490만원)";
        formulaText = `(과세표준 ${formatKoreanText(taxBase)} × 35%) - 1,490만원`;
    } else if (taxBase <= 300000000) {
        rate = 0.38; progressiveDeduction = 19400000;
        tierInfo = "1.5억 ~ 3억원 이하 (세율 38%, 누진공제 1,940만원)";
        formulaText = `(과세표준 ${formatKoreanText(taxBase)} × 38%) - 1,940만원`;
    } else if (taxBase <= 500000000) {
        rate = 0.40; progressiveDeduction = 25400000;
        tierInfo = "3억 ~ 5억원 이하 (세율 40%, 누진공제 2,540만원)";
        formulaText = `(과세표준 ${formatKoreanText(taxBase)} × 40%) - 2,540만원`;
    } else if (taxBase <= 1000000000) {
        rate = 0.42; progressiveDeduction = 35400000;
        tierInfo = "5억 ~ 10억원 이하 (세율 42%, 누진공제 3,540만원)";
        formulaText = `(과세표준 ${formatKoreanText(taxBase)} × 42%) - 3,540만원`;
    } else {
        rate = 0.45; progressiveDeduction = 65400000;
        tierInfo = "10억원 초과 (세율 45%, 누진공제 6,540만원)";
        formulaText = `(과세표준 ${formatKoreanText(taxBase)} × 45%) - 6,540만원`;
    }

    // 1인당 산출세액 (본세)
    let perPersonMainTax = Math.max(0, Math.round((taxBase * rate) - progressiveDeduction));

    // 1인당 지방소득세 (10%)
    let perPersonLocalTax = Math.round(perPersonMainTax * 0.1);

    // 최종 납부세액 (공동명의 2인 합산 vs 단독 1인)
    let peopleCount = isJoint ? 2 : 1;
    let totalTax = (perPersonMainTax + perPersonLocalTax) * peopleCount;

    return {
        sellPrice,
        buyPrice,
        expense,
        capitalGain,
        isOneHouse,
        taxableGain,
        taxableRatio,
        isJoint,
        ownershipRatio,
        perPersonTaxableGain,
        deductionInfo,
        deductionAmount,
        incomeAmount,
        basicDeduction,
        taxBase,
        rate,
        progressiveDeduction,
        tierInfo,
        formulaText,
        perPersonMainTax,
        perPersonLocalTax,
        peopleCount,
        totalTax
    };
}

function setGainsSellPrice(value) {
    const input = document.getElementById('sellPrice');
    if (input) {
        input.value = value;
        updateGainsPresetActive(value);
        updateGainsTaxUI();
    }
}

function updateGainsPresetActive(value) {
    const buttons = document.querySelectorAll('#gainsCalcSection .preset-btn');
    const numVal = parseFloat(value);
    buttons.forEach(btn => {
        const match = btn.getAttribute('onclick').match(/[\d.]+/);
        if (match) {
            const btnVal = parseFloat(match[0]);
            if (!isNaN(numVal) && Math.abs(btnVal - numVal) < 0.001) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

function updateGainsCardUI(prefix, res) {
    const totalEl = document.getElementById(`${prefix}TotalTax`);
    if (!totalEl) return;

    // 요약 정보
    document.getElementById(`${prefix}CapitalGain`).innerText = formatWon(res.capitalGain);
    document.getElementById(`${prefix}TaxableGain`).innerText = formatWon(res.taxableGain);
    document.getElementById(`${prefix}PerPersonGain`).innerText = formatWon(res.perPersonTaxableGain);
    document.getElementById(`${prefix}Deduction`).innerText = formatWon(res.deductionAmount);
    document.getElementById(`${prefix}TaxBase`).innerText = formatWon(res.taxBase);
    document.getElementById(`${prefix}MainTax`).innerText = formatWon(res.perPersonMainTax);
    totalEl.innerText = formatWon(res.totalTax);

    // 상세 5단계 산출과정
    // Step 1
    document.getElementById(`${prefix}S1Sell`).innerText = formatWon(res.sellPrice);
    document.getElementById(`${prefix}S1Buy`).innerText = formatWon(res.buyPrice);
    document.getElementById(`${prefix}S1Exp`).innerText = formatWon(res.expense);
    document.getElementById(`${prefix}S1Gain`).innerText = formatWon(res.capitalGain) + ` (${formatKoreanText(res.capitalGain)})`;

    // Step 2
    document.getElementById(`${prefix}S2Sell`).innerText = formatWon(res.capitalGain);
    document.getElementById(`${prefix}S2Ratio`).innerText = res.isOneHouse 
        ? (res.sellPrice > 1200000000 ? `(양도가액 ${formatKoreanText(res.sellPrice)} - 12억) ÷ ${formatKoreanText(res.sellPrice)} = ${(res.taxableRatio * 100).toFixed(1)}%` : "12억 이하 전액 비과세 0%") 
        : "일반 과세 100%";
    document.getElementById(`${prefix}S2Taxable`).innerText = formatWon(res.taxableGain) + ` (${formatKoreanText(res.taxableGain)})`;

    // Step 3
    document.getElementById(`${prefix}S3Ratio`).innerText = res.isJoint ? "50% (부부 공동명의)" : "100% (단독명의)";
    document.getElementById(`${prefix}S3PerPerson`).innerText = formatWon(res.perPersonTaxableGain) + ` (${formatKoreanText(res.perPersonTaxableGain)})`;

    // Step 4
    document.getElementById(`${prefix}S4DeductionDesc`).innerText = res.deductionInfo.desc;
    document.getElementById(`${prefix}S4Deduction`).innerText = formatWon(res.deductionAmount);
    document.getElementById(`${prefix}S4TaxBase`).innerText = formatWon(res.taxBase) + ` (${formatKoreanText(res.taxBase)})`;

    // Step 5
    document.getElementById(`${prefix}S5Tier`).innerText = res.tierInfo;
    document.getElementById(`${prefix}S5Formula`).innerText = res.formulaText;
    document.getElementById(`${prefix}S5Main`).innerText = formatWon(res.perPersonMainTax);
    document.getElementById(`${prefix}S5Local`).innerText = formatWon(res.perPersonLocalTax);
    document.getElementById(`${prefix}S5Final`).innerText = formatWon(res.totalTax) + ` (${formatKoreanText(res.totalTax)})` + (res.isJoint ? " [2명 합산]" : "");
}

function updateGainsTaxUI() {
    const sellPriceInput = document.getElementById('sellPrice');
    if (!sellPriceInput) return;

    const sellPriceEok = parseFloat(sellPriceInput.value) || 0;
    const buyPriceEok = parseFloat(document.getElementById('buyPrice').value) || 0;
    const expenseMan = parseFloat(document.getElementById('expense').value) || 0;

    // 억 단위 -> 원 단위 환산 (1억 = 100,000,000)
    const sellPrice = Math.round(sellPriceEok * 100000000);
    const buyPrice = Math.round(buyPriceEok * 100000000);
    // 만원 단위 -> 원 단위 환산 (1만 = 10,000)
    const expense = Math.round(expenseMan * 10000);
    
    const houseType = document.getElementById('gainsHouseType').value;
    const isOneHouse = (houseType === '1house');

    const ownershipType = document.getElementById('gainsOwnershipType').value;
    const isJoint = (ownershipType === 'joint');

    const acquireYear = Number(document.getElementById('acquireYear').value);
    const acquireMonth = Number(document.getElementById('acquireMonth').value);
    const resType = document.getElementById('gainsResidenceType').value;

    // 실시간 입력금액 텍스트 표시
    document.getElementById('sellPriceDisplay').innerHTML = `${sellPrice.toLocaleString('ko-KR')} 원 <span class="readable">(${formatKoreanText(sellPrice)})</span>`;
    document.getElementById('buyPriceDisplay').innerHTML = `${buyPrice.toLocaleString('ko-KR')} 원 <span class="readable">(${formatKoreanText(buyPrice)})</span>`;
    document.getElementById('expenseDisplay').innerHTML = `${expense.toLocaleString('ko-KR')} 원 <span class="readable">(${formatKoreanText(expense)})</span>`;

    updateGainsPresetActive(sellPriceEok);
    toggleGainsResidenceRow();

    // 연도별(2026, 2027, 2028, 2029) 보유/거주 기간 산정
    const y26 = getHoldingAndResidenceYears(2026, acquireYear, acquireMonth, resType);
    const y27 = getHoldingAndResidenceYears(2027, acquireYear, acquireMonth, resType);
    const y28 = getHoldingAndResidenceYears(2028, acquireYear, acquireMonth, resType);
    const y29 = getHoldingAndResidenceYears(2029, acquireYear, acquireMonth, resType);

    // 연도별 계산실행 (2026년, 2027년, 2028년, 2029년 이후)
    const res26 = calculateTransferTaxDetailsForEra(sellPrice, buyPrice, expense, isOneHouse, isJoint, y26.holdY, y26.resiY, '2026');
    const res27 = calculateTransferTaxDetailsForEra(sellPrice, buyPrice, expense, isOneHouse, isJoint, y27.holdY, y27.resiY, '2027');
    const res28 = calculateTransferTaxDetailsForEra(sellPrice, buyPrice, expense, isOneHouse, isJoint, y28.holdY, y28.resiY, '2028');
    const res29 = calculateTransferTaxDetailsForEra(sellPrice, buyPrice, expense, isOneHouse, isJoint, y29.holdY, y29.resiY, '2029');

    updateGainsCardUI('gains26', res26);
    updateGainsCardUI('gains27', res27);
    updateGainsCardUI('gains28', res28);
    updateGainsCardUI('gains29', res29);
}

// 초기화
window.addEventListener('DOMContentLoaded', () => {
    updateGainsTaxUI();
});
