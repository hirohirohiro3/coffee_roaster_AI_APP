// roastUtils.js

export function timeToSeconds(timeStr) { 
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) return 0;
    return (minutes * 60) + seconds;
}

export function formatTime(totalSeconds) { 
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function calculateDTR(firstCrackTimeStr, totalRoastTimeStr) {
    const firstCrackSeconds = timeToSeconds(firstCrackTimeStr);
    const totalRoastSeconds = timeToSeconds(totalRoastTimeStr);
    if (firstCrackSeconds > 0 && totalRoastSeconds > 0 && firstCrackSeconds < totalRoastSeconds) {
        const developmentTimeSeconds = totalRoastSeconds - firstCrackSeconds;
        return ((developmentTimeSeconds / totalRoastSeconds) * 100).toFixed(1);
    }
    return null;
}

export function calculateBeanROR(beanTempLogStr) {
    if (!beanTempLogStr) return null;
    const beanTemps = beanTempLogStr.split(',')
                            .map(s => parseFloat(s.trim()))
                            .filter(n => !isNaN(n));
    if (beanTemps.length < 2) return null;
    const rorValues = [];
    for (let i = 1; i < beanTemps.length; i++) {
        rorValues.push((beanTemps[i] - beanTemps[i-1]).toFixed(1));
    }
    return rorValues.join(',');
}

export function calculateWeightLoss(greenWeightStr, roastedWeightStr) {
    const greenWeight = parseFloat(greenWeightStr);
    const roastedWeight = parseFloat(roastedWeightStr);
    if (!isNaN(greenWeight) && !isNaN(roastedWeight) && greenWeight > 0 && roastedWeight >= 0) {
        if (roastedWeight > greenWeight) {
            return { error: '焙煎後の重量が生豆の重量を超えています。', lossAmount: null, lossPercentage: null };
        }
        const loss = greenWeight - roastedWeight;
        const lossPercentage = greenWeight > 0 ? (loss / greenWeight) * 100 : 0;
        return {
            lossAmount: loss.toFixed(1),
            lossPercentage: lossPercentage.toFixed(1),
            error: null
        };
    }
    return { lossAmount: null, lossPercentage: null, error: null }; // Return nulls if inputs are invalid
}