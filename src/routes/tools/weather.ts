import { z } from '@hono/zod-openapi'
import { tool } from 'ai'

export const weatherTool = tool({
    description: '指定された都市の現在の天気情報を取得します',
    parameters: z.object({
      city: z.string().describe('天気を調べたい都市名'),
      country: z.string().optional().describe('国コード（例: JP, US, GB）'),
    }),
    execute: async ({ city, country }) => {
      const apiKey = process.env.OPENWEATHER_API_KEY;
  
      try {
        // クエリパラメータを構築
        const query = country ? `${city},${country}` : city;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric&lang=ja`;
        
        // OpenWeatherMap APIを呼び出し
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'AI-Chat-App/1.0',
          },
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`都市「${city}」が見つかりませんでした。都市名を確認してください。`);
          } else if (response.status === 401) {
            throw new Error('OpenWeatherMap APIキーが無効です。');
          } else {
            throw new Error(`天気情報の取得に失敗しました（ステータス: ${response.status}）`);
          }
        }
        
        const data = await response.json();
        
        // レスポンスデータを整形
        const weatherData = {
          city: data.name,
          country: data.sys.country,
          temperature: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          condition: data.weather[0].description,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          windSpeed: Math.round(data.wind.speed * 3.6), // m/s を km/h に変換
          windDirection: data.wind.deg,
          cloudiness: data.clouds.all,
          visibility: data.visibility ? Math.round(data.visibility / 1000) : null, // メートルをキロメートルに
          sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('ja-JP'),
          sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('ja-JP'),
          source: 'openweathermap'
        };
        
        // 詳細な説明文を生成
        const description = `${weatherData.city}（${weatherData.country}）の現在の天気は${weatherData.condition}、気温${weatherData.temperature}度（体感温度${weatherData.feelsLike}度）、湿度${weatherData.humidity}%、風速${weatherData.windSpeed}km/hです。`;
        
        return {
          ...weatherData,
          description,
          additionalInfo: {
            pressure: `気圧: ${weatherData.pressure}hPa`,
            cloudiness: `雲量: ${weatherData.cloudiness}%`,
            visibility: weatherData.visibility ? `視界: ${weatherData.visibility}km` : null,
            sunrise: `日の出: ${weatherData.sunrise}`,
            sunset: `日の入り: ${weatherData.sunset}`,
          }
        };
        
      } catch (error) {
        // エラーが発生した場合の処理
        console.error('Weather API error:', error);
        
        if (error instanceof Error) {
          throw new Error(`天気情報の取得中にエラーが発生しました: ${error.message}`);
        } else {
          throw new Error('天気情報の取得中に不明なエラーが発生しました。');
        }
      }
    },
});