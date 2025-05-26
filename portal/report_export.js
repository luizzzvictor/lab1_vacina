/**
 * Módulo de Exportação de Relatórios para o Portal de Cobertura Vacinal
 * 
 * Este módulo implementa funcionalidades para exportação de relatórios
 * personalizados em diferentes formatos (PDF, Excel).
 */

// Configurações para exportação de relatórios
const reportConfig = {
    pageSize: 'a4',
    orientation: 'portrait',
    margins: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40
    },
    headerHeight: 30,
    footerHeight: 30,
    maxChartsPerPage: 2,
    defaultTitle: 'Relatório de Cobertura Vacinal',
    defaultSubtitle: 'Gerado pelo Portal de Análise de Cobertura Vacinal',
    defaultFooter: 'Página {page} de {pages}',
    logoUrl: '/static/img/logo.png'
};

// Função para exportar relatório em PDF
function exportToPDF(reportData) {
    // Verificar dados do relatório
    if (!reportData || !reportData.title || !reportData.sections || reportData.sections.length === 0) {
        console.error('Dados insuficientes para gerar relatório PDF');
        return false;
    }

    // Inicializar documento PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: reportConfig.orientation,
        unit: 'mm',
        format: reportConfig.pageSize
    });

    // Configurar margens
    const margins = reportConfig.margins;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margins.left - margins.right;
    const contentHeight = pageHeight - margins.top - margins.bottom - reportConfig.headerHeight - reportConfig.footerHeight;

    // Adicionar cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(reportData.title, pageWidth / 2, margins.top, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(reportData.subtitle || reportConfig.defaultSubtitle, pageWidth / 2, margins.top + 10, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, margins.top + 18, { align: 'center' });

    // Adicionar rodapé em todas as páginas
    const totalPages = Math.ceil(reportData.sections.length / reportConfig.maxChartsPerPage) + 1;
    
    const addFooter = (pageNumber) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        const footer = (reportData.footer || reportConfig.defaultFooter)
            .replace('{page}', pageNumber)
            .replace('{pages}', totalPages);
        doc.text(footer, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    // Adicionar conteúdo do relatório
    let currentY = margins.top + reportConfig.headerHeight;
    let currentPage = 1;

    // Adicionar texto introdutório
    if (reportData.introduction) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const splitIntro = doc.splitTextToSize(reportData.introduction, contentWidth);
        
        if (currentY + splitIntro.length * 7 > pageHeight - margins.bottom - reportConfig.footerHeight) {
            // Adicionar rodapé na página atual
            addFooter(currentPage);
            
            // Nova página
            doc.addPage();
            currentPage++;
            currentY = margins.top;
        }
        
        doc.text(splitIntro, margins.left, currentY);
        currentY += splitIntro.length * 7 + 10;
    }

    // Adicionar seções com gráficos e tabelas
    for (let i = 0; i < reportData.sections.length; i++) {
        const section = reportData.sections[i];
        
        // Verificar se precisa de nova página
        if (i > 0 && i % reportConfig.maxChartsPerPage === 0) {
            // Adicionar rodapé na página atual
            addFooter(currentPage);
            
            // Nova página
            doc.addPage();
            currentPage++;
            currentY = margins.top;
        }
        
        // Adicionar título da seção
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(section.title, margins.left, currentY);
        currentY += 10;
        
        // Adicionar descrição da seção
        if (section.description) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            
            const splitDesc = doc.splitTextToSize(section.description, contentWidth);
            doc.text(splitDesc, margins.left, currentY);
            currentY += splitDesc.length * 5 + 5;
        }
        
        // Adicionar gráfico (como imagem)
        if (section.chartCanvas) {
            try {
                const imgData = section.chartCanvas.toDataURL('image/png');
                const imgWidth = contentWidth;
                const imgHeight = 80; // Altura fixa para gráficos
                
                doc.addImage(imgData, 'PNG', margins.left, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 15;
            } catch (e) {
                console.error('Erro ao adicionar gráfico ao PDF:', e);
            }
        }
        
        // Adicionar tabela de dados
        if (section.tableData && section.tableData.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            // Configurar tabela
            const tableHeaders = Object.keys(section.tableData[0]);
            const tableRows = section.tableData.map(row => Object.values(row));
            
            // Calcular larguras das colunas
            const colWidths = tableHeaders.map(header => {
                return Math.min(contentWidth / tableHeaders.length, header.length * 5 + 10);
            });
            
            // Desenhar cabeçalho da tabela
            doc.setFont('helvetica', 'bold');
            let tableX = margins.left;
            for (let h = 0; h < tableHeaders.length; h++) {
                doc.rect(tableX, currentY, colWidths[h], 10);
                doc.text(tableHeaders[h], tableX + 2, currentY + 6);
                tableX += colWidths[h];
            }
            currentY += 10;
            
            // Desenhar linhas da tabela
            doc.setFont('helvetica', 'normal');
            for (let r = 0; r < Math.min(tableRows.length, 10); r++) { // Limitar a 10 linhas
                tableX = margins.left;
                for (let c = 0; c < tableRows[r].length; c++) {
                    const cellValue = tableRows[r][c].toString();
                    doc.rect(tableX, currentY, colWidths[c], 8);
                    doc.text(cellValue, tableX + 2, currentY + 5);
                    tableX += colWidths[c];
                }
                currentY += 8;
            }
            
            // Adicionar nota se houver mais linhas
            if (tableRows.length > 10) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.text(`* Exibindo 10 de ${tableRows.length} linhas`, margins.left, currentY + 5);
                currentY += 10;
            } else {
                currentY += 5;
            }
        }
    }

    // Adicionar rodapé na última página
    addFooter(currentPage);

    // Salvar o PDF
    doc.save(`${reportData.title.replace(/\s+/g, '_')}.pdf`);
    return true;
}

// Função para exportar dados para Excel
function exportToExcel(data, filename) {
    if (!data || data.length === 0) {
        console.error('Dados insuficientes para exportar para Excel');
        return false;
    }

    // Usar SheetJS para criar planilha
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Adicionar planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    
    // Salvar arquivo
    XLSX.writeFile(wb, `${filename || 'dados_cobertura_vacinal'}.xlsx`);
    return true;
}

// Função para gerar relatório personalizado
function generateCustomReport(reportOptions, data) {
    // Verificar opções do relatório
    if (!reportOptions || !data || data.length === 0) {
        console.error('Opções ou dados insuficientes para gerar relatório');
        return null;
    }

    // Estrutura básica do relatório
    const report = {
        title: reportOptions.title || reportConfig.defaultTitle,
        subtitle: reportOptions.subtitle,
        introduction: reportOptions.introduction,
        footer: reportOptions.footer,
        sections: []
    };

    // Adicionar seção de visão geral
    if (reportOptions.includeOverview) {
        const overviewSection = {
            title: 'Visão Geral da Cobertura Vacinal',
            description: 'Esta seção apresenta uma visão geral da cobertura vacinal nos municípios analisados.',
            tableData: data.map(item => ({
                'Município': item.municipio,
                'UF': item.uf,
                'Região': item.regiao,
                'Tipo': item.tipo,
                'BCG (%)': item.bcg.toFixed(2),
                'Tríplice Viral (%)': item.triplice_viral_1.toFixed(2),
                'UBS': item.ubs_count,
                'População': item.populacao.toLocaleString('pt-BR')
            })).slice(0, 20) // Limitar a 20 municípios
        };
        
        report.sections.push(overviewSection);
    }

    // Adicionar seções específicas conforme selecionado
    if (reportOptions.sections) {
        reportOptions.sections.forEach(section => {
            if (section.chartCanvas) {
                report.sections.push({
                    title: section.title,
                    description: section.description,
                    chartCanvas: section.chartCanvas
                });
            }
        });
    }

    // Adicionar seção de análise regional se selecionada
    if (reportOptions.includeRegionalAnalysis) {
        // Agrupar dados por região
        const regionData = {};
        data.forEach(item => {
            if (!regionData[item.regiao]) {
                regionData[item.regiao] = {
                    count: 0,
                    bcg: 0,
                    dtp: 0,
                    penta: 0,
                    polio: 0,
                    triplice_viral_1: 0,
                    triplice_viral_2: 0,
                    varicela: 0
                };
            }
            
            regionData[item.regiao].count++;
            regionData[item.regiao].bcg += item.bcg;
            regionData[item.regiao].dtp += item.dtp;
            regionData[item.regiao].penta += item.penta;
            regionData[item.regiao].polio += item.polio;
            regionData[item.regiao].triplice_viral_1 += item.triplice_viral_1;
            regionData[item.regiao].triplice_viral_2 += item.triplice_viral_2;
            regionData[item.regiao].varicela += item.varicela;
        });
        
        // Calcular médias
        const regionTableData = Object.keys(regionData).map(region => ({
            'Região': region,
            'Municípios': regionData[region].count,
            'BCG (%)': (regionData[region].bcg / regionData[region].count).toFixed(2),
            'DTP (%)': (regionData[region].dtp / regionData[region].count).toFixed(2),
            'Penta (%)': (regionData[region].penta / regionData[region].count).toFixed(2),
            'Polio (%)': (regionData[region].polio / regionData[region].count).toFixed(2),
            'Tríplice Viral 1 (%)': (regionData[region].triplice_viral_1 / regionData[region].count).toFixed(2),
            'Tríplice Viral 2 (%)': (regionData[region].triplice_viral_2 / regionData[region].count).toFixed(2),
            'Varicela (%)': (regionData[region].varicela / regionData[region].count).toFixed(2)
        }));
        
        report.sections.push({
            title: 'Análise por Região',
            description: 'Esta seção apresenta a cobertura vacinal média por região geográfica.',
            tableData: regionTableData
        });
    }

    // Adicionar seção de análise por tipologia municipal se selecionada
    if (reportOptions.includeTypologyAnalysis) {
        // Agrupar dados por tipologia
        const typologyData = {};
        data.forEach(item => {
            if (!typologyData[item.tipo]) {
                typologyData[item.tipo] = {
                    count: 0,
                    bcg: 0,
                    dtp: 0,
                    penta: 0,
                    polio: 0,
                    triplice_viral_1: 0,
                    triplice_viral_2: 0,
                    varicela: 0
                };
            }
            
            typologyData[item.tipo].count++;
            typologyData[item.tipo].bcg += item.bcg;
            typologyData[item.tipo].dtp += item.dtp;
            typologyData[item.tipo].penta += item.penta;
            typologyData[item.tipo].polio += item.polio;
            typologyData[item.tipo].triplice_viral_1 += item.triplice_viral_1;
            typologyData[item.tipo].triplice_viral_2 += item.triplice_viral_2;
            typologyData[item.tipo].varicela += item.varicela;
        });
        
        // Calcular médias
        const typologyTableData = Object.keys(typologyData).map(type => ({
            'Tipologia': type,
            'Municípios': typologyData[type].count,
            'BCG (%)': (typologyData[type].bcg / typologyData[type].count).toFixed(2),
            'DTP (%)': (typologyData[type].dtp / typologyData[type].count).toFixed(2),
            'Penta (%)': (typologyData[type].penta / typologyData[type].count).toFixed(2),
            'Polio (%)': (typologyData[type].polio / typologyData[type].count).toFixed(2),
            'Tríplice Viral 1 (%)': (typologyData[type].triplice_viral_1 / typologyData[type].count).toFixed(2),
            'Tríplice Viral 2 (%)': (typologyData[type].triplice_viral_2 / typologyData[type].count).toFixed(2),
            'Varicela (%)': (typologyData[type].varicela / typologyData[type].count).toFixed(2)
        }));
        
        report.sections.push({
            title: 'Análise por Tipologia Municipal',
            description: 'Esta seção apresenta a cobertura vacinal média por tipologia municipal.',
            tableData: typologyTableData
        });
    }

    // Adicionar conclusões se fornecidas
    if (reportOptions.conclusions) {
        report.sections.push({
            title: 'Conclusões e Recomendações',
            description: reportOptions.conclusions
        });
    }

    return report;
}

// Função para configurar a interface de exportação de relatórios
function setupReportInterface(containerId, data) {
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
                        <h5>Configuração do Relatório</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label for="reportTitle" class="form-label">Título do Relatório</label>
                            <input type="text" class="form-control" id="reportTitle" value="Relatório de Cobertura Vacinal">
                        </div>
                        <div class="mb-3">
                            <label for="reportSubtitle" class="form-label">Subtítulo</label>
                            <input type="text" class="form-control" id="reportSubtitle" value="Análise Detalhada">
                        </div>
                        <div class="mb-3">
                            <label for="reportIntro" class="form-label">Introdução</label>
                            <textarea class="form-control" id="reportIntro" rows="3">Este relatório apresenta uma análise detalhada da cobertura vacinal nos municípios brasileiros, considerando diferentes vacinas, regiões geográficas 
(Content truncated due to size limit. Use line ranges to read in chunks)