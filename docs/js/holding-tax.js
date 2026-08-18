/**
 * 부동산 보유세 (재산세 및 종합부동산세) 계산 로직
 */

const TAX_CONFIG = {
    property: {
        baseRate: 0.45,       // 공정시가비율 45%
        taxRate: 0.004,       // 본세 세율 0.4%
        deduction: 630000,     // 누진공제액 63만원
        eduTaxRate: 0.2,      // 지방교육세율 20%
        cityTaxRate: 0.0014,  // 도시지역분 0.14%
    },
    jongbu: {
        deduction: 900000000, // 1인당 기본공제액 9억원
        rate2026: 0.6,        // 2026 공정시가비율 60%
        rate2027: 0.7,        // 2027 공정시가비율 70%
    }
};

function calculatePropertyTaxDetails(price) {
    const config = TAX_CONFIG.property;
    const propBase = Math.round(price * config.baseRate);
    const mainPropTax = Math.max(0, Math.round((propBase * config.taxRate) - config.deduction));
    const eduTax = Math.round(mainPropTax * config.eduTaxRate);
    const cityTax = Math.round(propBase * config.cityTaxRate);
    const totalPropTax = mainPropTax + eduTax + cityTax;

    return {
        price,
        propBase,
        mainPropTax,
        eduTax,
        cityTax,
        totalPropTax
    };
}

function calculateJongbuTaxDetails(price, year) {
    const config = TAX_CONFIG.jongbu;
    const rate = (year === 2026) ? config.rate2026 : config.rate2027;
    
    const sharePrice = Math.round(price / 2);
    const targetAmount = Math.max(0, Math.round(sharePrice - config.deduction));
    const jongbuBase = Math.round(targetAmount * rate);
    
    let taxPerPerson = 0;
    let tierInfo = "";
    let formula = "";

    if (year === 2026) {
        if (jongbuBase <= 0) {
            tierInfo = "과세대상 없음 (공제 9억원 이하)";
            formula = "0원";
            taxPerPerson = 0;
        } else if (jongbuBase <= 300000000) {
            tierInfo = "3억원 이하 (세율 0.5%)";
            formula = `(과세표준 ${formatKoreanText(jongbuBase)} × 0.5%)`;
            taxPerPerson = Math.round(jongbuBase * 0.005);
        } else if (jongbuBase <= 600000000) {
            tierInfo = "3억 초과 ~ 6억원 이하 (세율 0.7%, 누진공제 60만원)";
            formula = `(과세표준 ${formatKoreanText(jongbuBase)} × 0.7%) - 60만원`;
            taxPerPerson = Math.round((jongbuBase * 0.007) - 600000);
        } else {
            tierInfo = "6억원 초과 (세율 1.0%, 누진공제 240만원)";
            formula = `(과세표준 ${formatKoreanText(jongbuBase)} × 1.0%) - 240만원`;
            taxPerPerson = Math.round((jongbuBase * 0.01) - 2400000);
        }
    } else { // 2027~2028 개편안
        if (jongbuBase <= 0) {
            tierInfo = "과세대상 없음 (공제 9억원 이하)";
            formula = "0원";
            taxPerPerson = 0;
        } else if (jongbuBase <= 300000000) {
            tierInfo = "3억원 이하 (세율 0.5%)";
            formula = `(과세표준 ${formatKoreanText(jongbuBase)} × 0.5%)`;
            taxPerPerson = Math.round(jongbuBase * 0.005);
        } else if (jongbuBase <= 600000000) {
            tierInfo = "3억 초과 ~ 6억원 이하 (세율 0.7%, 누진공제 60만원)";
            formula = `(과세표준 ${formatKoreanText(jongbuBase)} × 0.7%) - 60만원`;
            taxPerPerson = Math.round((jongbuBase * 0.007) - 600000);
        } else {
            tierInfo = "6억원 초과 (세율 1.3%, 누진공제 420만원)";
            formula = `(과세표준 ${formatKoreanText(jongbuBase)} × 1.3%) - 420만원`;
            taxPerPerson = Math.round((jongbuBase * 0.013) - 4200000);
        }
    }

    taxPerPerson = Math.max(0, taxPerPerson);
    const totalJongbu = taxPerPerson * 2;

    return {
        price,
        sharePrice,
        deduction: config.deduction,
        targetAmount,
        rate,
        jongbuBase,
        tierInfo,
        formula,
        taxPerPerson,
        totalJongbu
    };
}

function setPropPrice(value) {
    const slider = document.getElementById('priceSlider');
    if (slider) {
        slider.value = value;
        updatePropPresetActive(value);
        updatePropertyTaxUI();
    }
}

function updatePropPresetActive(value) {
    const buttons = document.querySelectorAll('#propertyCalcSection .preset-btn');
    buttons.forEach(btn => {
        const btnVal = parseInt(btn.getAttribute('onclick').match(/\d+/)[0]);
        if (btnVal === parseInt(value)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updatePropertyTaxUI() {
    const slider = document.getElementById('priceSlider');
    if (!slider) return;
    const price = parseInt(slider.value);
    
    document.getElementById('priceLabelExact').innerText = Math.round(price).toLocaleString('ko-KR');
    document.getElementById('priceLabelReadable').innerText = `(${formatKoreanText(price)})`;
    updatePropPresetActive(price);

    // 1. 재산세 상세 산출
    const p = calculatePropertyTaxDetails(price);
    document.getElementById('propTaxTotal').innerText = formatWon(p.totalPropTax);

    document.getElementById('propStep1Price').innerText = formatWon(p.price);
    document.getElementById('propStep1Base').innerText = formatWon(p.propBase) + ` (${formatKoreanText(p.propBase)})`;

    document.getElementById('propStep2Base').innerText = formatWon(p.propBase);
    document.getElementById('propStep2Main').innerText = formatWon(p.mainPropTax) + ` (${formatKoreanText(p.mainPropTax)})`;

    document.getElementById('propStep3Edu').innerText = `본세 (${formatKoreanText(p.mainPropTax)}) × 20% = ` + formatWon(p.eduTax);
    document.getElementById('propStep3City').innerText = `과세표준 (${formatKoreanText(p.propBase)}) × 0.14% = ` + formatWon(p.cityTax);

    document.getElementById('propStep4Main').innerText = formatWon(p.mainPropTax);
    document.getElementById('propStep4Edu').innerText = formatWon(p.eduTax);
    document.getElementById('propStep4City').innerText = formatWon(p.cityTax);
    document.getElementById('propStep4Total').innerText = formatWon(p.totalPropTax) + ` (${formatKoreanText(p.totalPropTax)})`;

    // 2. 2026년 종부세 상세 산출
    const j26 = calculateJongbuTaxDetails(price, 2026);
    document.getElementById('jongbu2026').innerText = formatWon(j26.totalJongbu);
    document.getElementById('total2026').innerText = formatWon(p.totalPropTax + j26.totalJongbu);

    document.getElementById('j26Step1Price').innerText = formatWon(j26.price);
    document.getElementById('j26Step1Share').innerText = formatWon(j26.sharePrice);
    document.getElementById('j26Step1Target').innerText = formatWon(j26.targetAmount) + ` (${formatKoreanText(j26.targetAmount)})`;

    document.getElementById('j26Step2Target').innerText = formatWon(j26.targetAmount);
    document.getElementById('j26Step2Base').innerText = formatWon(j26.jongbuBase) + ` (${formatKoreanText(j26.jongbuBase)})`;

    document.getElementById('j26Step3TierInfo').innerText = j26.tierInfo;
    document.getElementById('j26Step3Formula').innerText = j26.formula;
    document.getElementById('j26Step3PerPerson').innerText = formatWon(j26.taxPerPerson) + ` (${formatKoreanText(j26.taxPerPerson)})`;

    document.getElementById('j26Step4PerPerson').innerText = formatWon(j26.taxPerPerson);
    document.getElementById('j26Step4Total').innerText = formatWon(j26.totalJongbu) + ` (${formatKoreanText(j26.totalJongbu)})`;

    // 3. 2027~2028년 종부세 상세 산출
    const j27 = calculateJongbuTaxDetails(price, 2027);
    document.getElementById('jongbu2027').innerText = formatWon(j27.totalJongbu);
    document.getElementById('total2027').innerText = formatWon(p.totalPropTax + j27.totalJongbu);

    document.getElementById('j27Step1Price').innerText = formatWon(j27.price);
    document.getElementById('j27Step1Share').innerText = formatWon(j27.sharePrice);
    document.getElementById('j27Step1Target').innerText = formatWon(j27.targetAmount) + ` (${formatKoreanText(j27.targetAmount)})`;

    document.getElementById('j27Step2Target').innerText = formatWon(j27.targetAmount);
    document.getElementById('j27Step2Base').innerText = formatWon(j27.jongbuBase) + ` (${formatKoreanText(j27.jongbuBase)})`;

    document.getElementById('j27Step3TierInfo').innerText = j27.tierInfo;
    document.getElementById('j27Step3Formula').innerText = j27.formula;
    document.getElementById('j27Step3PerPerson').innerText = formatWon(j27.taxPerPerson) + ` (${formatKoreanText(j27.taxPerPerson)})`;

    document.getElementById('j27Step4PerPerson').innerText = formatWon(j27.taxPerPerson);
    document.getElementById('j27Step4Total').innerText = formatWon(j27.totalJongbu) + ` (${formatKoreanText(j27.totalJongbu)})`;
}

// 초기화
window.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('priceSlider');
    if (slider) {
        slider.addEventListener('input', updatePropertyTaxUI);
        updatePropertyTaxUI();
    }
});
