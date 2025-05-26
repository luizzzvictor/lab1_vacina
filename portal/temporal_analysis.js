/**
 * Módulo de Análise Temporal para o Portal de Cobertura Vacinal
 * 
 * Este módulo implementa análises de séries temporais e previsões
 * para dados de cobertura vacinal.
 */

// Configurações para análise temporal
const temporalConfig = {
    forecastHorizon: 12, // Horizonte de previsão em meses
    confidenceInterval: 0.95, // Intervalo de confiança para previsões
    seasonalityPeriod: 12, // Período de sazonalidade em meses
    minDataPoints: 24 // Mínimo de pontos de dados para análise temporal
};

// Função para analisar tendências temporais
function analyzeTrends(timeSeriesData) {
    // Verificar se há dados suficientes
    if (timeSeriesData.length < temporalConfig.minDataPoints) {
        return {
            success: false,
            error: `Dados insuficientes para análise temporal. Necessário pelo menos ${temporalConfig.minDataPoints} pontos.`
        };
    }

    // Calcular tendência linear
    const xValues = timeSeriesData.map((_, index) => index);
    const yValues = timeSeriesData.map(point => point.value);
    
    const n = xValues.length;
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calcular valores da linha de tendência
    const trendLine = xValues.map(x => slope * x + intercept);
    
    // Calcular coeficiente de determinação (R²)
    const meanY = sumY / n;
    const totalVariation = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const residualVariation = yValues.reduce((sum, y, i) => sum + Math.pow(y - trendLine[i], 2), 0);
    const rSquared = 1 - (residualVariation / totalVariation);
    
    // Detectar sazonalidade
    const seasonalityDetected = detectSeasonality(timeSeriesData);
    
    // Calcular média móvel
    const movingAverage = calculateMovingAverage(yValues, 3);
    
    return {
        success: true,
        trend: {
            slope: slope,
            intercept: intercept,
            direction: slope > 0 ? 'crescente' : slope < 0 ? 'decrescente' : 'estável',
            rSquared: rSquared
        },
        trendLine: trendLine,
        movingAverage: movingAverage,
        seasonality: seasonalityDetected,
        originalData: timeSeriesData
    };
}

// Função para detectar sazonalidade
function detectSeasonality(timeSeriesData) {
    // Implementação simplificada de detecção de sazonalidade
    // Usando autocorrelação com defasagem igual ao período sazonal
    
    const values = timeSeriesData.map(point => point.value);
    const n = values.length;
    
    if (n <= temporalConfig.seasonalityPeriod * 2) {
        return {
            detected: false,
            reason: "Série temporal muito curta para análise de sazonalidade"
        };
    }
    
    // Calcular média e desvio padrão
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n);
    
    // Calcular autocorrelação com defasagem igual ao período sazonal
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n - temporalConfig.seasonalityPeriod; i++) {
        numerator += (values[i] - mean) * (values[i + temporalConfig.seasonalityPeriod] - mean);
    }
    
    for (let i = 0; i < n; i++) {
        denominator += Math.pow(values[i] - mean, 2);
    }
    
    const autocorrelation = numerator / denominator;
    
    // Determinar se há sazonalidade com base no coeficiente de autocorrelação
    const seasonalityThreshold = 0.3; // Limiar para considerar sazonalidade significativa
    
    return {
        detected: Math.abs(autocorrelation) > seasonalityThreshold,
        autocorrelation: autocorrelation,
        period: temporalConfig.seasonalityPeriod,
        strength: Math.abs(autocorrelation)
    };
}

// Função para calcular média móvel
function calculateMovingAverage(values, window) {
    const result = [];
    
    for (let i = 0; i < values.length; i++) {
        if (i < window - 1) {
            result.push(null); // Não há pontos suficientes para a janela
        } else {
            let sum = 0;
            for (let j = 0; j < window; j++) {
                sum += values[i - j];
            }
            result.push(sum / window);
        }
    }
    
    return result;
}

// Função para fazer previsões futuras
function forecastTimeSeries(timeSeriesData) {
    // Verificar se há dados suficientes
    if (timeSeriesData.length < temporalConfig.minDataPoints) {
        return {
            success: false,
            error: `Dados insuficientes para previsão. Necessário pelo menos ${temporalConfig.minDataPoints} pontos.`
        };
    }
    
    // Analisar tendências
    const trendAnalysis = analyzeTrends(timeSeriesData);
    
    if (!trendAnalysis.success) {
        return trendAnalysis;
    }
    
    // Extrair componentes para previsão
    const { trend, seasonality } = trendAnalysis;
    const lastDate = new Date(timeSeriesData[timeSeriesData.length - 1].date);
    const lastValue = timeSeriesData[timeSeriesData.length - 1].value;
    
    // Gerar previsões
    const forecast = [];
    const upperBound = [];
    const lowerBound = [];
    
    // Calcular erro padrão para intervalos de confiança
    const values = timeSeriesData.map(point => point.value);
    const trendValues = trendAnalysis.trendLine;
    const errors = values.map((val, i) => val - (trendValues[i] || val));
    const stdError = Math.sqrt(errors.reduce((sum, err) => sum + err * err, 0) / errors.length);
    
    // Fator Z para o intervalo de confiança (aproximação normal)
    const zFactor = 1.96; // Para 95% de confiança
    
    for (let i = 1; i <= temporalConfig.forecastHorizon; i++) {
        // Calcular próxima data
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + i);
        
        // Calcular valor previsto com base na tendência
        const x = timeSeriesData.length - 1 + i;
        let predictedValue = trend.slope * x + trend.intercept;
        
        // Adicionar componente sazonal se detectado
        if (seasonality.detected) {
            // Encontrar o valor no mesmo mês do ano anterior
            const seasonalIndex = (timeSeriesData.length - temporalConfig.seasonalityPeriod + i) % timeSeriesData.length;
            if (seasonalIndex >= 0) {
                const seasonalAdjustment = values[seasonalIndex] - trendValues[seasonalIndex];
                predictedValue += seasonalAdjustment;
            }
        }
        
        // Calcular intervalos de confiança
        const marginOfError = zFactor * stdError * Math.sqrt(1 + i / timeSeriesData.length);
        
        forecast.push({
            date: nextDate.toISOString().split('T')[0],
            value: predictedValue
        });
        
        upperBound.push({
            date: nextDate.toISOString().split('T')[0],
            value: predictedValue + marginOfError
        });
        
        lowerBound.push({
            date: nextDate.toISOString().split('T')[0],
            value: Math.max(0, predictedValue - marginOfError) // Não permitir valores negativos
        });
    }
    
    return {
        success: true,
        forecast: forecast,
        upperBound: upperBound,
        lowerBound: lowerBound,
        confidenceInterval: temporalConfig.confidenceInterval,
        trendAnalysis: trendAnalysis
    };
}

// Função para visualizar análise temporal
function visualizeTemporalAnalysis(chartElement, analysisResult) {
    if (!analysisResult.success) {
        console.error(analysisResult.error);
        return;
    }
    
    const ctx = chartElement.getContext('2d');
    
    // Preparar dados para o gráfico
    const timeSeriesData = analysisResult.originalData;
    const labels = timeSeriesData.map(point => point.date);
    const values = timeSeriesData.map(point => point.value);
    
    // Criar dataset para linha de tendência
    const trendLine = analysisResult.trendLine;
    
    // Criar dataset para média móvel
    const movingAverage = analysisResult.movingAverage;
    
    // Configurar o gráfico
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Cobertura Vacinal',
                    data: values,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false
                },
                {
                    label: 'Linha de Tendência',
                    data: trendLine,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Média Móvel (3 períodos)',
                    data: movingAverage,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'transparent',
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Período'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cobertura Vacinal (%)'
                    },
                    min: 0,
                    max: Math.max(100, ...values) * 1.1
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Análise Temporal de Cobertura Vacinal'
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 95,
                            yMax: 95,
                            borderColor: 'rgba(255, 159, 64, 0.7)',
                            borderWidth: 2,
                            borderDash: [2, 2],
                            label: {
                                content: 'Meta (95%)',
                                enabled: true,
                                position: 'end'
                            }
                        }
                    }
                }
            }
        }
    });
    
    return chart;
}

// Função para visualizar previsões
function visualizeForecast(chartElement, forecastResult) {
    if (!forecastResult.success) {
        console.error(forecastResult.error);
        return;
    }
    
    const ctx = chartElement.getContext('2d');
    
    // Preparar dados históricos
    const historicalData = forecastResult.trendAnalysis.originalData;
    const historicalLabels = historicalData.map(point => point.date);
    const historicalValues = historicalData.map(point => point.value);
    
    // Preparar dados de previsão
    const forecastData = forecastResult.forecast;
    const forecastLabels = forecastData.map(point => point.date);
    const forecastValues = forecastData.map(point => point.value);
    
    // Preparar intervalos de confiança
    const upperBoundValues = forecastResult.upperBound.map(point => point.value);
    const lowerBoundValues = forecastResult.lowerBound.map(point => point.value);
    
    // Combinar labels para o eixo X
    const allLabels = [...historicalLabels, ...forecastLabels];
    
    // Criar arrays para todos os datasets
    const historicalDataset = [...historicalValues, ...Array(forecastLabels.length).fill(null)];
    const forecastDataset = [...Array(historicalLabels.length).fill(null), ...forecastValues];
    const upperBoundDataset = [...Array(historicalLabels.length).fill(null), ...upperBoundValues];
    const lowerBoundDataset = [...Array(historicalLabels.length).fill(null), ...lowerBoundValues];
    
    // Configurar o gráfico
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Dados Históricos',
                    data: historicalDataset,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false
                },
                {
                    label: 'Previsão',
                    data: forecastDataset,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'transparent',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false
                },
                {
                    label: 'Limite Superior',
                    data: upperBoundDataset,
                    borderColor: 'rgba(255, 99, 132, 0.3)',
                    backgroundColor: 'transparent',
                    pointRadius: 0,
                    borderDash: [5, 5],
                    fill: false
                },
                {
                    label: 'Limite Inferior',
                    data: lowerBoundDataset,
                    borderColor: 'rgba(255, 99, 132, 0.3)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    pointRadius: 0,
                    borderDash: [5, 5],
                    fill: '+1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Período'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cobertura Vacinal (%)'
                    },
                    min: 0,
                    max: Math.max(100, ...historicalValues, ...upperBoundValues) * 1.1
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: `Previsão de Cobertura Vacinal (IC ${forecastResult.confidenceInterval * 100}%)`
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 95,
                            yMax: 95,
                            borderColor: 'rgba(255, 159, 64, 0.7)',
                            borderWidth: 2,
                            borderDash: [2, 2],
                            label: {
                                content: 'Meta (95%)',
                                enabled: true,
                                position: 'end'
                            }
                        },
                        box1: {
                            type: 'box',
                            xMin: historicalLabels
(Content truncated due to size limit. Use line ranges to read in chunks)