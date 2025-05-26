/**
 * Módulo de Análise de Eficiência para o Portal de Cobertura Vacinal
 * 
 * Este módulo implementa análises de eficiência das UBS e benchmarking
 * entre municípios similares.
 */

// Configurações para análise de eficiência
const efficiencyConfig = {
    minUbsCount: 1, // Número mínimo de UBS para análise
    populationFactor: 10000, // Fator para normalizar população (por 10.000 habitantes)
    efficiencyThresholds: {
        high: 0.8, // Acima de 80% é considerado alta eficiência
        medium: 0.6, // Entre 60% e 80% é média eficiência
        low: 0.4 // Abaixo de 40% é baixa eficiência
    },
    similarityThreshold: 0.8, // Limiar para considerar municípios similares (0-1)
    maxSimilarMunicipalities: 10 // Número máximo de municípios similares a exibir
};

// Função para calcular eficiência das UBS
function calculateUbsEfficiency(data) {
    if (!data || data.length === 0) {
        console.error('Dados insuficientes para análise de eficiência');
        return [];
    }

    // Filtrar municípios com pelo menos uma UBS
    const filteredData = data.filter(item => item.ubs_count >= efficiencyConfig.minUbsCount);
    
    // Calcular métricas de eficiência para cada município
    const efficiencyResults = filteredData.map(item => {
        // Calcular UBS por 10.000 habitantes
        const ubsPer10k = (item.ubs_count / item.populacao) * efficiencyConfig.populationFactor;
        
        // Calcular média de cobertura vacinal (usando as 8 vacinas principais)
        const coverageValues = [
            item.bcg,
            item.dtp,
            item.penta,
            item.polio,
            item.rotavirus,
            item.triplice_viral_1,
            item.triplice_viral_2,
            item.varicela
        ];
        
        const avgCoverage = coverageValues.reduce((sum, val) => sum + val, 0) / coverageValues.length;
        
        // Calcular eficiência (cobertura relativa ao número de UBS por população)
        // Normalizar para escala 0-1
        const normalizedUbsPer10k = Math.min(1, ubsPer10k / 5); // Assumindo que 5 UBS por 10k é o máximo ideal
        const normalizedCoverage = avgCoverage / 100;
        
        // Eficiência = cobertura / recursos (normalizado)
        // Quanto maior a cobertura com menos recursos, maior a eficiência
        const efficiency = normalizedCoverage / (normalizedUbsPer10k || 0.01); // Evitar divisão por zero
        const normalizedEfficiency = Math.min(1, efficiency / 2); // Normalizar para 0-1
        
        // Determinar categoria de eficiência
        let efficiencyCategory;
        if (normalizedEfficiency >= efficiencyConfig.efficiencyThresholds.high) {
            efficiencyCategory = 'Alta';
        } else if (normalizedEfficiency >= efficiencyConfig.efficiencyThresholds.medium) {
            efficiencyCategory = 'Média';
        } else if (normalizedEfficiency >= efficiencyConfig.efficiencyThresholds.low) {
            efficiencyCategory = 'Baixa';
        } else {
            efficiencyCategory = 'Muito Baixa';
        }
        
        return {
            municipio: item.municipio,
            uf: item.uf,
            regiao: item.regiao,
            tipo: item.tipo,
            populacao: item.populacao,
            ubs_count: item.ubs_count,
            ubsPer10k: ubsPer10k,
            avgCoverage: avgCoverage,
            efficiency: normalizedEfficiency,
            efficiencyCategory: efficiencyCategory,
            // Dados originais para referência
            originalData: item
        };
    });
    
    // Ordenar por eficiência (do maior para o menor)
    efficiencyResults.sort((a, b) => b.efficiency - a.efficiency);
    
    return efficiencyResults;
}

// Função para encontrar municípios similares para benchmarking
function findSimilarMunicipalities(municipio, data, efficiencyResults) {
    // Verificar se o município existe nos dados
    const targetMunicipio = data.find(item => item.municipio === municipio);
    if (!targetMunicipio) {
        console.error(`Município ${municipio} não encontrado nos dados`);
        return [];
    }
    
    // Encontrar resultado de eficiência para o município alvo
    const targetEfficiency = efficiencyResults.find(item => item.municipio === municipio);
    if (!targetEfficiency) {
        console.error(`Município ${municipio} não encontrado nos resultados de eficiência`);
        return [];
    }
    
    // Calcular similaridade com outros municípios
    const similarities = efficiencyResults
        .filter(item => item.municipio !== municipio) // Excluir o próprio município
        .map(item => {
            // Calcular similaridade baseada em:
            // 1. Tipologia municipal (mesmo tipo = maior similaridade)
            const typeSimilarity = item.tipo === targetEfficiency.tipo ? 1 : 0.5;
            
            // 2. Tamanho da população (quanto mais próximo, maior a similaridade)
            const popRatio = Math.min(item.populacao, targetEfficiency.populacao) / 
                            Math.max(item.populacao, targetEfficiency.populacao);
            
            // 3. Região (mesma região = maior similaridade)
            const regionSimilarity = item.regiao === targetEfficiency.regiao ? 1 : 0.7;
            
            // 4. Número de UBS (similaridade baseada na proporção)
            const ubsRatio = Math.min(item.ubs_count, targetEfficiency.ubs_count) / 
                            Math.max(item.ubs_count, targetEfficiency.ubs_count);
            
            // Calcular similaridade geral (média ponderada)
            const overallSimilarity = (
                typeSimilarity * 0.4 + // Tipo municipal tem peso maior
                popRatio * 0.3 +
                regionSimilarity * 0.2 +
                ubsRatio * 0.1
            );
            
            return {
                ...item,
                similarity: overallSimilarity
            };
        })
        .filter(item => item.similarity >= efficiencyConfig.similarityThreshold) // Filtrar por limiar de similaridade
        .sort((a, b) => b.similarity - a.similarity) // Ordenar por similaridade (maior primeiro)
        .slice(0, efficiencyConfig.maxSimilarMunicipalities); // Limitar número de resultados
    
    return similarities;
}

// Função para visualizar análise de eficiência
function visualizeEfficiencyAnalysis(chartElement, efficiencyResults, selectedRegion = null, selectedType = null) {
    // Filtrar resultados se região ou tipo for selecionado
    let filteredResults = efficiencyResults;
    if (selectedRegion) {
        filteredResults = filteredResults.filter(item => item.regiao === selectedRegion);
    }
    if (selectedType) {
        filteredResults = filteredResults.filter(item => item.tipo === selectedType);
    }
    
    // Limitar a 50 municípios para melhor visualização
    const displayResults = filteredResults.slice(0, 50);
    
    const ctx = chartElement.getContext('2d');
    
    // Limpar gráfico anterior se existir
    if (window.efficiencyChart) {
        window.efficiencyChart.destroy();
    }
    
    // Preparar dados para o gráfico
    const labels = displayResults.map(item => item.municipio);
    const efficiencyData = displayResults.map(item => item.efficiency * 100); // Converter para percentual
    const coverageData = displayResults.map(item => item.avgCoverage);
    const ubsData = displayResults.map(item => item.ubsPer10k);
    
    // Criar gráfico
    window.efficiencyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Eficiência (%)',
                    data: efficiencyData,
                    backgroundColor: displayResults.map(item => {
                        // Cores baseadas na categoria de eficiência
                        if (item.efficiencyCategory === 'Alta') return 'rgba(75, 192, 192, 0.7)';
                        if (item.efficiencyCategory === 'Média') return 'rgba(54, 162, 235, 0.7)';
                        if (item.efficiencyCategory === 'Baixa') return 'rgba(255, 206, 86, 0.7)';
                        return 'rgba(255, 99, 132, 0.7)'; // Muito Baixa
                    }),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Gráfico horizontal para melhor visualização de muitos municípios
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Município'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Eficiência (%)'
                    },
                    min: 0,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Análise de Eficiência das UBS por Município'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = displayResults[context.dataIndex];
                            return [
                                `Eficiência: ${item.efficiency.toFixed(2) * 100}%`,
                                `Categoria: ${item.efficiencyCategory}`,
                                `Cobertura média: ${item.avgCoverage.toFixed(2)}%`,
                                `UBS por 10k hab: ${item.ubsPer10k.toFixed(2)}`,
                                `População: ${item.populacao.toLocaleString('pt-BR')}`
                            ];
                        }
                    }
                }
            }
        }
    });
    
    return window.efficiencyChart;
}

// Função para visualizar benchmarking
function visualizeBenchmarking(chartElement, targetMunicipio, similarMunicipalities) {
    if (!targetMunicipio || !similarMunicipalities || similarMunicipalities.length === 0) {
        console.error('Dados insuficientes para visualização de benchmarking');
        return null;
    }
    
    const ctx = chartElement.getContext('2d');
    
    // Limpar gráfico anterior se existir
    if (window.benchmarkingChart) {
        window.benchmarkingChart.destroy();
    }
    
    // Preparar dados para o gráfico
    const allMunicipalities = [targetMunicipio, ...similarMunicipalities];
    const labels = allMunicipalities.map(item => item.municipio);
    
    // Dados para o gráfico de radar
    const radarData = {
        labels: ['Eficiência', 'Cobertura Vacinal', 'UBS por 10k hab', 'População (norm)'],
        datasets: allMunicipalities.map((item, index) => {
            // Normalizar população para escala 0-1
            const maxPop = Math.max(...allMunicipalities.map(m => m.populacao));
            const normalizedPop = item.populacao / maxPop;
            
            // Cor especial para o município alvo
            const color = index === 0 ? 
                'rgba(255, 99, 132, 0.7)' : // Vermelho para o alvo
                `rgba(${54 + index * 20}, ${162 - index * 10}, ${235 - index * 15}, 0.7)`; // Tons de azul para os similares
            
            return {
                label: item.municipio,
                data: [
                    item.efficiency * 100, // Eficiência em percentual
                    item.avgCoverage, // Cobertura média
                    item.ubsPer10k, // UBS por 10k habitantes
                    normalizedPop * 100 // População normalizada em percentual
                ],
                backgroundColor: color.replace('0.7', '0.2'),
                borderColor: color,
                borderWidth: index === 0 ? 2 : 1 // Linha mais grossa para o município alvo
            };
        })
    };
    
    // Criar gráfico de radar
    window.benchmarkingChart = new Chart(ctx, {
        type: 'radar',
        data: radarData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: `Benchmarking: ${targetMunicipio.municipio} vs Municípios Similares`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetIndex = context.datasetIndex;
                            const index = context.dataIndex;
                            const value = context.raw;
                            const labels = ['Eficiência', 'Cobertura Vacinal', 'UBS por 10k hab', 'População (norm)'];
                            
                            // Formatar valor de acordo com o tipo de dado
                            let formattedValue;
                            if (index === 0 || index === 3) { // Eficiência ou População normalizada
                                formattedValue = `${value.toFixed(1)}%`;
                            } else if (index === 1) { // Cobertura
                                formattedValue = `${value.toFixed(1)}%`;
                            } else if (index === 2) { // UBS por 10k
                                formattedValue = value.toFixed(2);
                            }
                            
                            return `${context.dataset.label} - ${labels[index]}: ${formattedValue}`;
                        }
                    }
                }
            }
        }
    });
    
    return window.benchmarkingChart;
}

// Função para configurar a interface de análise de eficiência
function setupEfficiencyInterface(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container com ID ${containerId} não encontrado.`);
        return;
    }

    // Calcular resultados de eficiência
    const efficiencyResults = calculateUbsEfficiency(data);
    
    // Limpar container
    container.innerHTML = 
        `<div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h5>Análise de Eficiência das UBS</h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-3">
                                <label for="effRegionSelect" class="form-label">Filtrar por Região</label>
                                <select class="form-select" id="effRegionSelect">
                                    <option value="">Todas as Regiões</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="effTypeSelect" class="form-label">Filtrar por Tipologia</label>
                                <select class="form-select" id="effTypeSelect">
                                    <option value="">Todas as Tipologias</option>
                                </select>
                            </div>
                            <div class="col-md-3 d-flex align-items-end">
                                <button class="btn btn-primary w-100" id="applyEffFilters">Aplicar Filtros</button>
                            </div>
                            <div class="col-
(Content truncated due to size limit. Use line ranges to read in chunks)