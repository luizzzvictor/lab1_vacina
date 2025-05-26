/**
 * Módulo de Simulação para o Portal de Cobertura Vacinal
 * 
 * Este módulo implementa um simulador de intervenções para avaliar
 * o impacto de diferentes estratégias na cobertura vacinal.
 */

// Configurações do simulador
const simulationConfig = {
    simulationSteps: 24, // Número de meses para simular
    baseCoverage: 85, // Cobertura base inicial (%)
    populationGrowthRate: 0.005, // Taxa de crescimento populacional mensal
    vaccinationCapacityPerUBS: 50, // Capacidade de vacinação mensal por UBS
    awarenessImpactFactor: 0.1, // Fator de impacto de campanhas de conscientização
    accessibilityImpactFactor: 0.05, // Fator de impacto de melhorias na acessibilidade
    hesitancyRate: 0.1 // Taxa de hesitação vacinal base
};

// Função para simular o impacto de intervenções
function runSimulation(initialData, interventionParams) {
    // Validar dados iniciais
    if (!initialData || !initialData.municipio || !initialData.populacao || !initialData.ubs_count || !initialData[initialData.vaccineType]) {
        return { success: false, error: "Dados iniciais insuficientes para simulação." };
    }

    // Inicializar variáveis da simulação
    let currentPopulation = initialData.populacao;
    let currentCoverage = initialData[initialData.vaccineType];
    let currentHesitancy = simulationConfig.hesitancyRate * (1 - (interventionParams.awarenessCampaign ? 0.5 : 0)); // Reduz hesitação com campanha
    let currentCapacity = initialData.ubs_count * simulationConfig.vaccinationCapacityPerUBS * (1 + (interventionParams.increaseCapacity ? 0.2 : 0)); // Aumenta capacidade
    let accessibilityFactor = 1 + (interventionParams.improveAccessibility ? simulationConfig.accessibilityImpactFactor : 0); // Melhora acessibilidade

    const simulationResults = [];
    const baselineResults = []; // Simulação sem intervenção

    // Simular passo a passo (mês a mês)
    for (let step = 0; step < simulationConfig.simulationSteps; step++) {
        // --- Simulação com Intervenção ---
        // Crescimento populacional
        currentPopulation *= (1 + simulationConfig.populationGrowthRate);
        
        // Calcular número de pessoas a serem vacinadas para manter/aumentar cobertura
        const targetVaccinated = currentPopulation * (currentCoverage / 100);
        const newlyEligible = currentPopulation * simulationConfig.populationGrowthRate; // Simplificação
        const needsVaccination = newlyEligible + (currentPopulation - targetVaccinated);
        
        // Calcular pessoas efetivamente vacinadas (considerando capacidade, hesitação e acessibilidade)
        const willingToVaccinate = needsVaccination * (1 - currentHesitancy) * accessibilityFactor;
        const actuallyVaccinated = Math.min(willingToVaccinate, currentCapacity);
        
        // Atualizar cobertura
        const totalVaccinated = targetVaccinated + actuallyVaccinated;
        currentCoverage = Math.min(100, (totalVaccinated / currentPopulation) * 100);
        
        simulationResults.push({
            step: step + 1,
            population: Math.round(currentPopulation),
            coverage: parseFloat(currentCoverage.toFixed(2)),
            vaccinated: Math.round(actuallyVaccinated)
        });

        // --- Simulação Baseline (sem intervenção) ---
        // Reutilizar lógica, mas sem os fatores de intervenção
        // (Implementação simplificada para demonstração)
        let baselineCoverage = initialData[initialData.vaccineType];
        let baselinePopulation = initialData.populacao;
        let baselineCapacity = initialData.ubs_count * simulationConfig.vaccinationCapacityPerUBS;
        let baselineHesitancy = simulationConfig.hesitancyRate;
        
        for(let bl_step = 0; bl_step <= step; bl_step++){
            baselinePopulation *= (1 + simulationConfig.populationGrowthRate);
            const bl_targetVaccinated = baselinePopulation * (baselineCoverage / 100);
            const bl_newlyEligible = baselinePopulation * simulationConfig.populationGrowthRate;
            const bl_needsVaccination = bl_newlyEligible + (baselinePopulation - bl_targetVaccinated);
            const bl_willingToVaccinate = bl_needsVaccination * (1 - baselineHesitancy);
            const bl_actuallyVaccinated = Math.min(bl_willingToVaccinate, baselineCapacity);
            const bl_totalVaccinated = bl_targetVaccinated + bl_actuallyVaccinated;
            baselineCoverage = Math.min(100, (bl_totalVaccinated / baselinePopulation) * 100);
        }
        baselineResults.push({
            step: step + 1,
            coverage: parseFloat(baselineCoverage.toFixed(2))
        });
    }

    return {
        success: true,
        municipio: initialData.municipio,
        vaccineType: initialData.vaccineType,
        initialCoverage: initialData[initialData.vaccineType],
        interventionParams: interventionParams,
        simulation: simulationResults,
        baseline: baselineResults
    };
}

// Função para visualizar resultados da simulação
function visualizeSimulation(chartElement, simulationResult) {
    if (!simulationResult.success) {
        console.error(simulationResult.error);
        // Exibir erro na interface
        chartElement.innerHTML = `<div class="alert alert-danger">Erro na simulação: ${simulationResult.error}</div>`;
        return null;
    }

    const ctx = chartElement.getContext("2d");
    
    // Limpar gráfico anterior se existir
    if (window.simulationChart) {
        window.simulationChart.destroy();
    }

    const labels = simulationResult.simulation.map(point => `Mês ${point.step}`);
    const interventionCoverage = simulationResult.simulation.map(point => point.coverage);
    const baselineCoverage = simulationResult.baseline.map(point => point.coverage);

    window.simulationChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Cobertura com Intervenção",
                    data: interventionCoverage,
                    borderColor: "rgba(75, 192, 192, 1)",
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    fill: false,
                    tension: 0.1
                },
                {
                    label: "Cobertura Baseline (Sem Intervenção)",
                    data: baselineCoverage,
                    borderColor: "rgba(255, 99, 132, 1)",
                    backgroundColor: "rgba(255, 99, 132, 0.2)",
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1
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
                        text: "Tempo (Meses)"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Cobertura Vacinal (%)"
                    },
                    min: Math.min(simulationResult.initialCoverage, ...baselineCoverage, ...interventionCoverage) * 0.9,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    position: "top"
                },
                title: {
                    display: true,
                    text: `Simulação de Cobertura Vacinal para ${simulationResult.municipio} (${simulationResult.vaccineType})`
                },
                tooltip: {
                    mode: "index",
                    intersect: false
                }
            }
        }
    });

    return window.simulationChart;
}

// Função para configurar a interface do simulador
function setupSimulatorInterface(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container com ID ${containerId} não encontrado.`);
        return;
    }

    // Limpar container
    container.innerHTML = 
        `<div class="row">
            <div class="col-md-4">
                <h5>Parâmetros da Simulação</h5>
                <div class="mb-3">
                    <label for="simMunicipioSelect" class="form-label">Município</label>
                    <select class="form-select" id="simMunicipioSelect"></select>
                </div>
                <div class="mb-3">
                    <label for="simVaccineSelect" class="form-label">Vacina</label>
                    <select class="form-select" id="simVaccineSelect">
                        <option value="bcg">BCG</option>
                        <option value="dtp">DTP</option>
                        <option value="penta">Penta</option>
                        <option value="polio">Polio Injetável</option>
                        <option value="rotavirus">Rotavírus</option>
                        <option value="triplice_viral_1">Tríplice Viral (1ª dose)</option>
                        <option value="triplice_viral_2">Tríplice Viral (2ª dose)</option>
                        <option value="varicela">Varicela</option>
                    </select>
                </div>
                <h5>Intervenções</h5>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="simAwareness">
                    <label class="form-check-label" for="simAwareness">Campanha de Conscientização</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="simAccessibility">
                    <label class="form-check-label" for="simAccessibility">Melhorar Acessibilidade</label>
                </div>
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="simCapacity">
                    <label class="form-check-label" for="simCapacity">Aumentar Capacidade das UBS</label>
                </div>
                <button class="btn btn-primary w-100" id="runSimButton">Rodar Simulação</button>
            </div>
            <div class="col-md-8">
                <h5>Resultados da Simulação</h5>
                <div class="chart-container" style="height: 450px;">
                    <canvas id="simulationChartCanvas"></canvas>
                </div>
            </div>
        </div>`;

    // Popular select de municípios
    const municipioSelect = document.getElementById("simMunicipioSelect");
    const municipios = [...new Set(data.map(item => item.municipio))].sort();
    municipios.forEach(mun => {
        const option = document.createElement("option");
        option.value = mun;
        option.textContent = mun;
        municipioSelect.appendChild(option);
    });

    // Adicionar listener ao botão
    document.getElementById("runSimButton").addEventListener("click", () => {
        const selectedMunicipioName = municipioSelect.value;
        const selectedVaccineType = document.getElementById("simVaccineSelect").value;
        
        const initialData = data.find(item => item.municipio === selectedMunicipioName);
        if (!initialData) {
            alert("Município não encontrado nos dados.");
            return;
        }
        initialData.vaccineType = selectedVaccineType; // Adicionar tipo de vacina aos dados iniciais

        const interventionParams = {
            awarenessCampaign: document.getElementById("simAwareness").checked,
            improveAccessibility: document.getElementById("simAccessibility").checked,
            increaseCapacity: document.getElementById("simCapacity").checked
        };

        const result = runSimulation(initialData, interventionParams);
        visualizeSimulation(document.getElementById("simulationChartCanvas"), result);
    });
}

// Exportar funções para uso global
window.simulationAnalysis = {
    runSimulation,
    visualizeSimulation,
    setupSimulatorInterface
};
