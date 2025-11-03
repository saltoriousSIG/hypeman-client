import { Routes, Route } from "react-router-dom";
import Landing from "./webpages/Landing";
import CreatorsPage from "./webpages/Creators";
import CreatorManagePage from "./webpages/Promotions";
import PromotionDetailPage from "./webpages/PromotionDetail";

function App() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-950">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/promotion/:id" element={<PromotionDetailPage />} />
        <Route path="/creators" element={<CreatorsPage />} />
        <Route path="/manage" element={<CreatorManagePage />} />
      </Routes>
    </div>
  );
}

export default App;
