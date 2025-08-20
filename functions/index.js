import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "firebase-functions";

initializeApp();

// ▼▼▼ Gemini APIキーを環境変数から安全に読み込む ▼▼▼
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI評価用の関数 (onCallを使用)
export const getRoastAnalysis = onCall({
  enforceAppCheck: true, // This line enables App Check
  region: "asia-northeast1", // 東京リージョン
  secrets: ["GEMINI_API_KEY"], // 環境変数を安全に利用するための設定
}, async (request) => {
  
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "この機能を利用するには認証が必要です。");
  }

  const roastPlan = request.data;
  const modelName = "gemini-1.5-pro";

  // ▼▼▼ プロンプトインジェクション対策 ▼▼▼
  // 指示とユーザー提供データを明確に分離する
  const prompt = `
# instruction
あなたは世界クラスの焙煎士です。
ユーザーから提供された以下の「焙煎データ」を分析し、コーヒー焙煎における理想的な投入温度と、その後の1分ごとの豆温度の推移を予測してください。

# output_format
- 必ず以下のフォーマットを一行ずつ、厳密に守って出力してください。
- 他の説明文、前置き、言い訳は一切含めないでください。
- 指定されたフォーマット以外の情報は絶対に出力しないでください。

投入温度: XXX.X℃
1分: YYY.Y℃
2分: ZZZ.Z℃
...

# user_data
- 使用する豆: ${roastPlan.beanName || "不明"}
- 目標の焙煎度: ${roastPlan.roastLevel || "不明"}
- 目標とする風味: ${roastPlan.targetFlavor || "指定なし"}
- 使用する焙煎機: ${roastPlan.roasterModel || "指定なし"}
- 投入する生豆重量: ${roastPlan.greenWeight ? roastPlan.greenWeight * 1000 + "g" : "不明"}
- 気温: ${roastPlan.temp ? roastPlan.temp + "℃" : "不明"}
- 湿度: ${roastPlan.humidity ? roastPlan.humidity + "%" : "不明"}
`;
  // ▲▲▲ プロンプトインジェクション対策完了 ▲▲▲

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiTextResponse = response.text();

    logger.info("AI Response Text:", aiTextResponse);

    // AIからのテキスト回答を解析して構造化データに変換
    let chargeTemperature = null;
    const temperatureProfile = [];

    const chargeTempMatch = aiTextResponse.match(/投入温度\s*[:：]\s*([\d.]+)/);
    if (chargeTempMatch && chargeTempMatch[1]) {
      chargeTemperature = parseFloat(chargeTempMatch[1]);
    }

    const profileRegex = /(\d+)\s*分\s*[:：]\s*([\d.]+)/g;
    let match;
    while ((match = profileRegex.exec(aiTextResponse)) !== null) {
      temperatureProfile.push({
        x: parseInt(match[1]),
        y: parseFloat(match[2])
      });
    }

    if (chargeTemperature === null && temperatureProfile.length === 0) {
        throw new Error("AI response could not be parsed.");
    }

    return {
      chargeTemperature: chargeTemperature,
      temperatureProfile: temperatureProfile,
      rawText: aiTextResponse // 参考のために生のテキストも返す
    };

  } catch (error) {
    logger.error("Gemini API Error:", error);
    throw new HttpsError("internal", "AIによる分析中にエラーが発生しました。");
  }
});