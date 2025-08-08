/**
 * 月別の投資額を計算する
 * @param {Array} roasts - 全焙煎記録
 * @param {Array} beans - 全生豆データ
 * @returns {object} { labels: Array, data: Array }
 */
function calculateMonthlyCosts(roasts, beans) {
    const beanUnitPriceMap = new Map();
    beans.forEach(bean => {
        if (bean.price && bean.purchaseAmount > 0) {
            beanUnitPriceMap.set(bean.id, bean.price / bean.purchaseAmount);
        }
    });
    const monthlyCosts = {};
    roasts.forEach(roast => {
        if (!roast.roastDate || !roast.beanId || !roast.greenBeanWeight) return;
        const unitPrice = beanUnitPriceMap.get(roast.beanId);
        if (unitPrice === undefined) return;
        const roastMonth = roast.roastDate.substring(0, 7);
        const roastCost = unitPrice * roast.greenBeanWeight;
        if (!monthlyCosts[roastMonth]) {
            monthlyCosts[roastMonth] = 0;
        }
        monthlyCosts[roastMonth] += roastCost;
    });
    const sortedMonths = Object.keys(monthlyCosts).sort();
    return {
        labels: sortedMonths,
        data: sortedMonths.map(month => Math.round(monthlyCosts[month]))
    };
}

/**
 * 豆ごとの平均評価ランキングを計算する
 * @param {Array} roasts - 全焙煎記録
 * @returns {Array} [{ beanName, avgRating, count }, ...]
 */
function calculateBeanRankings(roasts) {
    const beanStats = {};
    roasts.forEach(roast => {
        if (!roast.beanName) return; 
        if (!beanStats[roast.beanName]) {
            beanStats[roast.beanName] = { totalRatingSum: 0, ratedCount: 0, totalCount: 0 };
        }
        beanStats[roast.beanName].totalCount++;
        if (roast.ratings && typeof roast.ratings === 'object') {
            const ratingValues = Object.values(roast.ratings).map(v => parseInt(v, 10)).filter(v => !isNaN(v));
            if (ratingValues.length > 0) {
                const sum = ratingValues.reduce((acc, val) => acc + val, 0);
                const avg = sum / ratingValues.length;
                beanStats[roast.beanName].totalRatingSum += avg;
                beanStats[roast.beanName].ratedCount++;
            }
        }
    });
    const rankings = Object.entries(beanStats).map(([beanName, stats]) => {
        const avgRating = stats.ratedCount > 0 ? (stats.totalRatingSum / stats.ratedCount) : 0;
        return {
            beanName,
            avgRating: avgRating,
            count: stats.totalCount
        };
    });
    rankings.sort((a, b) => b.avgRating - a.avgRating);
    return rankings;
}

// メインスレッドからのメッセージを受け取るリスナー
self.onmessage = function(e) {
    const { roasts, beans } = e.data;

    if (!roasts || !beans) {
        // データが不完全な場合は、結果を返さない
        return;
    }

    // 計算を実行
    const costData = calculateMonthlyCosts(roasts, beans);
    const rankingData = calculateBeanRankings(roasts);

    // 計算結果をメインスレッドに送り返す
    self.postMessage({
        type: 'statsResult',
        payload: {
            costData,
            rankingData
        }
    });
};