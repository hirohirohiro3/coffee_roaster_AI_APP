import { t } from '../modules/core/i18n.js';

/**
 * ユーザーの現在の位置情報を取得します。
 * @returns {Promise<object>} 成功時は { latitude, longitude } を解決するPromise、失敗時はエラーメッセージで拒否。
 */
function _getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(t('geolocationNotSupported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED: reject(t('geolocationPermissionDenied')); break;
                    case error.POSITION_UNAVAILABLE: reject(t('geolocationPositionUnavailable')); break;
                    case error.TIMEOUT: reject(t('geolocationTimeout')); break;
                    default: reject(t('geolocationUnknownError')); break;
                }
            }
        );
    });
}

/**
 * 指定された緯度経度に基づいて、Open-Meteo APIから現在の気象情報を取得します。
 * @param {number} latitude - 緯度
 * @param {number} longitude - 経度
 * @returns {Promise<object>} 成功時は { temperature: number, humidity: number } を解決するPromise、失敗時はエラーメッセージで拒否。
 */
async function _fetchWeatherFromAPI(latitude, longitude) {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current_weather=true&hourly=relativehumidity_2m&timezone=Asia%2FTokyo`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(t('weatherApiError', { status: response.status, statusText: response.statusText }));
        }
        const data = await response.json();

        if (data && data.current_weather && data.hourly?.time && data.hourly?.relativehumidity_2m) {
            const currentWeatherTime = new Date(data.current_weather.time).getTime();
            let closestHumidity = null;
            let smallestTimeDiff = Infinity;

            data.hourly.time.forEach((timeStr, index) => {
                const hourlyTime = new Date(timeStr).getTime();
                const diff = Math.abs(currentWeatherTime - hourlyTime);
                if (diff < smallestTimeDiff) {
                    smallestTimeDiff = diff;
                    closestHumidity = data.hourly.relativehumidity_2m[index];
                }
            });
            
            if (closestHumidity === null) {
                closestHumidity = data.hourly.relativehumidity_2m[0] ?? null;
            }
            
            return {
                temperature: data.current_weather.temperature,
                humidity: closestHumidity 
            };
        } else {
            throw new Error(t('weatherApiInvalidResponse'));
        }
    } catch (error) {
        console.error("weatherService.js: Error fetching or parsing weather data:", error);
        throw error;
    }
}

/**
 * 現在地の現在の気象情報（気温と湿度）を取得します。
 */
export async function fetchCurrentWeatherForRoast() {
    try {
        const location = await _getCurrentLocation();
        const weatherData = await _fetchWeatherFromAPI(location.latitude, location.longitude);
        return { 
            temperature: weatherData.temperature, 
            humidity: weatherData.humidity,
            source: 'Open-Meteo API'
        };
    } catch (errorMessage) {
        console.error("weatherService.js: Failed to fetch current weather.", errorMessage);
        return { error: String(errorMessage) };
    }
}
