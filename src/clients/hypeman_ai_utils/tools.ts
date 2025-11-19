import userAnalysisTool from "./tools/userAnalysisTool.js";
import topPostsAnalysisTool from "./tools/topPostsAnalysisTool.js";
import repliesAnalysisTool from "./tools/repliesAnalysisTool.js";
import existingQuoteCastAnalysisTool from "./tools/existingQuoteCastAnalysisTool.js";
import promotionAnalysisTool from "./tools/promotionAnalysisTool.js";
import timelineAnalysisTool from "./tools/timelineAnalysisTool.js";
import searchWebTool from "./tools/searchWebTool.js";

export const createHypemanAITools = () => {
  return {
    userAnalysis: userAnalysisTool,
    topPostsAnalysis: topPostsAnalysisTool,
    repliesAnalysis: repliesAnalysisTool,
    existingQuoteCastsAnalysis: existingQuoteCastAnalysisTool,
    promotionAnalysis: promotionAnalysisTool,
    timelineAnalysis: timelineAnalysisTool,
    searchWeb: searchWebTool,
  };
};
