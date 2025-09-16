import { Routes, Route } from "react-router-dom";
import Landing from "./webpages/Landing";
import CreatorsPage from "./webpages/Creators";
import CreatorSettingsPage from "./webpages/CreatorSettings";
import BuyersPage from "./webpages/BuyPromotion";
import PromotionsPage from "./webpages/Promotions";

function App() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-950">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/creators" element={<CreatorsPage />} />
        <Route path="/creators/settings" element={<CreatorSettingsPage />} />
        <Route path="/buyers" element={<BuyersPage />} />
        <Route path="/promotions" element={<PromotionsPage />} />
      </Routes>
    </div>
  );
}

export default App;
