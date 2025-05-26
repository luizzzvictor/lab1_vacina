/**
 * Módulo de Análise de Clusters para o Portal de Cobertura Vacinal
 * 
 * Este módulo implementa algoritmos de clustering espacial para identificar
 * áreas geográficas com concentração de baixa cobertura vacinal.
 */

// Configurações do algoritmo de clustering
const clusterConfig = {
    epsilon: 50, // Distância máxima entre pontos para formar um cluster (em km)
    minPoints: 3, // Número mínimo de pontos para formar um cluster
    maxClusters: 10, // Número máximo de clusters a serem exibidos
    lowCoverageThreshold: 85 // Limiar para considerar baixa cobertura (%)
};

// Implementação do algoritmo DBSCAN para clustering espacial
function dbscan(points, epsilon, minPoints) {
    const clusters = [];
    const visited = new Set();
    const noise = [];

    // Função para calcular a distância entre dois pontos (Haversine)
    function distance(p1, p2) {
        const toRad = (value) => value * Math.PI / 180;
        const R = 6371; // Raio da Terra em km
        const dLat = toRad(p2.lat - p1.lat);
        const dLon = toRad(p2.lng - p1.lng);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Função para encontrar pontos vizinhos dentro do raio epsilon
    function getNeighbors(point, points, epsilon) {
        return points.filter(p => p !== point && distance(point, p) <= epsilon);
    }

    // Função para expandir um cluster
    function expandCluster(point, neighbors, cluster) {
        cluster.push(point);
        
        for (let i = 0; i < neighbors.length; i++) {
            const neighbor = neighbors[i];
            
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                const neighborNeighbors = getNeighbors(neighbor, points, epsilon);
                
                if (neighborNeighbors.length >= minPoints) {
                    neighbors.push(...neighborNeighbors.filter(n => !visited.has(n)));
                }
            }
            
            let isInCluster = false;
            for (const c of clusters) {
                if (c.includes(neighbor)) {
                    isInCluster = true;
                    break;
                }
            }
            
            if (!isInCluster) {
                cluster.push(neighbor);
            }
        }
    }

    // Algoritmo principal DBSCAN
    for (const point of points) {
        if (visited.has(point)) continue;
        
        visited.add(point);
        const neighbors = getNeighbors(point, points, epsilon);
        
        if (neighbors.length < minPoints) {
            noise.push(point);
        } else {
            const cluster = [];
            clusters.push(cluster);
            expandCluster(point, neighbors, cluster);
        }
    }

    return { clusters, noise };
}

// Função para identificar clusters de baixa cobertura vacinal
function identifyLowCoverageClusters(data, vaccineType) {
    // Filtrar pontos com baixa cobertura
    const lowCoveragePoints = data.filter(item => 
        item[vaccineType] < clusterConfig.lowCoverageThreshold && 
        item.latitude && 
        item.longitude
    ).map(item => ({
        lat: item.latitude,
        lng: item.longitude,
        coverage: item[vaccineType],
        municipio: item.municipio,
        regiao: item.regiao,
        tipo: item.tipo,
        ubs_count: item.ubs_count,
        populacao: item.populacao
    }));

    // Aplicar algoritmo DBSCAN para clustering
    const { clusters, noise } = dbscan(
        lowCoveragePoints, 
        clusterConfig.epsilon, 
        clusterConfig.minPoints
    );

    // Ordenar clusters por tamanho (do maior para o menor)
    clusters.sort((a, b) => b.length - a.length);

    // Limitar o número de clusters retornados
    const topClusters = clusters.slice(0, clusterConfig.maxClusters);

    return {
        clusters: topClusters,
        noise: noise,
        totalLowCoveragePoints: lowCoveragePoints.length
    };
}

// Função para visualizar clusters no mapa
function visualizeClusters(map, clusterResults, colors) {
    // Limpar camadas existentes de clusters
    if (window.clusterLayers) {
        window.clusterLayers.forEach(layer => map.removeLayer(layer));
    }
    window.clusterLayers = [];

    // Adicionar clusters ao mapa
    clusterResults.clusters.forEach((cluster, index) => {
        const color = colors[index % colors.length];
        
        // Criar polígono convexo para o cluster
        const points = cluster.map(point => [point.lat, point.lng]);
        const hull = d3.polygonHull(points);
        
        if (hull) {
            const polygon = L.polygon(hull, {
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                weight: 2
            }).addTo(map);
            
            // Adicionar popup com informações do cluster
            const avgCoverage = cluster.reduce((sum, point) => sum + point.coverage, 0) / cluster.length;
            polygon.bindPopup(`
                <strong>Cluster #${index + 1}</strong><br>
                Municípios: ${cluster.length}<br>
                Cobertura média: ${avgCoverage.toFixed(2)}%<br>
                Região predominante: ${getMostFrequent(cluster.map(p => p.regiao))}<br>
                Tipo predominante: ${getMostFrequent(cluster.map(p => p.tipo))}
            `);
            
            window.clusterLayers.push(polygon);
        }
        
        // Adicionar marcadores para cada ponto no cluster
        cluster.forEach(point => {
            const marker = L.circleMarker([point.lat, point.lng], {
                radius: 6,
                fillColor: color,
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            
            marker.bindPopup(`
                <strong>${point.municipio}</strong><br>
                Cobertura: ${point.coverage.toFixed(2)}%<br>
                Região: ${point.regiao}<br>
                Tipo: ${point.tipo}<br>
                UBS: ${point.ubs_count}<br>
                População: ${point.populacao.toLocaleString('pt-BR')}
            `);
            
            window.clusterLayers.push(marker);
        });
    });

    // Adicionar pontos de ruído (não agrupados) ao mapa
    clusterResults.noise.forEach(point => {
        const marker = L.circleMarker([point.lat, point.lng], {
            radius: 4,
            fillColor: '#999',
            color: '#000',
            weight: 1,
            opacity: 0.7,
            fillOpacity: 0.5
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>${point.municipio}</strong><br>
            Cobertura: ${point.coverage.toFixed(2)}%<br>
            Região: ${point.regiao}<br>
            Tipo: ${point.tipo}<br>
            UBS: ${point.ubs_count}<br>
            População: ${point.populacao.toLocaleString('pt-BR')}
        `);
        
        window.clusterLayers.push(marker);
    });

    // Adicionar legenda para clusters
    if (clusterResults.clusters.length > 0) {
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'info legend');
            div.style.backgroundColor = 'white';
            div.style.padding = '10px';
            div.style.borderRadius = '5px';
            div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
            
            div.innerHTML = '<h4>Clusters de Baixa Cobertura</h4>';
            
            clusterResults.clusters.forEach((cluster, index) => {
                const color = colors[index % colors.length];
                div.innerHTML += `<i style="background:${color}; width:10px; height:10px; display:inline-block; margin-right:5px;"></i> Cluster #${index + 1} (${cluster.length} municípios)<br>`;
            });
            
            div.innerHTML += `<i style="background:#999; width:10px; height:10px; display:inline-block; margin-right:5px;"></i> Pontos isolados (${clusterResults.noise.length})<br>`;
            
            return div;
        };
        
        legend.addTo(map);
        window.clusterLayers.push(legend);
    }
}

// Função auxiliar para obter o valor mais frequente em um array
function getMostFrequent(arr) {
    const counts = {};
    let maxCount = 0;
    let maxItem = null;
    
    for (const item of arr) {
        counts[item] = (counts[item] || 0) + 1;
        if (counts[item] > maxCount) {
            maxCount = counts[item];
            maxItem = item;
        }
    }
    
    return maxItem;
}

// Exportar funções para uso global
window.clusterAnalysis = {
    identifyLowCoverageClusters,
    visualizeClusters
};
