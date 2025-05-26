/**
 * Integração de Módulos para o Portal de Cobertura Vacinal
 * 
 * Este arquivo integra todos os módulos desenvolvidos e configura
 * a navegação e interação entre as diferentes funcionalidades do portal.
 */

// Configuração global do portal
const portalConfig = {
    defaultTab: 'dashboard',
    dataLoadedEvent: 'data-loaded',
    mapInitialView: [-15.7801, -47.9292, 4], // [lat, lng, zoom]
    colorScheme: {
        primary: 'rgba(54, 162, 235, 1)',
        secondary: 'rgba(255, 99, 132, 1)',
        success: 'rgba(75, 192, 192, 1)',
        warning: 'rgba(255, 206, 86, 1)',
        danger: 'rgba(255, 99, 132, 1)',
        info: 'rgba(153, 102, 255, 1)',
        light: 'rgba(201, 203, 207, 1)'
    }
};

// Dados globais
let globalData = [];
let globalMap = null;

// Inicialização do portal
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar navegação
    initNavigation();
    
    // Carregar dados
    loadData();
    
    // Configurar eventos globais
    setupGlobalEvents();
});

// Função para inicializar navegação
function initNavigation() {
    // Adicionar listeners para links de navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Obter ID da seção alvo
            const targetId = this.getAttribute('href').substring(1);
            
            // Ativar tab
            activateTab(targetId);
        });
    });
    
    // Ativar tab padrão
    activateTab(portalConfig.defaultTab);
}

// Função para ativar tab
function activateTab(tabId) {
    // Desativar todas as tabs
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Ocultar todas as seções de conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Ativar tab selecionada
    const activeLink = document.querySelector(`.nav-link[href="#${tabId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Exibir seção de conteúdo correspondente
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.style.display = 'block';
    }
    
    // Inicializar conteúdo específico da tab, se necessário
    initTabContent(tabId);
}

// Função para inicializar conteúdo específico de cada tab
function initTabContent(tabId) {
    switch (tabId) {
        case 'dashboard':
            initDashboard();
            break;
        case 'mapa':
            initMap();
            break;
        case 'analise-temporal':
            initTemporalAnalysis();
            break;
        case 'simulador':
            initSimulator();
            break;
        case 'eficiencia':
            initEfficiencyAnalysis();
            break;
        case 'consultas':
            initQueryBuilder();
            break;
        case 'relatorios':
            initReportBuilder();
            break;
    }
}

// Função para carregar dados
function loadData() {
    // Exibir indicador de carregamento
    showLoading(true);
    
    // Carregar dados da API
    fetch('/api/vaccine_coverage')
        .then(response => response.json())
        .then(data => {
            // Armazenar dados globalmente
            globalData = data;
            
            // Disparar evento de dados carregados
            document.dispatchEvent(new CustomEvent(portalConfig.dataLoadedEvent, { detail: data }));
            
            // Inicializar dashboard com os dados
            initDashboard();
            
            // Ocultar indicador de carregamento
            showLoading(false);
        })
        .catch(error => {
            console.error('Erro ao carregar dados:', error);
            showError('Não foi possível carregar os dados. Por favor, tente novamente mais tarde.');
            showLoading(false);
        });
}

// Função para configurar eventos globais
function setupGlobalEvents() {
    // Listener para evento de dados carregados
    document.addEventListener(portalConfig.dataLoadedEvent, function(e) {
        // Atualizar contadores e estatísticas globais
        updateGlobalStats(e.detail);
    });
    
    // Listener para redimensionamento da janela
    window.addEventListener('resize', function() {
        // Redimensionar gráficos e mapas
        resizeVisualizations();
    });
}

// Função para inicializar dashboard
function initDashboard() {
    if (globalData.length === 0) {
        // Dados ainda não carregados
        return;
    }
    
    // Atualizar estatísticas do dashboard
    updateDashboardStats();
    
    // Inicializar gráficos do dashboard
    initDashboardCharts();
}

// Função para atualizar estatísticas do dashboard
function updateDashboardStats() {
    // Calcular estatísticas
    const totalMunicipios = globalData.length;
    let totalUBS = 0;
    let totalPopulacao = 0;
    let totalBCG = 0;
    let totalTripliceViral = 0;
    
    globalData.forEach(item => {
        totalUBS += item.ubs_count;
        totalPopulacao += item.populacao;
        totalBCG += item.bcg;
        totalTripliceViral += item.triplice_viral_1;
    });
    
    const avgBCG = totalBCG / totalMunicipios;
    const avgTripliceViral = totalTripliceViral / totalMunicipios;
    
    // Atualizar elementos HTML
    document.getElementById('avgCoverage').textContent = ((avgBCG + avgTripliceViral) / 2).toFixed(2) + '%';
    document.getElementById('totalUBS').textContent = totalUBS.toLocaleString('pt-BR');
    document.getElementById('totalMunicipios').textContent = totalMunicipios.toLocaleString('pt-BR');
    document.getElementById('populacaoTotal').textContent = formatPopulation(totalPopulacao);
}

// Função para inicializar gráficos do dashboard
function initDashboardCharts() {
    // Inicializar gráfico de cobertura por região
    initRegionChart();
    
    // Inicializar gráfico de cobertura por tipologia
    initTypeChart();
    
    // Inicializar gráfico de dispersão
    initScatterChart();
}

// Função para inicializar gráfico de cobertura por região
function initRegionChart() {
    const regions = {};
    const selectedVaccine = document.getElementById('vaccineSelect').value || 'bcg';
    
    globalData.forEach(item => {
        if (!regions[item.regiao]) {
            regions[item.regiao] = {
                total: 0,
                count: 0
            };
        }
        regions[item.regiao].total += item[selectedVaccine];
        regions[item.regiao].count++;
    });
    
    const labels = Object.keys(regions);
    const data = labels.map(region => regions[region].total / regions[region].count);
    
    const ctx = document.getElementById('regionChart').getContext('2d');
    
    if (window.regionChart) {
        window.regionChart.destroy();
    }
    
    window.regionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Cobertura Média de ${getVaccineName(selectedVaccine)} (%)`,
                data: data,
                backgroundColor: labels.map((_, i) => getChartColor(i)),
                borderColor: labels.map((_, i) => getChartColor(i, 0.8)),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cobertura Média (%)'
                    }
                }
            }
        }
    });
}

// Função para inicializar gráfico de cobertura por tipologia
function initTypeChart() {
    const types = {};
    const selectedVaccine = document.getElementById('vaccineSelect').value || 'bcg';
    
    globalData.forEach(item => {
        if (!types[item.tipo]) {
            types[item.tipo] = {
                total: 0,
                count: 0
            };
        }
        types[item.tipo].total += item[selectedVaccine];
        types[item.tipo].count++;
    });
    
    const labels = Object.keys(types);
    const data = labels.map(type => types[type].total / types[type].count);
    
    const ctx = document.getElementById('typeChart').getContext('2d');
    
    if (window.typeChart) {
        window.typeChart.destroy();
    }
    
    window.typeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Cobertura Média de ${getVaccineName(selectedVaccine)} (%)`,
                data: data,
                backgroundColor: labels.map((_, i) => getChartColor(i + 5)),
                borderColor: labels.map((_, i) => getChartColor(i + 5, 0.8)),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cobertura Média (%)'
                    }
                }
            }
        }
    });
}

// Função para inicializar gráfico de dispersão
function initScatterChart() {
    const selectedVaccine = document.getElementById('vaccineSelect').value || 'bcg';
    
    const data = globalData.map(item => {
        const ubsPer10k = item.populacao > 0 ? (item.ubs_count / item.populacao) * 10000 : 0;
        return {
            x: ubsPer10k,
            y: item[selectedVaccine],
            municipio: item.municipio,
            regiao: item.regiao,
            tipo: item.tipo
        };
    });
    
    const ctx = document.getElementById('scatterChart').getContext('2d');
    
    if (window.scatterChart) {
        window.scatterChart.destroy();
    }
    
    window.scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: `UBS por 10.000 hab vs Cobertura de ${getVaccineName(selectedVaccine)}`,
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'UBS por 10.000 habitantes'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cobertura Vacinal (%)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `${point.municipio}`,
                                `Região: ${point.regiao}`,
                                `Tipo: ${point.tipo}`,
                                `UBS por 10k hab: ${point.x.toFixed(2)}`,
                                `Cobertura: ${point.y.toFixed(2)}%`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Função para inicializar mapa
function initMap() {
    // Verificar se o mapa já foi inicializado
    if (globalMap) {
        return;
    }
    
    // Inicializar mapa
    globalMap = L.map('map').setView(portalConfig.mapInitialView.slice(0, 2), portalConfig.mapInitialView[2]);
    
    // Adicionar camada de mapa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(globalMap);
    
    // Adicionar marcadores para os municípios
    updateMapMarkers();
    
    // Adicionar controles ao mapa
    addMapControls();
}

// Função para atualizar marcadores no mapa
function updateMapMarkers() {
    if (!globalMap) {
        return;
    }
    
    // Limpar marcadores existentes
    if (window.mapMarkers) {
        window.mapMarkers.forEach(marker => globalMap.removeLayer(marker));
    }
    window.mapMarkers = [];
    
    // Obter tipo de vacina selecionado
    const selectedVaccine = document.getElementById('vaccineSelect').value || 'bcg';
    
    // Adicionar novos marcadores
    globalData.forEach(item => {
        if (item.latitude && item.longitude) {
            const coverage = item[selectedVaccine];
            const color = getCoverageColor(coverage);
            
            const marker = L.circleMarker([item.latitude, item.longitude], {
                radius: 8,
                fillColor: color,
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(globalMap);
            
            marker.bindPopup(`
                <strong>${item.municipio} - ${item.uf}</strong><br>
                Região: ${item.regiao}<br>
                Tipo: ${item.tipo}<br>
                Cobertura ${getVaccineName(selectedVaccine)}: ${coverage.toFixed(2)}%<br>
                UBS: ${item.ubs_count}<br>
                População: ${item.populacao.toLocaleString('pt-BR')}
            `);
            
            window.mapMarkers.push(marker);
        }
    });
    
    // Adicionar legenda
    addMapLegend();
}

// Função para adicionar controles ao mapa
function addMapControls() {
    // Adicionar botão para análise de clusters
    const clusterButton = L.control({ position: 'topright' });
    clusterButton.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-control');
        div.innerHTML = '<button class="btn btn-primary" id="showClustersBtn">Mostrar Clusters</button>';
        return div;
    };
    clusterButton.addTo(globalMap);
    
    // Adicionar listener ao botão
    setTimeout(() => {
        document.getElementById('showClustersBtn').addEventListener('click', function() {
            // Verificar se o módulo de análise de clusters está disponível
            if (window.clusterAnalysis) {
                const selectedVaccine = document.getElementById('vaccineSelect').value || 'bcg';
                const clusterResults = window.clusterAnalysis.identifyLowCoverageClusters(globalData, selectedVaccine);
                
                // Definir cores para clusters
                const clusterColors = [
                    '#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33F0',
                    '#33FFF0', '#F0FF33', '#FF3333', '#33FF33', '#3333FF'
                ];
                
                window.clusterAnalysis.visualizeClusters(globalMap, clusterResults, clusterColors);
            } else {
                alert('Módulo de análise de clusters não disponível.');
            }
        });
    }, 500);
}

// Função para adicionar legenda ao mapa
function addMapLegend() {
    // Remover legenda existente
    if (window.mapLegend) {
        globalMap.removeControl(window.mapLegend);
    }
    
    // Criar nova legenda
    window.mapLegend = L.control({ position: 'bottomright' });
    
    window.mapLegend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
        
        const selectedVaccine = document.getElementById('vaccineSelect').value || 'bcg';
        div.innerHTML = `<h6>Cobertura ${getVaccineName(selectedVaccine)}</h6>`;
        
        const grades = [0, 70, 80, 90, 100];
   
(Content truncated due to size limit. Use line ranges to read in chunks)
