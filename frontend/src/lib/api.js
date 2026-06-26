import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API, timeout: 45000 });

export const api = {
  kpis: () => client.get("/kpis").then((r) => r.data),
  wards: () => client.get("/wards").then((r) => r.data),
  forecast: (wardId, horizon = 72) =>
    client.get(`/forecast/${wardId}?horizon=${horizon}`).then((r) => r.data),
  hotspots: () => client.get("/hotspots").then((r) => r.data),
  enforcement: () => client.get("/enforcement").then((r) => r.data),
  acknowledge: (recId) =>
    client.post(`/enforcement/${recId}/acknowledge`).then((r) => r.data),
  advisory: (wardId) => client.get(`/advisory/${wardId}`).then((r) => r.data),
  alerts: () => client.get("/alerts").then((r) => r.data),
  registry: (wardId) => {
    const qs = wardId ? `?ward_id=${wardId}` : "";
    return client.get(`/registry${qs}`).then((r) => r.data);
  },
  // v2
  impact: () => client.get("/impact").then((r) => r.data),
  risks: () => client.get("/risks").then((r) => r.data),
  riskNarrative: (wardId) =>
    client.get(`/risk-narrative/${wardId}`).then((r) => r.data),
  polluters: (limit = 12, badge = null) =>
    client
      .get(`/polluters?limit=${limit}${badge ? `&badge=${badge}` : ""}`)
      .then((r) => r.data),
  notice: (recId) => client.get(`/notice/${recId}`).then((r) => r.data),
  sensor: (wardId) => client.get(`/sensors/${wardId}`).then((r) => r.data),
  copilot: (question, wardId = null) =>
    client.post("/copilot/chat", { question, ward_id: wardId }).then((r) => r.data),
  submitComplaint: (payload) => client.post("/complaints", payload).then((r) => r.data),
  listComplaints: () => client.get("/complaints").then((r) => r.data),
  recommendedActions: (wardId) =>
    client.get(`/recommended-actions/${wardId}`).then((r) => r.data),
  // v3 — geospatial, satellite, simulator, execute-plan, agents
  sourceAttribution: (wardId) =>
    client.get(`/source-attribution/${wardId}`).then((r) => r.data),
  satelliteFires: (minConf = 60) =>
    client.get(`/satellite/fires?min_confidence=${minConf}`).then((r) => r.data),
  interventionsCatalog: () =>
    client.get("/interventions/catalog").then((r) => r.data),
  simulateIntervention: (wardId, interventions) =>
    client.post("/simulate-intervention", { ward_id: wardId, interventions }).then((r) => r.data),
  executePlan: (wardId, interventions, officer = "AeroSentinel Auto-Plan") =>
    client.post("/execute-plan", { ward_id: wardId, interventions, officer }).then((r) => r.data),
  agents: () => client.get("/agents").then((r) => r.data),
};

export const bandColor = (band) =>
  ({
    good: "#22C55E",
    moderate: "#EAB308",
    poor: "#F97316",
    unhealthy: "#EF4444",
    severe: "#991B1B",
    hazardous: "#7F1D1D",
  }[band] || "#A1A1AA");

export const bandLabel = (band) =>
  ({
    good: "Good",
    moderate: "Moderate",
    poor: "Poor",
    unhealthy: "Unhealthy",
    severe: "Severe",
    hazardous: "Hazardous",
  }[band] || band);

export const aqiBand = (aqi) => {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 200) return "poor";
  if (aqi <= 300) return "unhealthy";
  if (aqi <= 400) return "severe";
  return "hazardous";
};
