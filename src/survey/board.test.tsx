import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SurveyLive } from "@/components/survey/SurveyLive";
import { aggregateSurvey } from "./aggregate";
import { surveyCatalog } from "./options";

const models = [{ id: "opus-5-5", label: "Opus" }];

describe("survey board markup", () => {
  it("keeps counts out of the form shown before an answer", () => {
    const html = renderToStaticMarkup(<SurveyLive answered={false} results={null} models={models} />);
    expect(html).not.toContain("명 응답");
    expect(html).toContain("응답 보기");
    expect(html).toContain("응답 보내기");
    expect(html).toContain("survey-unanswered");
  });

  it("renders the bars, and no way back to the form, after an answer", () => {
    const results = aggregateSurvey([], surveyCatalog(models));
    const html = renderToStaticMarkup(<SurveyLive answered results={results} models={models} />);
    expect(html).toContain("명 응답");
    expect(html).not.toContain("응답 보내기");
    expect(html).not.toContain("설문하러 가기");
  });
});
