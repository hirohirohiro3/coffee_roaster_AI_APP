import { eventBus } from './EventBus.js';

let roastsCache = [];
let beansCache = [];
let joinedRoastsCache = []; 

function joinRoastAndBeanData() {
    if (roastsCache.length > 0 && beansCache.length > 0) {
        const beansMap = new Map(beansCache.map(bean => [bean.id, bean]));
        
        joinedRoastsCache = roastsCache.map(roast => {
            const beanData = beansMap.get(roast.beanId) || {};
            
            // 焙煎記録にcostがなければ、生豆の価格(price)をcostとして引き継ぐ
            const finalCost = roast.cost !== undefined ? roast.cost : beanData.price;

            return { 
                ...roast, 
                beanName: beanData.beanName || '（削除された豆）',
                origin: beanData.origin || '',
                cost: finalCost // ★★★ この行を修正 ★★★
            };
        });
    } else {
        // beansCacheがない場合も、roastデータだけは保持する
        joinedRoastsCache = roastsCache.map(roast => ({ ...roast })); 
    }
    // データが結合されたことを通知
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