import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API, timeout: 30000 });

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
  registry: (wardId) =>
    client.get(`/registry?ward_id=${wardId}`).then((r) => r.data),
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
