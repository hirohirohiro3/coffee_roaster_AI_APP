import { eventBus } from './EventBus.js';

let roastsCache = [];
let beansCache = [];
let joinedRoastsCache = []; 

function joinRoastAndBeanData() {
    if (roastsCache.length > 0 && beansCache.length > 0) {
        const beansMap = new Map(beansCache.map(bean => [bean.id, bean]));
        
        joinedRoastsCache = roastsCache.map(roast => {
            const beanData = beansMap.get(roast.beanId) || {};
            
            let calculatedCost = null;
            // 生豆の単価データがあり、焙煎時の豆重量があればコストを計算
            if (beanData.price && beanData.purchaseAmount > 0 && roast.greenBeanWeight) {
                const unitPrice = beanData.price / beanData.purchaseAmount; // 1kgあたりの価格
                calculatedCost = Math.round(unitPrice * roast.greenBeanWeight);
            }

            // 焙煎記録にcostが保存されていればそれを優先、なければ計算した値を使用
            const finalCost = roast.cost !== undefined ? roast.cost : calculatedCost;

            return { 
                ...roast, 
                beanName: beanData.beanName || '（削除された豆）',
                origin: beanData.origin || '',
                cost: finalCost
            };
        });
    } else {
        joinedRoastsCache = roastsCache.map(roast => ({ ...roast })); 
    }
    eventBus.emit('data:joined-data-ready', joinedRoastsCache);
}

export function getJoinedRoasts() {
    return joinedRoastsCache;
}

export function getBeans() {
    return beansCache;
}

export function initializeDataService() {
    // 焙煎データが更新されたらキャッシュを更新して結合
    eventBus.on('data:roasts-updated', (roasts) => {
        roastsCache = roasts || [];
        joinRoastAndBeanData();
    });
    
    // 豆データが更新されたらキャッシュを更新して結合
    eventBus.on('data:beans-updated', (beans) => {
        beansCache = beans || [];
        joinRoastAndBeanData();
    });

    console.log("✅ DataService initialized.");
}