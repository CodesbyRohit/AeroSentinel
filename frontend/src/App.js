import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "@/pages/Landing";
import CommandCenter from "@/pages/CommandCenter";
import Citizen from "@/pages/Citizen";
import Inspector from "@/pages/Inspector";
import Pitch from "@/pages/Pitch";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/command" element={<CommandCenter />} />
        <Route path="/citizen" element={<Citizen />} />
        <Route path="/inspector" element={<Inspector />} />
        <Route path="/pitch" element={<Pitch />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
