/**
 * Módulo de Consultas Personalizadas para o Portal de Cobertura Vacinal
 * 
 * Este módulo implementa um construtor de consultas que permite aos usuários
 * criar suas próprias análises combinando diferentes variáveis e filtros.
 */

// Configurações para o construtor de consultas
const queryBuilderConfig = {
    maxFilters: 5, // Número máximo de filtros permitidos
    maxFields: 10, // Número máximo de campos para exibição
    defaultLimit: 100, // Limite padrão de resultados
    operators: {
        numeric: ['=', '>', '<', '>=', '<=', '!='],
        text: ['contém', 'começa com', 'termina com', 'igual a', 'diferente de'],
        categorical: ['igual a', 'diferente de']
    }
};

// Definição dos campos disponíveis para consulta
const availableFields = [
    { id: 'municipio', name: 'Município', type: 'text', filterable: true, displayable: true },
    { id: 'uf', name: 'UF', type: 'categorical', filterable: true, displayable: true },
    { id: 'regiao', name: 'Região', type: 'categorical', filterable: true, displayable: true },
    { id: 'tipo', name: 'Tipologia Municipal', type: 'categorical', filterable: true, displayable: true },
    { id: 'populacao', name: 'População', type: 'numeric', filterable: true, displayable: true },
    { id: 'ubs_count', name: 'Quantidade de UBS', type: 'numeric', filterable: true, displayable: true },
    { id: 'bcg', name: 'Cobertura BCG (%)', type: 'numeric', filterable: true, displayable: true },
    { id: 'dtp', name: 'Cobertura DTP (%)', type: 'numeric', filterable: true, displayable: true },
    { id: 'penta', name: 'Cobertura Penta (%)', type: 'numeric', filterable: true, displayable: true },
    { id: 'polio', name: 'Cobertura Polio (%)', type: 'numeric', filterable: true, displayable: true },
    { id: 'rotavirus', name: 'Cobertura Rotavírus (%)', type: 'numeric', filterable: true, displayable: true },
    { id: 'triplice_viral_1', name: 'Cobertura Tríplice Viral 1ª dose (%)', type: 'numeric', filterable: true, displayable: true },
    { id: 'triplice_viral_2', name: 'Cobertura Tríplice Viral 2ª dose (%)', type: 'numeric', filterable: true, displayable: true },
    { id: 'varicela', name: 'Cobertura Varicela (%)', type: 'numeric', filterable: true, displayable: true },
    { id: 'latitude', name: 'Latitude', type: 'numeric', filterable: false, displayable: true },
    { id: 'longitude', name: 'Longitude', type: 'numeric', filterable: false, displayable: true }
];

// Função para executar consulta personalizada
function executeCustomQuery(data, queryParams) {
    // Verificar parâmetros da consulta
    if (!queryParams || !queryParams.filters || !queryParams.displayFields) {
        console.error('Parâmetros de consulta inválidos');
        return { success: false, error: 'Parâmetros de consulta inválidos' };
    }

    // Aplicar filtros
    let filteredData = [...data];
    
    queryParams.filters.forEach(filter => {
        if (!filter.field || !filter.operator || filter.value === undefined) {
            return; // Ignorar filtros incompletos
        }
        
        const field = availableFields.find(f => f.id === filter.field);
        if (!field || !field.filterable) {
            return; // Ignorar campos não filtráveis
        }
        
        filteredData = filteredData.filter(item => {
            const itemValue = item[filter.field];
            
            // Aplicar operador de acordo com o tipo de campo
            if (field.type === 'numeric') {
                const numValue = parseFloat(filter.value);
                const numItemValue = parseFloat(itemValue);
                
                switch (filter.operator) {
                    case '=': return numItemValue === numValue;
                    case '>': return numItemValue > numValue;
                    case '<': return numItemValue < numValue;
                    case '>=': return numItemValue >= numValue;
                    case '<=': return numItemValue <= numValue;
                    case '!=': return numItemValue !== numValue;
                    default: return true;
                }
            } else if (field.type === 'text') {
                const strValue = String(filter.value).toLowerCase();
                const strItemValue = String(itemValue).toLowerCase();
                
                switch (filter.operator) {
                    case 'contém': return strItemValue.includes(strValue);
                    case 'começa com': return strItemValue.startsWith(strValue);
                    case 'termina com': return strItemValue.endsWith(strValue);
                    case 'igual a': return strItemValue === strValue;
                    case 'diferente de': return strItemValue !== strValue;
                    default: return true;
                }
            } else if (field.type === 'categorical') {
                const strValue = String(filter.value);
                const strItemValue = String(itemValue);
                
                switch (filter.operator) {
                    case 'igual a': return strItemValue === strValue;
                    case 'diferente de': return strItemValue !== strValue;
                    default: return true;
                }
            }
            
            return true;
        });
    });
    
    // Aplicar ordenação
    if (queryParams.sortField) {
        const sortField = queryParams.sortField;
        const sortDirection = queryParams.sortDirection || 'asc';
        
        filteredData.sort((a, b) => {
            let valueA = a[sortField];
            let valueB = b[sortField];
            
            // Converter para número se for campo numérico
            const field = availableFields.find(f => f.id === sortField);
            if (field && field.type === 'numeric') {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
            } else {
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
            }
            
            if (sortDirection === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        });
    }
    
    // Aplicar limite
    const limit = queryParams.limit || queryBuilderConfig.defaultLimit;
    const limitedData = filteredData.slice(0, limit);
    
    // Preparar resultados com apenas os campos selecionados para exibição
    const results = limitedData.map(item => {
        const result = {};
        queryParams.displayFields.forEach(fieldId => {
            const field = availableFields.find(f => f.id === fieldId);
            if (field && field.displayable) {
                result[fieldId] = item[fieldId];
            }
        });
        return result;
    });
    
    return {
        success: true,
        totalResults: filteredData.length,
        displayedResults: results.length,
        results: results
    };
}

// Função para obter valores únicos de um campo
function getUniqueFieldValues(data, fieldId) {
    const field = availableFields.find(f => f.id === fieldId);
    if (!field) {
        return [];
    }
    
    const values = [...new Set(data.map(item => item[fieldId]))].filter(Boolean);
    
    // Ordenar valores
    if (field.type === 'numeric') {
        values.sort((a, b) => parseFloat(a) - parseFloat(b));
    } else {
        values.sort();
    }
    
    return values;
}

// Função para visualizar resultados da consulta
function visualizeQueryResults(tableElement, chartElement, queryResults) {
    if (!queryResults.success) {
        console.error(queryResults.error);
        tableElement.innerHTML = `<div class="alert alert-danger">${queryResults.error}</div>`;
        return;
    }
    
    // Exibir resultados em tabela
    if (queryResults.results.length === 0) {
        tableElement.innerHTML = '<div class="alert alert-info">Nenhum resultado encontrado para os critérios selecionados.</div>';
        return;
    }
    
    // Criar cabeçalho da tabela
    const headers = Object.keys(queryResults.results[0]);
    
    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        ${headers.map(header => {
                            const field = availableFields.find(f => f.id === header);
                            return `<th>${field ? field.name : header}</th>`;
                        }).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Adicionar linhas da tabela
    queryResults.results.forEach(row => {
        tableHtml += '<tr>';
        headers.forEach(header => {
            let cellValue = row[header];
            
            // Formatar valores numéricos
            const field = availableFields.find(f => f.id === header);
            if (field && field.type === 'numeric') {
                if (header === 'populacao') {
                    cellValue = parseInt(cellValue).toLocaleString('pt-BR');
                } else if (header.includes('cobertura') || header === 'bcg' || header === 'dtp' || 
                           header === 'penta' || header === 'polio' || header === 'rotavirus' || 
                           header.includes('triplice') || header === 'varicela') {
                    cellValue = parseFloat(cellValue).toFixed(2) + '%';
                } else if (header === 'latitude' || header === 'longitude') {
                    cellValue = parseFloat(cellValue).toFixed(6);
                } else {
                    cellValue = parseFloat(cellValue).toFixed(2);
                }
            }
            
            tableHtml += `<td>${cellValue}</td>`;
        });
        tableHtml += '</tr>';
    });
    
    tableHtml += `
                </tbody>
            </table>
        </div>
        <div class="d-flex justify-content-between align-items-center">
            <p>Exibindo ${queryResults.results.length} de ${queryResults.totalResults} resultados</p>
            <button class="btn btn-sm btn-outline-secondary" id="exportQueryResults">Exportar Resultados</button>
        </div>
    `;
    
    tableElement.innerHTML = tableHtml;
    
    // Adicionar listener para exportação
    document.getElementById('exportQueryResults').addEventListener('click', () => {
        if (window.reportExport && window.reportExport.exportToExcel) {
            window.reportExport.exportToExcel(queryResults.results, 'resultados_consulta_personalizada');
        } else {
            alert('Módulo de exportação não disponível. Certifique-se de que o módulo de relatórios está carregado.');
        }
    });
    
    // Visualizar gráfico se houver campos numéricos nos resultados
    if (chartElement) {
        const numericFields = headers.filter(header => {
            const field = availableFields.find(f => f.id === header);
            return field && field.type === 'numeric';
        });
        
        if (numericFields.length > 0 && queryResults.results.length > 0) {
            // Limpar gráfico anterior se existir
            if (window.queryResultsChart) {
                window.queryResultsChart.destroy();
            }
            
            // Selecionar campo para visualização (primeiro campo numérico)
            const visualField = numericFields[0];
            const fieldName = availableFields.find(f => f.id === visualField).name;
            
            // Selecionar campo para rótulos (primeiro campo não numérico)
            const labelField = headers.find(header => {
                const field = availableFields.find(f => f.id === header);
                return field && field.type !== 'numeric';
            }) || headers[0];
            
            // Limitar a 20 resultados para melhor visualização
            const chartData = queryResults.results.slice(0, 20);
            
            const ctx = chartElement.getContext('2d');
            window.queryResultsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.map(item => item[labelField]),
                    datasets: [{
                        label: fieldName,
                        data: chartData.map(item => parseFloat(item[visualField])),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
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
                                text: fieldName
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: availableFields.find(f => f.id === labelField).name
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        },
                        title: {
                            display: true,
                            text: 'Visualização dos Resultados da Consulta'
                        }
                    }
                }
            });
        } else {
            chartElement.innerHTML = '<div class="alert alert-info">Não há campos numéricos para visualização gráfica.</div>';
        }
    }
}

// Função para configurar a interface do construtor de consultas
function setupQueryBuilderInterface(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container com ID ${containerId} não encontrado.`);
        return;
    }

    // Limpar container
    container.innerHTML = 
        `<div class="row">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h5>Construtor de Consultas</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Filtros</label>
                            <div id="filtersContainer">
                                <!-- Filtros serão adicionados aqui dinamicamente -->
                            </div>
                            <button class="btn btn-sm btn-outline-primary mt-2" id="addFilterBtn">Adicionar Filtro</button>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Campos para Exibição</label>
                            <div id="fieldsContainer" class="border p-2 rounded">
                                <!-- Checkboxes para campos serão adicionados aqui -->
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="sortFieldSelect" class="form-label">Ordenar por</label>
                            <div class="input-group">
                                <select class="form-select" id="sortFieldSelect">
                                    <option value="">Sem ordenação</option>
                                </select>
                                <select class="form-select" id="sortDirectionSelect">
                                    <option value="asc">Crescente</option>
                                    <option value="desc">Decrescente</option>
                                </select>
                            </div>
                  
(Content truncated due to size limit. Use line ranges to read in chunks)