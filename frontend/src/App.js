import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Pitch from "@/pages/Pitch";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pitch" element={<Pitch />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
