import { t } from '../modules/core/i18n.js';

/**
 * 秒数を MM:SS 形式の文字列に変換します。
 * @param {number} totalSeconds - 変換する秒数。
 * @returns {string} フォーマットされた時間文字列 (例: "09:30")。
 */
export function formatTime(totalSeconds) {
    if (totalSeconds === null || typeof totalSeconds === 'undefined' || isNaN(totalSeconds) || totalSeconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * MM:SS 形式の文字列を秒数に変換します。
 * @param {string} timeString - "MM:SS" 形式の文字列。
 * @returns {number|null} 変換された秒数。変換できない場合は null。
 */
export function timeToSeconds(timeString) {
    if (!timeString || typeof timeString !== 'string') return null;
    const parts = timeString.split(':');
    if (parts.length !== 2) return null;
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) return null;
    return minutes * 60 + seconds;
}

/**
 * 生豆と焙煎豆の重量から重量減少率を計算します。
 * @param {number} greenWeight - 生豆の重量。
 * @param {number} roastedWeight - 焙煎豆の重量。
 * @returns {{lossPercentage: string, error: string|null}} 計算結果またはエラー情報。
 */
export function calculateWeightLoss(greenWeight, roastedWeight) {
    if (greenWeight <= 0) return { lossPercentage: '-', error: t('errorInvalidGreenWeight') };
    if (roastedWeight > greenWeight) return { lossPercentage: '-', error: t('errorRoastedHeavier') };
    const loss = greenWeight - roastedWeight;
    const lossPercentage = (loss / greenWeight) * 100;
    return { lossPercentage: lossPercentage.toFixed(1), error: null };
}

/**
 * Development Time Ratio (DTR) を計算します。
 * DTR(%) = ( (総焙煎時間 - 1ハゼ時間) / 総焙煎時間 ) * 100
 * @param {string} firstCrackTime - "MM:SS" 形式の1ハゼ時間。
 * @param {string} totalRoastTime - "MM:SS" 形式の総焙煎時間。
 * @returns {number|null} DTR(%)。計算できない場合は null。
 */
export function calculateDTR(firstCrackTime, totalRoastTime) {
    const fcSeconds = timeToSeconds(firstCrackTime);
    const totalSeconds = timeToSeconds(totalRoastTime);
    if (fcSeconds === null || totalSeconds === null || totalSeconds === 0 || fcSeconds > totalSeconds) {
        return null;
    }
    const developmentTime = totalSeconds - fcSeconds;
    return (developmentTime / totalSeconds) * 100;
}

/**
 * Rate of Rise (ROR) を計算します。
 * @param {number} prevTemp - 前回の豆温度。
 * @param {number} currentTemp - 今回の豆温度。
 * @param {number} timeDiffSeconds - 時間差（秒）。
 * @returns {number|null} 1分あたりの温度上昇率（°C/min）。
 */
export function calculateBeanROR(prevTemp, currentTemp, timeDiffSeconds) {
    if (timeDiffSeconds <= 0) return null;
    const tempDiff = currentTemp - prevTemp;
    const rorPerSecond = tempDiff / timeDiffSeconds;
    return rorPerSecond * 60;
}

/**
 * 現在の温度とRORから、目標温度までの到達時間を予測します。
 * @param {number} currentTemp - 現在の豆温度。
 * @param {number} targetTemp - 目標温度。
 * @param {number} ror - 現在のROR (°C/min)。
 * @returns {number|null} 目標到達までの予測秒数。
 */
export function predictTimeToTarget(currentTemp, targetTemp, ror) {
    if (ror <= 0) return null; // 温度が上昇していない場合は予測不可
    const tempDiff = targetTemp - currentTemp;
    if (tempDiff <= 0) return 0; // すでに目標温度に到達している
    const minutesToTarget = tempDiff / ror;
    return minutesToTarget * 60; // 秒に変換
}

/**
 * カンマ区切りのログ文字列を、数値の配列にパースします。
 * @param {string} logString - "180.0,175.5,..." 形式の文字列。
 * @returns {Array<number|null>} パースされた数値の配列。
 */
export function parseLogStringToArray(logString) {
    if (!logString || typeof logString !== 'string' || logString.trim() === '') { return []; }
    try {
        return logString.split(',').map(s => {
            if (s.trim() === '') return null;
            const num = parseFloat(s.trim());
            return isNaN(num) ? null : num;
        });
    } catch (e) {
        console.error("roastUtils: Error in parseLogStringToArray:", e);
        return [];
    }
}

/**
 * MM:SS 形式の文字列を、分の数値に変換します。
 * @param {string} timeStr - "MM:SS" 形式の文字列。
 * @returns {number|null} 分単位の数値 (例: 1.5)。変換できない場合は null。
 */
export function convertTimeStringToMinutes(timeStr) {
    if (!timeStr) { return null; }
    try {
        const seconds = timeToSeconds(timeStr);
        if (seconds === null || isNaN(seconds) || seconds < 0) { return null; }
        return parseFloat((seconds / 60).toFixed(2));
    } catch (e) {
        console.error("roastUtils: Error in convertTimeStringToMinutes:", e);
        return null;
    }
}