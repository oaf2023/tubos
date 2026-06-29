"""
GasTrack AR — OR-Tools VRP Microservice
Multi-vehicle route optimization with capacity and time windows.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from ortools.constraint_solver import routing_enums_pb2, pywrapcp

app = FastAPI(title="GasTrack VRP", version="1.0.0")


class Punto(BaseModel):
    id: str
    lat: float
    lng: float
    demandaTubos: int = 0
    ventanaDesde: Optional[int] = None
    ventanaHasta: Optional[int] = None
    tiempoServicioMin: int = 0
    prioridad: int = 5


class Vehiculo(BaseModel):
    id: str
    capacidadTubos: int = 999
    costoPorKm: float = 1.0


class VrpRequest(BaseModel):
    origen: Punto
    paradas: list[Punto]
    vehiculos: list[Vehiculo]
    distanciaMatrix: list[list[float]]


class ParadaAsignada(BaseModel):
    id: str
    orden: int
    lat: float
    lng: float
    demandaTubos: int = 0
    horaPrevistaLlegada: Optional[int] = None
    horaPrevistaSalida: Optional[int] = None
    distanciaDesdeAnterior: float = 0


class RutaOptimizada(BaseModel):
    vehiculoId: str
    paradas: list[ParadaAsignada]
    distanciaKm: float = 0
    duracionMin: float = 0


class VrpResponse(BaseModel):
    rutas: list[RutaOptimizada]
    distanciaTotal: float = 0
    duracionEstimada: float = 0
    numVehiculosUsados: int = 0


@app.get("/health")
def health():
    return {"status": "ok", "service": "or-tools-vrp"}


@app.post("/vrp", response_model=VrpResponse)
def solve_vrp(req: VrpRequest):
    puntos = [req.origen] + req.paradas
    n = len(puntos)
    num_vehicles = len(req.vehiculos)
    matrix = req.distanciaMatrix

    if n < 2 or num_vehicles < 1:
        raise HTTPException(400, "Se requieren al menos 2 puntos y 1 vehículo")

    # OR-Tools routing model
    manager = pywrapcp.RoutingIndexManager(n, num_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    # Distance callback
    def distance_callback(from_idx, to_idx):
        return int(matrix[manager.IndexToNode(from_idx)][manager.IndexToNode(to_idx)] * 1000)

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Capacity dimension
    def demand_callback(from_idx):
        node = manager.IndexToNode(from_idx)
        return puntos[node].demandaTubos

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        [v.capacidadTubos for v in req.vehiculos],
        True,
        "Capacity",
    )

    # Time windows dimension
    time_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.AddDimension(
        time_callback_index,
        30,  # slack max 30 min
        600,  # max time per vehicle: 10h
        False,
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    # Set time windows on stops
    for i, p in enumerate(puntos):
        if p.ventanaDesde is not None or p.ventanaHasta is not None:
            start = p.ventanaDesde or 0
            end = p.ventanaHasta or 600
            time_dimension.CumulVar(manager.NodeToIndex(i)).SetRange(start, end)

    # Set service time for each stop
    for i, p in enumerate(puntos):
        if p.tiempoServicioMin > 0:
            time_dimension.SetSpanUpperBoundForVehicle(
                manager.NodeToIndex(i), p.tiempoServicioMin
            )

    # Solver parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 10

    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        return VrpResponse(rutas=[], distanciaTotal=0, duracionEstimada=0, numVehiculosUsados=0)

    # Build response
    rutas = []
    total_dist = 0.0
    total_dur = 0.0
    vehicles_used = 0

    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        if routing.IsEnd(solution.Value(routing.NextVar(index))):
            continue

        vehicles_used += 1
        paradas_asignadas = []
        dist_vehiculo = 0.0
        dur_vehiculo = 0.0
        last_node = 0
        orden = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node != 0:  # skip origin
                orden += 1
                p = puntos[node]
                arrival = solution.Min(time_dimension.CumulVar(index)) if solution.Min(time_dimension.CumulVar(index)) else None
                departure = solution.Max(time_dimension.CumulVar(index)) if solution.Max(time_dimension.CumulVar(index)) else None

                paradas_asignadas.append(ParadaAsignada(
                    id=p.id,
                    orden=orden,
                    lat=p.lat,
                    lng=p.lng,
                    demandaTubos=p.demandaTubos,
                    horaPrevistaLlegada=arrival,
                    horaPrevistaSalida=departure,
                    distanciaDesdeAnterior=round(matrix[last_node][node], 2),
                ))

            last_node = node
            prev_index = index
            index = solution.Value(routing.NextVar(index))
            if not routing.IsEnd(index):
                dist_vehiculo += matrix[last_node][manager.IndexToNode(index)]

        # Add return to origin distance
        dist_vehiculo += matrix[last_node][0]
        dur_vehiculo = dist_vehiculo / 0.7  # ~70 km/h average
        total_dist += dist_vehiculo
        total_dur += dur_vehiculo

        rutas.append(RutaOptimizada(
            vehiculoId=req.vehiculos[vehicle_id].id,
            paradas=paradas_asignadas,
            distanciaKm=round(dist_vehiculo, 2),
            duracionMin=round(dur_vehiculo, 1),
        ))

    return VrpResponse(
        rutas=rutas,
        distanciaTotal=round(total_dist, 2),
        duracionEstimada=round(total_dur, 1),
        numVehiculosUsados=vehicles_used,
    )
