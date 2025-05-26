import os
import sys

sys.path.insert(0, os.path.dirname(__file__))  # Updated path

import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Dict, List, Optional, Union

import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request, send_from_directory
from scipy import stats

app = Flask(__name__)

# Uncomment the following line if you need to use mysql
# app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.getenv('DB_USERNAME', 'root')}:{os.getenv('DB_PASSWORD', 'password')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'mydb')}"


# Add response models
@dataclass
class VaccineCoverage:
    municipio: str
    regiao: str
    tipo: str
    uf: str
    bcg: float
    dtp: float
    penta: float
    polio: float
    rotavirus: float
    triplice_viral_1: float
    triplice_viral_2: float
    varicela: float
    latitude: Optional[float]
    longitude: Optional[float]
    ubs_count: int
    populacao: float


@dataclass
class ApiResponse:
    status: str
    data: Union[Dict, List]
    message: Optional[str] = None
    timestamp: str = datetime.now().isoformat()


def create_response(data: Union[Dict, List], message: Optional[str] = None) -> Dict:
    """Create a standardized API response"""
    response_data = {
        "status": "success" if data is not None else "error",
        "data": data if data is not None else [],  # Return empty list instead of {}
        "message": message,
        "timestamp": datetime.now().isoformat(),
    }
    return response_data


# Carregando os dados
@app.route("/api/data")
def get_data():
    try:
        # Caminho para o arquivo JSON
        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        # Carregar os dados do JSON
        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            data = json.load(file)

        return jsonify(create_response(data))
    except Exception as e:
        return jsonify(create_response(None, str(e))), 500


@app.route("/api/summary")
def get_summary():
    try:
        summary_path = os.path.join(
            os.path.dirname(__file__),
            "pasted_content.txt",
        )

        if not os.path.exists(summary_path):
            summary = """# Resumo da Análise de Cobertura Vacinal

Este portal apresenta dados da cobertura vacinal em municípios brasileiros, permitindo análises geográficas, comparações entre regiões e tipologias municipais, e correlações entre infraestrutura de saúde e níveis de cobertura.

## Principais Observações

- Variação significativa na cobertura vacinal entre regiões
- Municípios com melhor estrutura de UBS tendem a ter melhores coberturas vacinais
- Regiões remotas apresentam desafios específicos
- Análise temporal demonstra progresso na maioria das regiões

Utilize os filtros e visualizações para explorar os dados em mais detalhes."""
        else:
            with open(summary_path, "r", encoding="utf-8") as file:
                summary = file.read()

        return jsonify(create_response({"summary": summary}))
    except Exception as e:
        print(f"Error in get_summary: {e}")
        return (
            jsonify(create_response({"summary": "Erro ao carregar resumo"}, str(e))),
            500,
        )


@app.route("/api/regions")
def get_regions():
    try:
        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            data = json.load(file)

        regions = sorted(list(set(item["Regiao"] for item in data if "Regiao" in item)))
        return jsonify(create_response(regions))
    except Exception as e:
        print(f"Error in get_regions: {e}")
        return jsonify(create_response([], str(e))), 500


@app.route("/api/municipality_types")
def get_municipality_types():
    try:
        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            data = json.load(file)

        types = sorted(
            list(set(item["Tipo_2017"] for item in data if "Tipo_2017" in item))
        )
        return jsonify(create_response(types))
    except Exception as e:
        print(f"Error in get_municipality_types: {e}")
        return jsonify(create_response([], str(e))), 500


@app.route("/api/vaccine_coverage")
def get_vaccine_coverage():
    try:
        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            data = json.load(file)

        region = request.args.get("region")
        mun_type = request.args.get("type")

        filtered_data = data
        if region:
            filtered_data = [
                item for item in filtered_data if item.get("Regiao") == region
            ]
        if mun_type:
            filtered_data = [
                item for item in filtered_data if item.get("Tipo_2017") == mun_type
            ]

        coverage_data = []
        for item in filtered_data:
            try:
                if "recortes_2anos" in item and item["recortes_2anos"]:
                    recorte = item["recortes_2anos"][0]
                    coverage_item = VaccineCoverage(
                        municipio=str(item.get("Nome_Município", "")),
                        regiao=str(item.get("Regiao", "")),
                        tipo=str(item.get("Tipo_2017", "")),
                        uf=str(item.get("Sigla_UF", "")),
                        bcg=get_vaccine_value(recorte, "BCG"),
                        dtp=get_vaccine_value(recorte, "DTP"),
                        penta=get_vaccine_value(recorte, "Penta (DTP/HepB/Hib)"),
                        polio=get_vaccine_value(recorte, "Polio Injetável (VIP)"),
                        rotavirus=get_vaccine_value(recorte, "Rotavírus"),
                        triplice_viral_1=get_vaccine_value(
                            recorte, "Tríplice Viral - 1° Dose"
                        ),
                        triplice_viral_2=get_vaccine_value(
                            recorte, "Tríplice Viral - 2° Dose"
                        ),
                        varicela=get_vaccine_value(recorte, "Varicela"),
                        latitude=get_latitude(item),
                        longitude=get_longitude(item),
                        ubs_count=len(item.get("UBS", [])),
                        populacao=float(
                            str(item.get("Pop_Estimada_2024", "0"))
                            .replace(".", "")
                            .replace(",", "")
                        ),
                    )
                    coverage_data.append(asdict(coverage_item))
            except Exception as e:
                print(f"Error processing item: {str(e)}")
                continue

        return jsonify(create_response(coverage_data))
    except Exception as e:
        print(f"Error in vaccine_coverage: {str(e)}")
        return jsonify(create_response([], str(e))), 500


# Helper function to get vaccine value, handling string conversion and error cases
def get_vaccine_value(data_dict, key, default_value=0.0):
    """Helper function to get vaccine value, handling string conversion and error cases"""
    if key in data_dict:
        try:
            value = data_dict[key]

            # Handle special values
            if isinstance(value, str):
                value = value.strip()
                if value in ["#N/D", "N/D", "N/A", "", "null", "undefined"]:
                    return default_value

                # Remove % signs if present
                value = value.replace("%", "").strip()

                # Convert comma to dot for decimal
                value = value.replace(",", ".")

            # Try to convert to float
            value = float(value)

            # Validate the value is reasonable
            if value < 0 or value > 200:  # Assuming coverage shouldn't exceed 200%
                return default_value

            return value
        except (ValueError, TypeError):
            pass
    return default_value


@app.route("/api/ubs_data")
def get_ubs_data():
    try:
        # Caminho para o arquivo JSON
        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        # Carregar os dados do JSON
        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            data = json.load(file)

        # Extrair dados de UBS
        ubs_data = []
        for item in data:
            try:
                if "UBS" in item:
                    for ubs in item["UBS"]:
                        # Tratar casos onde as coordenadas são strings com vírgula ao invés de ponto
                        lat_str = ubs.get("LATITUDE", "0")
                        lon_str = ubs.get("LONGITUDE", "0")
                        try:
                            latitude = float(str(lat_str).replace(",", "."))
                            longitude = float(str(lon_str).replace(",", "."))
                        except (ValueError, AttributeError):
                            latitude = 0.0
                            longitude = 0.0

                        ubs_data.append(
                            {
                                "cnes": str(ubs.get("CNES", "")),
                                "nome": str(ubs.get("NOME", "")),
                                "municipio": str(item.get("Nome_Município", "")),
                                "uf": str(item.get("Sigla_UF", "")),
                                "regiao": str(item.get("Regiao", "")),
                                "tipo_municipio": str(item.get("Tipo_2017", "")),
                                "latitude": latitude,
                                "longitude": longitude,
                                "logradouro": str(ubs.get("LOGRADOURO", "")),
                                "bairro": str(ubs.get("BAIRRO", "")),
                            }
                        )
            except Exception as e:
                print(f"Error processing UBS item: {e}")
                continue

        return jsonify(create_response(ubs_data))
    except Exception as e:
        print(f"Error in ubs_data: {e}")
        return jsonify(create_response(None, str(e))), 500


@app.route("/api/debug/recortes")
def debug_recortes():
    try:
        # Caminho para o arquivo JSON
        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        # Carregar os dados do JSON
        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            data = json.load(file)

        # Look for an item with recortes_2anos
        sample_data = []
        field_names = set()

        for item in data:
            if "recortes" in item and item["recortes"]:
                sample_data.append({"recortes": item["recortes"][0]})
                # Collect all field names from recortes
                for key in item["recortes"][0]:
                    field_names.add(key)

            if "recortes_2anos" in item and item["recortes_2anos"]:
                sample_data.append({"recortes_2anos": item["recortes_2anos"][0]})
                # Collect all field names from recortes_2anos
                for key in item["recortes_2anos"][0]:
                    field_names.add(key)

            # Limit sample size
            if len(sample_data) >= 2:
                break

        return jsonify(
            create_response(
                {
                    "field_names": list(field_names),
                    "sample_data": sample_data,
                    "nota": "Verifique qual campo contém os dados de vacinação (recortes ou recortes_2anos)",
                }
            )
        )
    except Exception as e:
        print(f"Error in debug_recortes: {e}")
        return jsonify(create_response(None, str(e))), 500


@app.route("/api/debug/first_item")
def debug_first_item():
    try:
        # Caminho para o arquivo JSON
        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        # Carregar os dados do JSON
        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            data = json.load(file)

        # Get the first item with recortes_2anos
        first_item = None
        for item in data:
            if "recortes_2anos" in item and item["recortes_2anos"]:
                recorte = item["recortes_2anos"][0]
                first_item = {
                    "municipio": str(item.get("Nome_Município", "")),
                    "regiao": str(item.get("Regiao", "")),
                    "tipo": str(item.get("Tipo_2017", "")),
                    "uf": str(item.get("Sigla_UF", "")),
                    "ubs_count": len(item.get("UBS", [])),
                    "populacao": item.get("Pop_Estimada_2024", "0"),
                    "recorte_keys": list(recorte.keys()),
                    "bcg": get_vaccine_value(recorte, "BCG"),
                    "dtp": get_vaccine_value(recorte, "DTP"),
                    "penta": get_vaccine_value(recorte, "Penta (DTP/HepB/Hib)"),
                    "polio": get_vaccine_value(recorte, "Polio Injetável (VIP)"),
                    "rotavirus": get_vaccine_value(recorte, "Rotavírus"),
                    "triplice_viral_1": get_vaccine_value(
                        recorte, "Tríplice Viral - 1° Dose"
                    ),
                    "triplice_viral_2": get_vaccine_value(
                        recorte, "Tríplice Viral - 2° Dose"
                    ),
                    "varicela": get_vaccine_value(recorte, "Varicela"),
                }
                break

        # Also get first item from vaccine_coverage API for comparison
        coverage_data = get_vaccine_coverage().json
        first_coverage_item = (
            coverage_data[0] if coverage_data and len(coverage_data) > 0 else None
        )

        return jsonify(
            create_response(
                {
                    "raw_recorte": first_item,
                    "api_result": first_coverage_item,
                    "selected_vaccine_in_ui": "rotavirus",  # Current selected value in UI
                }
            )
        )
    except Exception as e:
        print(f"Error in debug_first_item: {e}")
        return jsonify(create_response(None, str(e))), 500


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)


@app.route("/api/typology_matrix")
def get_typology_matrix():
    try:
        selected_vaccine = request.args.get("vaccine", "bcg")
        view_type = request.args.get("view", "typology")  # 'typology' or 'region'

        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            raw_data = json.load(file)

        # Process data for matrix visualization
        matrix_data = []
        typology_order = [
            "Urbano",
            "RuralAdjacente",
            "IntermediarioAdjacente",
            "RuralRemoto",
            "IntermediarioRemoto",
        ]
        region_order = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]

        vaccine_types = [
            "bcg",
            "dtp",
            "penta",
            "polio",
            "rotavirus",
            "triplice_viral_1",
            "triplice_viral_2",
            "varicela",
        ]

        # Group data by selected category (typology or region)
        category_groups = {}

        for item in raw_data:
            if "recortes_2anos" not in item or not item["recortes_2anos"]:
                continue

            category = None
            if view_type == "typology":
                category = item.get("Tipo_2017")
                if not category or category == "Não classificado":
                    continue
            else:  # region view
                category = item.get("Regiao")
                if not category:
                    continue

            if category not in category_groups:
                category_groups[category] = {
                    "coverage_sum": {v: 0.0 for v in vaccine_types},
                    "count": {v: 0 for v in vaccine_types},
                    "total_coverage": 0.0,  # For all vaccines average
                    "total_count": 0,  # For all vaccines average
                    "population": 0,
                    "ubs_count": 0,
                }

            recorte = item["recortes_2anos"][0]
            try:
                population = float(
                    str(item.get("Pop_Estimada_2024", "0"))
                    .replace(".", "")
                    .replace(",", "")
                )
            except (ValueError, TypeError):
                population = 0

            ubs_count = len(item.get("UBS", []))

            category_groups[category]["population"] += population
            category_groups[category]["ubs_count"] += ubs_count

            # Aggregate vaccine coverage data
            valid_coverages = []
            for vaccine in vaccine_types:
                coverage = get_vaccine_coverage_value(recorte, vaccine)
                if coverage is not None:
                    category_groups[category]["coverage_sum"][vaccine] += coverage
                    category_groups[category]["count"][vaccine] += 1
                    valid_coverages.append(coverage)

            # Calculate average for all vaccines
            if valid_coverages:
                category_groups[category]["total_coverage"] += sum(valid_coverages)
                category_groups[category]["total_count"] += len(valid_coverages)

        # Calculate averages and prepare matrix data
        category_list = typology_order if view_type == "typology" else region_order
        for category in category_list:
            if category in category_groups:
                data = category_groups[category]

                if selected_vaccine == "all":
                    # Calculate average across all vaccines
                    if data["total_count"] > 0:
                        avg_coverage = data["total_coverage"] / data["total_count"]
                        matrix_data.append(
                            {
                                "category": category,
                                "vaccine_type": "all",
                                "coverage_rate": round(avg_coverage, 2),
                                "population": int(data["population"]),
                                "ubs_count": data["ubs_count"],
                            }
                        )
                else:
                    # Individual vaccine data
                    for vaccine in vaccine_types:
                        count = data["count"][vaccine]
                        if count > 0:
                            avg_coverage = data["coverage_sum"][vaccine] / count
                            matrix_data.append(
                                {
                                    "category": category,
                                    "vaccine_type": vaccine,
                                    "coverage_rate": round(avg_coverage, 2),
                                    "population": int(data["population"]),
                                    "ubs_count": data["ubs_count"],
                                }
                            )

        # Calculate correlation matrix for the selected vaccine
        correlation_data = calculate_correlation_matrix(raw_data, selected_vaccine)

        response_data = {
            "matrix_data": matrix_data,
            "metadata": {
                "categories": category_list,
                "vaccine_types": (
                    ["all"] if selected_vaccine == "all" else vaccine_types
                ),
                "view_type": view_type,
                "statistics": {
                    "correlations": correlation_data,
                    "summaries": calculate_summaries(category_groups, vaccine_types),
                },
            },
        }

        return jsonify(create_response(response_data))
    except Exception as e:
        print(f"Error in typology_matrix: {str(e)}")
        return (
            jsonify(create_response({"matrix_data": [], "metadata": {}}, str(e))),
            500,
        )


def get_vaccine_coverage_value(recorte, vaccine_type):
    """Helper function to get vaccine coverage value from recorte data"""
    vaccine_mapping = {
        "bcg": "BCG",
        "dtp": "DTP",
        "penta": "Penta (DTP/HepB/Hib)",
        "polio": "Polio Injetável (VIP)",
        "rotavirus": "Rotavírus",
        "triplice_viral_1": "Tríplice Viral - 1° Dose",
        "triplice_viral_2": "Tríplice Viral - 2° Dose",
        "varicela": "Varicela",
    }

    if vaccine_type in vaccine_mapping:
        return get_vaccine_value(recorte, vaccine_mapping[vaccine_type])
    return None


def calculate_correlation_matrix(raw_data, selected_vaccine):
    """Calculate correlation matrix for the selected vaccine across typologies"""
    try:
        # Prepare data for correlation analysis
        df_data = []
        for item in raw_data:
            if "recortes_2anos" in item and item["recortes_2anos"]:
                recorte = item["recortes_2anos"][0]
                coverage = get_vaccine_coverage_value(recorte, selected_vaccine)
                if coverage is not None:
                    population = float(
                        str(item.get("Pop_Estimada_2024", "0"))
                        .replace(".", "")
                        .replace(",", "")
                    )
                    ubs_count = len(item.get("UBS", []))
                    ubs_per_10k = (
                        (ubs_count / population * 10000) if population > 0 else 0
                    )

                    df_data.append(
                        {
                            "coverage": coverage,
                            "population": population,
                            "ubs_per_10k": ubs_per_10k,
                            "typology": item.get("Tipo_2017", "Unknown"),
                        }
                    )

        if not df_data:
            return {}

        df = pd.DataFrame(df_data)
        correlation_matrix = df[["coverage", "population", "ubs_per_10k"]].corr()

        return {
            "coverage_vs_population": round(
                correlation_matrix.loc["coverage", "population"], 3
            ),
            "coverage_vs_ubs": round(
                correlation_matrix.loc["coverage", "ubs_per_10k"], 3
            ),
            "ubs_vs_population": round(
                correlation_matrix.loc["population", "ubs_per_10k"], 3
            ),
        }
    except Exception as e:
        print(f"Error calculating correlation matrix: {e}")
        return {}


def calculate_summaries(typology_groups, vaccine_types):
    """Calculate summary statistics for each typology"""
    summaries = {}

    for typology, data in typology_groups.items():
        summary = {
            "total_population": int(data["population"]),
            "total_ubs": data["ubs_count"],
            "ubs_per_10k": round(
                (
                    (data["ubs_count"] / data["population"] * 10000)
                    if data["population"] > 0
                    else 0
                ),
                2,
            ),
            "average_coverage": {},
        }

        for vaccine in vaccine_types:
            count = data["count"][vaccine]
            if count > 0:
                avg_coverage = data["coverage_sum"][vaccine] / count
                summary["average_coverage"][vaccine] = round(avg_coverage, 2)

        summaries[typology] = summary

    return summaries


def calculate_statistics(data_series):
    """Calculate basic statistical measures for a data series"""
    if len(data_series) == 0:
        return {"mean": 0, "median": 0, "std": 0, "ci_lower": 0, "ci_upper": 0}

    mean = np.mean(data_series)
    median = np.median(data_series)
    std = np.std(data_series)

    # Calculate 95% confidence interval
    ci = (
        stats.t.interval(
            alpha=0.95, df=len(data_series) - 1, loc=mean, scale=stats.sem(data_series)
        )
        if len(data_series) > 1
        else (mean, mean)
    )

    return {
        "mean": round(mean, 2),
        "median": round(median, 2),
        "std": round(std, 2),
        "ci_lower": round(ci[0], 2),
        "ci_upper": round(ci[1], 2),
    }


def analyze_coverage_trends(data, vaccine_type):
    """Analyze coverage trends by typology"""
    df_data = []
    for item in data:
        if "recortes_2anos" in item and item["recortes_2anos"]:
            recorte = item["recortes_2anos"][0]
            coverage = get_vaccine_coverage_value(recorte, vaccine_type)
            if coverage is not None:
                df_data.append(
                    {
                        "coverage": coverage,
                        "typology": item.get("Tipo_2017", "Unknown"),
                        "region": item.get("Regiao", "Unknown"),
                        "population": float(
                            str(item.get("Pop_Estimada_2024", "0"))
                            .replace(".", "")
                            .replace(",", "")
                        ),
                        "ubs_count": len(item.get("UBS", [])),
                    }
                )

    if not df_data:
        return {}

    df = pd.DataFrame(df_data)

    # Analysis by typology
    typology_analysis = {}
    for typology in df["typology"].unique():
        typology_data = df[df["typology"] == typology]["coverage"]
        typology_analysis[typology] = calculate_statistics(typology_data)

    # Regional analysis
    regional_analysis = {}
    for region in df["region"].unique():
        region_data = df[df["region"] == region]["coverage"]
        regional_analysis[region] = calculate_statistics(region_data)

    # Calculate correlations
    correlations = {
        "coverage_vs_ubs_density": round(
            df["coverage"].corr(df["ubs_count"] / df["population"] * 10000), 3
        ),
        "coverage_vs_population": round(df["coverage"].corr(df["population"]), 3),
    }

    # Identify outliers using IQR method
    Q1 = df["coverage"].quantile(0.25)
    Q3 = df["coverage"].quantile(0.75)
    IQR = Q3 - Q1
    outliers = df[
        (df["coverage"] < (Q1 - 1.5 * IQR)) | (df["coverage"] > (Q3 + 1.5 * IQR))
    ][["coverage", "typology", "region"]].to_dict("records")

    return {
        "typology_analysis": typology_analysis,
        "regional_analysis": regional_analysis,
        "correlations": correlations,
        "outliers": outliers,
        "summary_stats": calculate_statistics(df["coverage"]),
        "sample_size": len(df),
    }


@app.route("/api/coverage_analysis")
def get_coverage_analysis():
    """Endpoint for detailed coverage analysis"""
    try:
        selected_vaccine = request.args.get("vaccine", "bcg")

        # Load data
        data_path = os.path.join(os.path.dirname(__file__), "output.json")

        with open(data_path, "r", encoding="utf-8", errors="ignore") as file:
            data = json.load(file)

        # Perform analysis
        analysis_results = analyze_coverage_trends(data, selected_vaccine)

        return jsonify(
            create_response({"data": analysis_results, "vaccine": selected_vaccine})
        )

    except Exception as e:
        print(f"Error in coverage_analysis: {e}")
        return jsonify(create_response(None, str(e))), 500


def get_latitude(item):
    """Extract latitude from the first UBS in the item"""
    if "UBS" in item and item["UBS"]:
        lat_str = item["UBS"][0].get("LATITUDE", "")
        if lat_str:
            try:
                return float(str(lat_str).replace(",", "."))
            except (ValueError, TypeError):
                return None
    return None


def get_longitude(item):
    """Extract longitude from the first UBS in the item"""
    if "UBS" in item and item["UBS"]:
        lon_str = item["UBS"][0].get("LONGITUDE", "")
        if lon_str:
            try:
                return float(str(lon_str).replace(",", "."))
            except (ValueError, TypeError):
                return None
    return None


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
